import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  type: "chat" | "neighbourhood" | "explain_clause" | "price_analysis" | "application_letter" | "generate_agreement";
  messages?: ChatMessage[];
  state?: string;
  lga?: string;
  clause?: string;
  property_id?: string;
  rental_id?: string;
  occupation?: string;
  move_reason?: string;
  family_size?: string;
  property_title?: string;
  property_location?: string;
}

const SYSTEM_PROMPT = `You are EdenHome AI, a helpful rental assistant for Nigeria. You help users with:
- Rental prices in Nigerian cities (Lagos, Abuja, Port Harcourt, etc.)
- Neighborhood safety and amenities
- Tenant rights and responsibilities in Nigeria
- Understanding rental terms (caution fee, agency fee, service charge)
- What to look for when viewing properties
- Red flags to avoid when renting

Keep responses concise, friendly, and practical. Always use Nigerian context and currency (₦).
If you don't know something specific, be honest and suggest they verify with local sources.`;

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createUserClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
}

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

async function enforceRateLimit(service: any, userId: string) {
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 25;
  const now = new Date();
  const bucket = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();

  const { data: row } = await service
    .from("ai_rate_limits")
    .select("*")
    .eq("user_id", userId)
    .eq("window_start", bucket)
    .maybeSingle();

  if (!row) {
    await service.from("ai_rate_limits").insert({ user_id: userId, window_start: bucket, request_count: 1 });
    return;
  }

  if (row.request_count >= maxRequests) {
    throw new Error("Rate limit exceeded. Try again in 10 minutes.");
  }

  await service.from("ai_rate_limits").update({ request_count: row.request_count + 1 }).eq("user_id", userId).eq("window_start", bucket);
}

async function getCache(service: any, key: string) {
  const { data } = await service.from("ai_cache").select("payload").eq("cache_key", key).gt("expires_at", new Date().toISOString()).maybeSingle();
  return data?.payload;
}

async function setCache(service: any, key: string, type: string, payload: any, ttlDays = 7) {
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
  await service.from("ai_cache").upsert({ cache_key: key, type, payload, expires_at: expiresAt });
}

async function callGemini(messages: ChatMessage[]): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  // Format messages for Gemini API
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return reply?.trim() ?? "";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userClient = createUserClient(req);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const service = createServiceClient();
    await enforceRateLimit(service, user.id);

    const body: RequestBody = await req.json();
    const { type, messages, state, lga, clause, rental_id } = body;

    // ── Neighbourhood Insights ──────────────────────────────────────────────
    if (type === "neighbourhood" && state && lga) {
      const cacheKey = `nbh:${state}:${lga}`.toLowerCase();
      const cached = await getCache(service, cacheKey);
      if (cached) return jsonResponse(cached);

      const prompt = `Give me a detailed overview of ${lga}, ${state} Nigeria for renting. Include:
- Average rental prices for 1-3 bedroom apartments
- Safety and security situation
- Available amenities (schools, hospitals, markets)
- Transportation and accessibility
- Pros and cons for tenants
- Any specific things to watch out for

Keep it practical and up-to-date.`;

      const reply = await callGemini([{ role: "user", content: prompt }]);
      const result = { reply };
      await setCache(service, cacheKey, type, result);
      return jsonResponse(result);
    }

    // ── Explain Clause ──────────────────────────────────────────────────────
    if (type === "explain_clause" && clause) {
      const prompt = `Explain this rental clause in simple terms for a Nigerian tenant:

"${clause}"

Break down:
1. What it means in plain English
2. Your rights and obligations
3. Any red flags or things to negotiate
4. Typical practice in Nigeria

Keep it clear and actionable.`;

      const reply = await callGemini([{ role: "user", content: prompt }]);
      return jsonResponse({ explanation: reply });
    }

    // ── Application Letter ──────────────────────────────────────────────────
    if (type === "application_letter") {
      const { occupation, move_reason, family_size, property_title, property_location } = body;

      if (!occupation || !property_title) {
        return errorResponse("Missing required fields: occupation and property_title");
      }

      const prompt = `Write a professional rental application message for a Nigerian tenant applying for this property.

Property: ${property_title}
Location: ${property_location}
Applicant's Occupation: ${occupation}
${move_reason ? `Reason for Moving: ${move_reason}` : ''}
${family_size ? `Household Size: ${family_size}` : ''}

Requirements:
- Write in first person
- Professional but warm and friendly tone
- 150-200 words only
- Introduce yourself briefly
- Mention occupation and reliability
- Express genuine interest in the property
- Show you're a responsible tenant
- Use Nigerian context naturally
- NO placeholders like [Your Name] or [Date]
- Do NOT include a subject line or greeting like "Dear Landlord"
- Start directly with the introduction

Write the message now:`;

      const letter = await callGemini([{ role: "user", content: prompt }]);
      return jsonResponse({ letter: letter.trim() });
    }

    // ── Generate Agreement ──────────────────────────────────────────────────
    if (type === "generate_agreement") {
      if (!rental_id) return errorResponse("Missing rental_id");

      // Fetch rental, property, and parties info
      const { data: rental, error: rError } = await service
        .from('rental_applications')
        .select(`
          *,
          property:properties!property_id (*),
          renter:profiles!renter_id (first_name, last_name, email),
          owner:profiles!owner_id (first_name, last_name, email)
        `)
        .eq('id', rental_id)
        .single();

      if (rError || !rental) {
        console.error('Rental Fetch Error:', rError);
        return errorResponse("Could not find rental details to generate agreement.");
      }

      const prompt = `Generate a formal and legally binding Tenancy Agreement for a property in Nigeria.
      
PROPERTY DETAILS:
- Title: ${rental.property.title}
- Location: ${rental.property.location}
- Type: ${rental.property.type}
- Rent: ₦${rental.property.price.toLocaleString()} per year

PARTIES:
- Landlord (Owner): ${rental.owner.first_name} ${rental.owner.last_name}
- Tenant (Renter): ${rental.renter.first_name} ${rental.renter.last_name}

TENANCY TERMS:
- Commencement Date: ${new Date(rental.move_in_date).toLocaleDateString()}
- Term: One (1) Year
- Rent Amount: ₦${rental.property.price.toLocaleString()}

SECTIONS TO INCLUDE:
1. Parties & Property Description
2. Rent & Payments (including Caution Fee if applicable)
3. Tenant's Covenants (Maintenance, Noise, No Subletting)
4. Landlord's Covenants (Quiet Enjoyment, Major Repairs)
5. Termination Clause
6. Signatures Section

INSTRUCTIONS:
- Use professional Nigerian legal terminology.
- Be clear and comprehensive.
- Ensure all provided names and details are integrated.
- Return the full agreement text in Markdown format.
- DO NOT use placeholders like [Your Name].`;

      const agreementText = await callGemini([{ role: "user", content: prompt }]);

      // Save to tenancy_agreements
      const { data: agreement, error: aError } = await service
        .from('tenancy_agreements')
        .upsert({
          rental_id,
          property_id: rental.property_id,
          owner_id: rental.owner_id,
          renter_id: rental.renter_id,
          agreement_text: agreementText,
          status: 'pending'
        })
        .select()
        .single();

      if (aError) {
        console.error('Agreement Save Error:', aError);
        return errorResponse("Agreement generated but could not be saved to the database.");
      }

      return jsonResponse({ agreement });
    }

    // ── Generic Chat ────────────────────────────────────────────────────────
    if (type === "chat" && messages) {
      const reply = await callGemini(messages.slice(-10));
      return jsonResponse({ reply });
    }

    return errorResponse("Invalid request type");
  } catch (e) {
    console.error("Edge Function Error:", e);
    return errorResponse(e.message || "Internal server error", 500);
  }
});
