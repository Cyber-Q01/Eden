import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';

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

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    const { reference } = await req.json();

    if (!reference) {
      return new Response(JSON.stringify({ error: 'Missing reference' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Verify with Paystack
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data?.status !== 'success') {
      return new Response(JSON.stringify({ error: 'Payment verification failed. Please try again.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Extract metadata
    const metadata = paystackData.data.metadata;
    const unlocks = metadata?.unlocks;
    const nairaAmount = metadata?.naira_amount;

    if (!unlocks || metadata?.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Invalid payment metadata' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check for duplicate verification
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: existingTx } = await adminClient
      .from('credit_transactions')
      .select('id')
      .eq('paystack_reference', reference)
      .single();

    if (existingTx) {
      // Already processed — return current balance
      const { data: creditRow } = await adminClient
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      return new Response(JSON.stringify({
        balance: creditRow?.balance ?? 0,
        unlocks_added: 0,
        message: 'Payment already processed',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Atomic: add credits + log transaction via RPC
    const { data: newBalance, error: rpcError } = await adminClient.rpc('add_user_credits', {
      p_user_id: user.id,
      p_amount: unlocks,
      p_reference: reference,
      p_naira_amount: nairaAmount
    });

    if (rpcError) {
      return new Response(JSON.stringify({ error: 'Failed to process credits: ' + rpcError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // ── Notify User ────────────────────────────────────────────────────────
    try {
      const { error: notifError } = await adminClient.from('notifications').insert({
        user_id: user.id,
        type: 'payment_received',
        title: '💰 Credits Added!',
        message: `Your balance has been topped up with ${unlocks} service units.`,
        data: {
          units: unlocks,
          reference: reference,
          type: 'credit_topup',
          screen: 'Profile' 
        }
      });
      if (notifError) console.error('[Topup Notification Error]:', notifError);
    } catch (notifErr) {
      console.error('Error creating topup notification exception:', notifErr);
    }

    return new Response(JSON.stringify({
      balance: newBalance,
      unlocks_added: unlocks,
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
