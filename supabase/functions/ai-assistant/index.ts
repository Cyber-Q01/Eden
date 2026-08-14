// supabase/functions/ai-assistant/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  type: "chat" | "neighbourhood" | "explain_clause" | "price_analysis" | "application_letter";
  messages?: ChatMessage[];
  state?: string;
  lga?: string;
  clause?: string;
  property_id?: string;
  name?: string;
  occupation?: string;
  move_reason?: string;
  family_size?: string;
  property_title?: string;
  property_location?: string;
}

const SYSTEM_PROMPT = `You are EdenHome AI, the official assistant for the EdenHome mobile app and an expert in the Nigerian rental market.

EDENHOME APP KNOWLEDGE:
- Purpose: Helping Nigerians find and secure quality rental properties with ease.
- Service Wallet & Units: Users fund their "Service Wallet" via Paystack. 1 Service Unit costs ₦666 (includes 7.5% VAT).
- Property Unlocks: Users spend 1 Service Unit to "unlock" the full address and landlord contact info of a property.
- Verified Renters: Tenants can become "Verified Renters" to increase their chances of approval.
- Applications: Formal rental applications are submitted directly through the app.

AI HELP TOPICS:
- Rental prices in Nigerian cities (Lagos, Abuja, Port Harcourt, etc.)
- Neighborhood safety, traffic, and amenities (Insights)
- Tenant rights, rental laws, and clause explanations
- Drafting professional application letters for landlords
- Understanding terms like caution fee, agency fee, and service charge

GUIDELINES:
- Use Nigerian context naturally (Self-con, Mini-flat, Mainland/Island, etc.).
- Always use Naira (₦) for currency.
- Be professional, warm, and concise.
- If you don't know a property's specific details, suggest the user "unlock" it to contact the owner.`;

// ✅ Model fallback configuration
const MODELS = [
  {
    name: "Gemini 3.1 Flash",
    endpoint: "gemini-3.1-flash",
    description: "Primary model - high performance"
  },
  {
    name: "Gemini 2.5 Flash",
    endpoint: "gemini-2.5-flash",
    description: "Secondary model - reliable backup"
  },
  {
    name: "Gemini 2.5 Flash-Lite",
    endpoint: "gemini-2.5-flash-lite",
    description: "Tertiary model - budget-friendly"
  }
];

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

// ✅ Enhanced function with fallback models
async function callGeminiWithFallback(messages: ChatMessage[]): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const messagesWithSystem = [
    { role: "user" as const, content: SYSTEM_PROMPT },
    { role: "model" as const, content: "Understood. I'm ready to help with Nigerian rental questions." },
    ...messages,
  ];

  const contents = messagesWithSystem.map((msg) => ({
    role: msg.role === "assistant" ? "model" : msg.role === "model" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // ✅ Try each model in sequence until one works
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];

    try {
      console.log(`[AI-ASSISTANT]: Attempting ${model.name} (${model.description})`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.endpoint}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: contents,
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        console.error(`[AI-ASSISTANT]: ${model.name} failed:`, error);

        // ✅ If this isn't the last model, continue to next fallback
        if (i < MODELS.length - 1) {
          console.log(`[AI-ASSISTANT]: Falling back to ${MODELS[i + 1].name}...`);
          continue;
        }

        // ✅ If this is the last model, throw the error
        throw new Error(`All models failed. Last error: ${error}`);
      }

      const data = await response.json();

      // ✅ Handle safety filters
      if (data.promptFeedback?.blockReason) {
        console.warn(`[AI-ASSISTANT]: ${model.name} blocked by safety filters`);

        if (i < MODELS.length - 1) {
          console.log(`[AI-ASSISTANT]: Trying ${MODELS[i + 1].name} for safety bypass...`);
          continue;
        }

        return "Response blocked by safety filters. Please rephrase your question.";
      }

      // ✅ Extract response text
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!reply) {
        console.error(`[AI-ASSISTANT]: Empty response from ${model.name}:`, JSON.stringify(data));

        if (i < MODELS.length - 1) {
          console.log(`[AI-ASSISTANT]: Empty response, trying ${MODELS[i + 1].name}...`);
          continue;
        }

        return "I couldn't generate a response. Please try again.";
      }

      // ✅ Success! Log which model worked
      console.log(`[AI-ASSISTANT]: Success with ${model.name}`);
      return reply.trim();

    } catch (error) {
      console.error(`[AI-ASSISTANT]: ${model.name} error:`, error);

      // ✅ If this isn't the last model, continue to next fallback
      if (i < MODELS.length - 1) {
        console.log(`[AI-ASSISTANT]: ${model.name} failed, trying ${MODELS[i + 1].name}...`);
        continue;
      }

      // ✅ If this is the last model, throw the error
      throw new Error(`All AI models failed. Please try again later.`);
    }
  }

  // ✅ This should never be reached, but just in case
  throw new Error("All AI models failed unexpectedly.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const userClient = createUserClient(req);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const service = createServiceClient();
    await enforceRateLimit(service, user.id);

    const body: RequestBody = await req.json();
    const { type, messages, state, lga, clause } = body;

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

      // ✅ Use the new fallback function
      const reply = await callGeminiWithFallback([{ role: "user", content: prompt }]);
      const result = { reply };
      await setCache(service, cacheKey, type, result);
      return jsonResponse(result);
    }

    if (type === "explain_clause" && clause) {
      const prompt = `Explain this rental clause in simple terms for a Nigerian tenant:

"${clause}"

Break down:
1. What it means in plain English
2. Your rights and obligations
3. Any red flags or things to negotiate
4. Typical practice in Nigeria

Keep it clear and actionable.`;

      // ✅ Use the new fallback function
      const reply = await callGeminiWithFallback([{ role: "user", content: prompt }]);
      return jsonResponse({ reply });
    }

    if (type === "application_letter") {
      const { name, occupation, move_reason, family_size, property_title, property_location } = body;

      if (!occupation || !property_title) {
        return errorResponse("Missing required fields: occupation and property_title");
      }

      const prompt = `Write a professional rental application message for a Nigerian tenant applying for this property.

Property: ${property_title}
Location: ${property_location}
Applicant's Name: ${name || 'Akin Oladele'}
Applicant's Occupation: ${occupation}
${move_reason ? `Reason for Moving: ${move_reason}` : ''}
${family_size ? `Household Size: ${family_size}` : ''}

Requirements:
- Write in first person
- Professional but warm and friendly tone
- strictly 150-200 words only
- Introduce yourself briefly (e.g., "My name is ${name || 'Akin Oladele'}, and I am...")
- Mention occupation and reliability
- Express genuine interest in the property
- Show you're a responsible tenant
- Use Nigerian context naturally
- Use the applicant's name (${name || 'Akin Oladele'}) to naturally sign off the letter at the end (e.g., "Best regards,\n${name || 'Akin Oladele'}")
- NO placeholders like [Your Name] or [Date]
- Do NOT include a subject line or greeting like "Dear Landlord"
- Start directly with the introduction

Write the message now:`;

      // ✅ Use the new fallback function
      const letter = await callGeminiWithFallback([{ role: "user", content: prompt }]);
      return jsonResponse({ letter: letter.trim() });
    }

    if (type === "chat" && messages) {
      // ✅ Use the new fallback function
      const reply = await callGeminiWithFallback(messages.slice(-10));
      return jsonResponse({ reply });
    }

    return errorResponse("Invalid request type");
  } catch (e) {
    console.error("Edge Function Error:", e);
    return errorResponse(e.message || "Internal server error", 500);
  }
});