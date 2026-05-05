// supabase/functions/generate-agreement/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

function errorResponse(message: string, status = 400) {
  console.log(`[ERROR RESPONSE]: ${status} - ${message}`);
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonResponse(data: unknown, status = 200) {
  console.log(`[SUCCESS RESPONSE]: ${status}`, data);
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function callGemini(prompt: string): Promise<string> {
  console.log('[GEMINI]: Starting API call');
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.log('[GEMINI]: No API key found');
    throw new Error("GEMINI_API_KEY not configured");
  }

  const contents = [
    {
      role: "user",
      parts: [{ text: prompt }],
    }
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
    console.error("Gemini API Error:", error);
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();

  if (data.promptFeedback?.blockReason) {
    throw new Error("Response blocked by safety filters. Please try again with different details.");
  }

  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    console.error("Empty Gemini response:", JSON.stringify(data));
    throw new Error("Could not generate agreement. Please try again.");
  }

  console.log('[GEMINI]: Successfully generated agreement text, length:', reply.length);
  return reply.trim();
}

Deno.serve(async (req) => {
  console.log(`[GENERATE-AGREEMENT]: Starting - Method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('[GENERATE-AGREEMENT]: Request body:', requestBody);

    // ✅ Accept application_id instead of rental_id
    const { application_id } = requestBody;

    if (!application_id) {
      return errorResponse('Missing application_id');
    }

    console.log('[GENERATE-AGREEMENT]: Looking for rental with application_id:', application_id);
    const admin = createAdminClient();

    // ✅ Find rental by application_id
    const { data: rental, error: rentalError } = await admin
      .from('rentals')
      .select('*')
      .eq('application_id', application_id)
      .maybeSingle();

    console.log('[GENERATE-AGREEMENT]: Rental query result:', { rental, rentalError });

    if (rentalError) {
      console.error('[GENERATE-AGREEMENT]: Database error:', rentalError);
      return errorResponse(`Database error: ${rentalError.message}`, 500);
    }

    if (!rental) {
      console.log('[GENERATE-AGREEMENT]: No rental found for application_id:', application_id);
      return errorResponse(`No rental found for application ${application_id}. The application may not be accepted yet or payment not completed.`, 404);
    }

    console.log('[GENERATE-AGREEMENT]: Found rental:', {
      rental_id: rental.id,
      status: rental.status,
      amount: rental.amount
    });

    // ✅ Check if agreement already exists for this rental
    console.log('[GENERATE-AGREEMENT]: Checking if agreement already exists...');
    const { data: existingAgreement } = await admin
      .from('tenancy_agreements')
      .select('id, status')
      .eq('rental_id', rental.id)
      .maybeSingle();

    if (existingAgreement) {
      console.log('[GENERATE-AGREEMENT]: Agreement already exists:', existingAgreement);
      return jsonResponse({
        success: true,
        agreement_id: existingAgreement.id,
        message: 'Agreement already exists for this rental'
      });
    }

    console.log('[GENERATE-AGREEMENT]: Fetching related data...');

    const [
      { data: property, error: propertyError },
      { data: owner, error: ownerError },
      { data: renter, error: renterError },
      { data: application, error: applicationError }
    ] = await Promise.all([
      admin.from('properties').select('*').eq('id', rental.property_id).maybeSingle(),
      admin.from('users').select('first_name, last_name, email').eq('id', rental.owner_id).maybeSingle(),
      admin.from('users').select('first_name, last_name, email').eq('id', rental.renter_id).maybeSingle(),
      admin.from('property_applications').select('move_in_date').eq('id', rental.application_id).maybeSingle(),
    ]);

    console.log('[GENERATE-AGREEMENT]: Related data fetched:', {
      property: !!property,
      owner: !!owner,
      renter: !!renter,
      application: !!application
    });

    if (propertyError || ownerError || renterError || applicationError) {
      console.error('[GENERATE-AGREEMENT]: Error fetching related data');
      return errorResponse('Error fetching related data', 500);
    }

    if (!property || !owner || !renter) {
      return errorResponse('Missing required property, owner, or renter data', 400);
    }

    const moveInDate = application?.move_in_date ?? new Date().toISOString().split('T')[0];
    const endDate = new Date(moveInDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const prompt = `
Generate a professional Nigerian tenancy agreement with these exact details.
Return ONLY the agreement text — no preamble, no commentary.

PARTIES:
- Landlord: ${owner.first_name} ${owner.last_name}
- Tenant: ${renter.first_name} ${renter.last_name}

PROPERTY:
- Address: ${property.location}, ${property.lga ?? ''}, ${property.state ?? ''}
- Type: ${property.type}
- Description: ${property.title}

FINANCIAL TERMS:
- Annual Rent: ₦${rental.amount.toLocaleString()}
- Caution/Security Deposit: ₦${(rental.amount * 0.5).toLocaleString()} (to be agreed separately)

DURATION:
- Start Date: ${moveInDate}
- End Date: ${endDate.toISOString().split('T')[0]}
- Notice period: 1 month from either party

Include these sections:
1. Parties and Property Description
2. Rent and Payment Terms (rent is paid yearly in advance)
3. Duration and Renewal
4. Tenant Obligations (maintain property, no subletting, no structural changes, pay utility bills)
5. Landlord Obligations (maintain structure, provide receipts, give proper notice)
6. Caution/Security Deposit terms
7. Termination Conditions
8. Dispute Resolution (parties agree to EdenHome mediation first, then Nigerian courts)
9. General Provisions
10. Signature blocks for both parties

Write in professional legal English appropriate for Nigerian property law.
Keep it clear and fair to both parties.
    `;

    console.log('[GENERATE-AGREEMENT]: Generating agreement with Gemini...');
    const agreementText = await callGemini(prompt);

    console.log('[GENERATE-AGREEMENT]: Inserting agreement into database...');
    const { data: agreement, error: insertError } = await admin
      .from('tenancy_agreements')
      .insert({
        rental_id: rental.id, // ✅ Use the rental.id we found
        property_id: rental.property_id,
        owner_id: rental.owner_id,
        renter_id: rental.renter_id,
        agreement_text: agreementText,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[GENERATE-AGREEMENT]: Insert error:', insertError);
      return errorResponse(insertError.message, 500);
    }

    console.log('[GENERATE-AGREEMENT]: Success! Agreement created with ID:', agreement.id);
    return jsonResponse({ success: true, agreement_id: agreement.id });

  } catch (e: any) {
    console.error('[GENERATE-AGREEMENT]: Unhandled error:', e);
    return errorResponse(e.message || 'Internal server error', 500);
  }
});