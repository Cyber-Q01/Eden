import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';

// Fixed pack: 3 real-world property inspections, one-time naira purchase
const PACK_SIZE = 3;
const PRICE_PER_INSPECTION = 666;
const VAT_RATE = 0.075;
const SUBTOTAL = PACK_SIZE * PRICE_PER_INSPECTION; // 1998
const TOTAL = Math.round(SUBTOTAL + SUBTOTAL * VAT_RATE); // 2148

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        passes: PACK_SIZE,
        price_per_inspection: PRICE_PER_INSPECTION,
        subtotal: SUBTOTAL,
        vat: Math.round(SUBTOTAL * VAT_RATE * 100) / 100,
        total: TOTAL,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // Get user email for Paystack
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.email) {
      return new Response(JSON.stringify({ error: 'Could not retrieve user email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Initialize Paystack transaction (fixed pack — no client-supplied amount)
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: TOTAL * 100, // Paystack uses kobo
        email: userData.email,
        callback_url: 'edenhome://pack/verify',
        metadata: {
          user_id: user.id,
          passes: PACK_SIZE,
          naira_amount: TOTAL,
          type: 'inspection_pack',
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return new Response(JSON.stringify({ error: paystackData.message || 'Paystack initialization failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
      total: TOTAL,
      passes: PACK_SIZE,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
