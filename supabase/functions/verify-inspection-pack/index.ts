import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';

const PACK_SIZE = 3;

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

    // Metadata must match this user and be an inspection pack purchase
    const metadata = paystackData.data.metadata;
    if (metadata?.user_id !== user.id || metadata?.type !== 'inspection_pack') {
      return new Response(JSON.stringify({ error: 'Invalid payment metadata' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Idempotency: if this reference already granted passes, don't double-grant
    const { count: existingCount } = await adminClient
      .from('inspection_passes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('paystack_reference', reference);

    if ((existingCount ?? 0) >= PACK_SIZE) {
      const { count: remaining } = await adminClient
        .from('inspection_passes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('used_at', null);

      return new Response(JSON.stringify({
        success: true,
        added: 0,
        remaining: remaining ?? 0,
        message: 'Payment already processed',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Grant the fixed pack: 3 passes, one per real-world inspection booking
    const { error: insertError } = await adminClient
      .from('inspection_passes')
      .insert(
        Array.from({ length: PACK_SIZE }, () => ({
          user_id: user.id,
          paystack_reference: reference,
        }))
      );

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Failed to add inspections: ' + insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const { count: remaining } = await adminClient
      .from('inspection_passes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('used_at', null);

    // ── Notify User ────────────────────────────────────────────────────────
    try {
      const { error: notifError } = await adminClient.from('notifications').insert({
        user_id: user.id,
        type: 'payment_received',
        title: '🔑 3 Inspection Bookings Added!',
        message: `Your 3 inspection bookings are ready. Open Eden to book any available property.`,
        data: {
          pack: PACK_SIZE,
          reference: reference,
          type: 'inspection_pack',
          screen: 'Profile',
        },
      });
      if (notifError) console.error('[Pack Notification Error]:', notifError);
    } catch (notifErr) {
      console.error('Error creating pack notification exception:', notifErr);
    }

    return new Response(JSON.stringify({
      success: true,
      added: PACK_SIZE,
      remaining: remaining ?? 0,
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
