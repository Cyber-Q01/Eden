// eden-mobile-app/supabase/functions/verify-nin/index.ts
//
// v2 — added rate limiting so users cannot exhaust the paid Billscribe quota:
//   1. Already-verified users never hit the paid API (early 200).
//   2. Per user: max MAX_ATTEMPTS_PER_USER_DAY attempts in a rolling 24h (success or fail).
//   3. Per user: NIN_COOLDOWN_MS between attempts (stops double-tap / retry spam).
//   4. Per NIN: after MAX_FAILED_PER_NIN_DAY failures in 24h (from ANY user), that NIN is
//      locked for the rest of the window (stops account-farming / NIN probing).
// All limits are checked BEFORE the Billscribe call. Every attempt that reaches
// Billscribe is recorded in public.nin_verification_attempts (nin_hash only, never the
// raw NIN — same zero-plaintext policy as users.nin_hash).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const BILLSCRIBE_API_URL = "https://billscribe.ng/api/trans/ex/verify_nin_api.php";

// ── Rate limits (tune here if your Billscribe quota changes) ───────────────
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h rolling window
const MAX_ATTEMPTS_PER_USER_DAY = 3;           // hard cap per user per 24h
const NIN_COOLDOWN_MS = 2 * 60 * 1000;         // min gap between attempts per user
const MAX_FAILED_PER_NIN_DAY = 5;              // failures for one NIN (any user) → lock it

function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

// Compute deterministic HMAC-SHA256 hash for multi-account prevention (Zero-Plaintext NIN storage)
async function computeHmacSha256(text: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(text.trim()));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Clean and normalize name string
function cleanName(str?: string | null): string {
  if (!str) return "";
  return str.trim().toLowerCase().replace(/[^a-z]/g, "");
}

// Month name → number map for Billscribe's "DD MMM YYYY" format (e.g. "22 JUN 2002")
const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

// Normalize various date formats into ISO YYYY-MM-DD
// Handles: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, "DD MMM YYYY" (Billscribe format)
function normalizeDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const cleaned = dateStr.trim();

  // 1. Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // 2. Billscribe format: "DD MMM YYYY" e.g. "22 JUN 2002"
  const billscribeParts = cleaned.split(/\s+/);
  if (billscribeParts.length === 3) {
    const monthNum = MONTH_MAP[billscribeParts[1].toLowerCase()];
    if (monthNum && billscribeParts[2].length === 4) {
      return `${billscribeParts[2]}-${monthNum}-${billscribeParts[0].padStart(2, "0")}`;
    }
  }

  // 3. DD-MM-YYYY or DD/MM/YYYY or YYYY/MM/DD
  const parts = cleaned.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY/MM/DD
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
    if (parts[2].length === 4) {
      // DD-MM-YYYY
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  try {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  } catch { }

  return cleaned;
}

// Flexible Order-Agnostic Name Matching Algorithm
function verifyIdentityMatch(
  userInput: { firstName: string; lastName: string; dob: string },
  nimcData: { firstname?: string; surname?: string; middlename?: string; birthdate?: string }
): { isMatch: boolean; reason?: string } {
  const userFirst = cleanName(userInput.firstName);
  const userLast = cleanName(userInput.lastName);

  if (!userFirst || !userLast) {
    return {
      isMatch: false,
      reason: "Missing Name: Please provide both First Name and Last Name.",
    };
  }

  // Extract all NIMC official name tokens
  const nimcFirst = cleanName(nimcData.firstname);
  const nimcSurname = cleanName(nimcData.surname);
  const nimcMiddle = cleanName(nimcData.middlename);
  const nimcTokens = [nimcFirst, nimcSurname, nimcMiddle].filter(Boolean);

  if (nimcTokens.length === 0) {
    return {
      isMatch: false,
      reason: "Official NIMC record did not return legal name fields.",
    };
  }

  // Check if user First Name matches any official token
  const firstMatchIdx = nimcTokens.findIndex((token) => token === userFirst);
  // Check if user Last Name matches any OTHER official token
  const lastMatchIdx = nimcTokens.findIndex((token, idx) => token === userLast && idx !== firstMatchIdx);

  const isNameMatch = firstMatchIdx !== -1 && lastMatchIdx !== -1;

  if (!isNameMatch) {
    return {
      isMatch: false,
      reason: `Name Mismatch: The First Name ('${userInput.firstName}') or Last Name ('${userInput.lastName}') you entered does not match your official NIMC record. Please check your spelling and ensure your names match your National ID card exactly.`,
    };
  }

  // DOB Comparison
  if (userInput.dob && nimcData.birthdate) {
    const userDobNorm = normalizeDate(userInput.dob);
    const nimcDobNorm = normalizeDate(nimcData.birthdate);

    if (userDobNorm && nimcDobNorm && userDobNorm !== nimcDobNorm) {
      return {
        isMatch: false,
        reason: `Date of Birth Mismatch: The Date of Birth you entered (${userInput.dob}) does not match the registered Date of Birth on your National ID record.`,
      };
    }
  }

  return { isMatch: true };
}

// Record an attempt that reached the paid API. Bookkeeping must never break verification.
async function recordAttempt(admin: any, userId: string, ninHash: string, success: boolean) {
  try {
    await admin
      .from("nin_verification_attempts")
      .insert({ user_id: userId, nin_hash: ninHash, success });
  } catch (e: any) {
    console.warn("[verify-nin] Failed to record attempt:", e.message);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const admin = createAdminClient();
    const { data: { user }, error: authErr } = await admin.auth.getUser(token);

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { nin, first_name, last_name, dob, method } = body;

    console.log("[verify-nin] ─── INCOMING REQUEST ───────────────────────────────");
    console.log("[verify-nin] User ID     :", user.id);
    console.log("[verify-nin] first_name  :", JSON.stringify(first_name));
    console.log("[verify-nin] last_name   :", JSON.stringify(last_name));
    console.log("[verify-nin] dob         :", JSON.stringify(dob));
    console.log("[verify-nin] nin length  :", nin?.trim().length);
    console.log("[verify-nin] method      :", method);
    console.log("[verify-nin] Auth metadata first_name  :", JSON.stringify(user.user_metadata?.first_name));
    console.log("[verify-nin] Auth metadata last_name   :", JSON.stringify(user.user_metadata?.last_name));
    console.log("[verify-nin] Auth metadata dob         :", JSON.stringify(user.user_metadata?.dob));
    console.log("[verify-nin] ──────────────────────────────────────────────────────");

    if (!nin || !nin.trim()) {
      return new Response(JSON.stringify({ error: "National Identification Number (NIN) is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanNin = nin.trim();
    if (cleanNin.length !== 11 && method !== "phone") {
      return new Response(JSON.stringify({ error: "NIN must be exactly 11 digits." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. ANTI-SYBIL / MULTI-ACCOUNT CHECK (1 ACCOUNT PER NIN) ─────────
    const hashSecret = Deno.env.get("NIN_HASH_SECRET") || "eden_nin_protection_salt_2026";
    const ninHash = await computeHmacSha256(cleanNin, hashSecret);

    const { data: existingUser } = await admin
      .from("users")
      .select("id, email")
      .eq("nin_hash", ninHash)
      .neq("id", user.id)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({
          error: "Duplicate Identity: This National Identification Number (NIN) has already been linked and verified on another Eden account. Each user may only operate one verified account.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 1a. ALREADY VERIFIED ON THIS ACCOUNT? Skip the paid API entirely ─
    const { data: selfRow } = await admin
      .from("users")
      .select("is_verified, is_nin_verified")
      .eq("id", user.id)
      .maybeSingle();

    if (selfRow?.is_verified || selfRow?.is_nin_verified) {
      return new Response(
        JSON.stringify({
          success: true,
          already_verified: true,
          message: "Your NIN is already verified on this account.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 1b. RATE LIMITS — all checked BEFORE any Billscribe call ─────────
    const nowMs = Date.now();
    const windowStart = new Date(nowMs - ROLLING_WINDOW_MS).toISOString();

    // (a) per-user rolling 24h cap (success or fail)
    const { count: attemptsInWindow } = await admin
      .from("nin_verification_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", windowStart);

    if ((attemptsInWindow ?? 0) >= MAX_ATTEMPTS_PER_USER_DAY) {
      return new Response(
        JSON.stringify({
          error: `You have used all ${MAX_ATTEMPTS_PER_USER_DAY} NIN verification attempts for today. Please try again tomorrow.`,
          code: "RATE_LIMITED",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // (b) per-user cooldown between attempts (stops double-tap / retry spam)
    const { data: lastAttempt } = await admin
      .from("nin_verification_attempts")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAttempt) {
      const elapsed = nowMs - new Date(lastAttempt.created_at).getTime();
      if (elapsed < NIN_COOLDOWN_MS) {
        const waitSec = Math.ceil((NIN_COOLDOWN_MS - elapsed) / 1000);
        return new Response(
          JSON.stringify({
            error: `Please wait ${waitSec} seconds before your next NIN verification attempt.`,
            code: "COOLDOWN",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // (c) per-NIN failure lockout (any user) — stops NIN probing via fresh accounts
    const { count: ninFailuresInWindow } = await admin
      .from("nin_verification_attempts")
      .select("id", { count: "exact", head: true })
      .eq("nin_hash", ninHash)
      .eq("success", false)
      .gte("created_at", windowStart);

    if ((ninFailuresInWindow ?? 0) >= MAX_FAILED_PER_NIN_DAY) {
      return new Response(
        JSON.stringify({
          error: "This NIN has too many failed attempts and is temporarily locked. Please try again tomorrow.",
          code: "NIN_LOCKED",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 2. CALL BILLSCRIBE NIN VERIFICATION API (paid — reached only after all limits) ──
    const billscribeApiKey = Deno.env.get("BILLSCRIBE_API_KEY");
    if (!billscribeApiKey) {
      console.error("❌ BILLSCRIBE_API_KEY is not configured in Supabase Secrets");
      return new Response(
        JSON.stringify({
          error: "Server configuration error: BILLSCRIBE_API_KEY is not configured in Supabase Secrets. Please add your Billscribe API key.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Billscribe] Calling real NIN verification API for user ${user.id}...`);
    const apiRes = await fetch(BILLSCRIBE_API_URL, {
      method: "POST",
      headers: {
        Authorization: billscribeApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nin: cleanNin,
        type: "Information",
        method: method === "phone" ? "phone" : "nin",
      }),
    });

    const json = await apiRes.json();
    console.log("[Billscribe Response Status]:", json.status_code, json.status_desc, json.data);

    console.log("[verify-nin] ─── BILLSCRIBE RAW RESPONSE ────────────────────────");
    console.log("[verify-nin] HTTP status :", apiRes.status);
    console.log("[verify-nin] status_code :", json.status_code, "| status_desc:", json.status_desc);
    console.log("[verify-nin] data        :", JSON.stringify(json.data));
    console.log("[verify-nin] ──────────────────────────────────────────────────────");

    // Billscribe returns status_code as a number (200) not a string ("200")
    // so we coerce to string before comparing to handle both cases safely
    if (String(json.status_code) !== "200" || !json.data) {
      await recordAttempt(admin, user.id, ninHash, false);
      return new Response(
        JSON.stringify({
          error: json.status_desc || "No official NIMC record found for the provided NIN. Please check your 11-digit number.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const nimcRecord = json.data;

    // ── 3. RUN ORDER-AGNOSTIC NAME & DOB MATCHING ──────────────────────
    // Use nullish coalescing (??) not || so that an empty-string body param does NOT
    // silently fall back to stale auth metadata (empty string is falsy in JS).
    const userFirstName = (first_name != null ? first_name : (user.user_metadata?.first_name ?? user.user_metadata?.firstName ?? "")).trim();
    const userLastName  = (last_name  != null ? last_name  : (user.user_metadata?.last_name  ?? user.user_metadata?.lastName  ?? "")).trim();
    const userDob       = (dob        != null ? dob        : (user.user_metadata?.dob        ?? "")).trim();

    console.log("[verify-nin] ─── RESOLVED IDENTITY FOR MATCHING ─────────────────");
    console.log("[verify-nin] Resolved firstName :", JSON.stringify(userFirstName));
    console.log("[verify-nin] Resolved lastName  :", JSON.stringify(userLastName));
    console.log("[verify-nin] Resolved dob       :", JSON.stringify(userDob));
    console.log("[verify-nin] Source: body first_name was", first_name != null ? "provided" : "null/undefined → used metadata");
    console.log("[verify-nin] Source: body last_name  was", last_name != null ? "provided" : "null/undefined → used metadata");
    console.log("[verify-nin] Source: body dob         was", dob       != null ? "provided" : "null/undefined → used metadata");

    console.log("[verify-nin] ─── NIMC RECORD FIELDS ─────────────────────────────");
    const nimcRec = json.data;
    console.log("[verify-nin] NIMC firstname   :", JSON.stringify(nimcRec.firstname));
    console.log("[verify-nin] NIMC surname     :", JSON.stringify(nimcRec.surname));
    console.log("[verify-nin] NIMC middlename  :", JSON.stringify(nimcRec.middlename));
    console.log("[verify-nin] NIMC birthdate   :", JSON.stringify(nimcRec.birthdate));
    console.log("[verify-nin] NIMC birthdate normalised :", normalizeDate(nimcRec.birthdate));
    console.log("[verify-nin] User DOB normalised       :", normalizeDate(userDob));
    console.log("[verify-nin] ──────────────────────────────────────────────────────");

    const matchResult = verifyIdentityMatch(
      { firstName: userFirstName, lastName: userLastName, dob: userDob },
      nimcRec
    );

    console.log("[verify-nin] ─── MATCH RESULT ────────────────────────────────────");
    console.log("[verify-nin] isMatch :", matchResult.isMatch);
    console.log("[verify-nin] reason  :", matchResult.reason ?? "n/a");
    console.log("[verify-nin] ──────────────────────────────────────────────────────");

    if (!matchResult.isMatch) {
      await recordAttempt(admin, user.id, ninHash, false);
      return new Response(
        JSON.stringify({
          error: matchResult.reason,
          code: "IDENTITY_MISMATCH",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 4. MATCH CONFIRMED: UPDATE USER TO VERIFIED IN DATABASE ────────
    const userUpsertPayload: any = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || "TENANT",
      is_verified: true,
      is_verified_renter: true,
      is_nin_verified: true,
      nin_hash: ninHash,
      nin_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (userFirstName.trim()) userUpsertPayload.first_name = userFirstName.trim();
    if (userLastName.trim()) userUpsertPayload.last_name = userLastName.trim();

    const { error: userUpdateErr } = await admin
      .from("users")
      .upsert(userUpsertPayload, { onConflict: "id" });

    if (userUpdateErr) {
      console.warn("User verified upsert notice, trying update fallback:", userUpdateErr.message);
      await admin.from("users").update(userUpsertPayload).eq("id", user.id);
    }

    // Sync to auth.users metadata
    try {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          firstName: userFirstName.trim(),
          lastName: userLastName.trim(),
          first_name: userFirstName.trim(),
          last_name: userLastName.trim(),
          is_verified: true,
          is_nin_verified: true,
        },
      });
    } catch (metaErr: any) {
      console.warn("auth.admin.updateUserById notice:", metaErr.message);
    }

    await admin.from("user_biodata").upsert(
      {
        id: user.id,
        id_type: "NIN",
        kyc_status: "verified",
        dob: userDob || undefined,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    await recordAttempt(admin, user.id, ninHash, true);

    return new Response(
      JSON.stringify({
        success: true,
        message: "NIN Identity Verified Successfully!",
        data: {
          is_verified: true,
          firstName: userFirstName.trim(),
          lastName: userLastName.trim(),
          first_name: userFirstName.trim(),
          last_name: userLastName.trim(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[verify-nin] Unhandled error:", err.message);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
