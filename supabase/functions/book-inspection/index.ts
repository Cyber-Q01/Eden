import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Replaces the legacy credits-based booking function.
// Booking now consumes ONE unused inspection pass (from a paid 3-pack).
const MAX_BOOKINGS_PER_PROPERTY = 6;
const INSPECTION_PRICE = 666;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

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
      return json({ error: 'Method not allowed' }, 405);
    }

    const { property_id, preferred_date, preferred_time, notes, whatsapp_number } = await req.json();

    if (!property_id || !preferred_date || !preferred_time) {
      return json({ error: 'Missing property, date or time.', code: 'invalid_input' }, 400);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Property must exist and be available
    const { data: property } = await adminClient
      .from('properties')
      .select('id, status')
      .eq('id', property_id)
      .maybeSingle();

    if (!property) return json({ error: 'Property not found.', code: 'not_found' }, 404);
    if (property.status !== 'available') {
      return json({ error: 'This property is no longer available for inspection.', code: 'property_unavailable' }, 400);
    }

    // 2. One inspection booking per tenant per property
    const { data: existing } = await adminClient
      .from('inspection_bookings')
      .select('id')
      .eq('property_id', property_id)
      .eq('renter_id', user.id)
      .neq('status', 'cancelled')
      .limit(1)
      .maybeSingle();

    if (existing) {
      return json({ error: 'You already have an inspection booked for this property.', code: 'duplicate' }, 400);
    }

    // 3. Maximum total inspections per property
    const { count: propCount } = await adminClient
      .from('inspection_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', property_id)
      .neq('status', 'cancelled');

    if ((propCount ?? 0) >= MAX_BOOKINGS_PER_PROPERTY) {
      return json({ error: 'This property has reached the maximum number of inspection bookings.', code: 'limit_reached' }, 400);
    }

    // 4. Claim one unused pass (compare-and-set so a pass can't be double-spent)
    const { data: pass } = await adminClient
      .from('inspection_passes')
      .select('id')
      .eq('user_id', user.id)
      .is('used_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!pass) {
      return json({ error: 'No inspection bookings remaining. Buy a pack of 3 to continue.', code: 'no_passes' }, 400);
    }

    const { data: claimed, error: claimError } = await adminClient
      .from('inspection_passes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', pass.id)
      .is('used_at', null)
      .select('id');

    if (claimError || !claimed || claimed.length === 0) {
      return json({ error: 'No inspection bookings remaining. Buy a pack of 3 to continue.', code: 'no_passes' }, 400);
    }

    // 5. Create the booking
    const { data: booking, error: bookingError } = await adminClient
      .from('inspection_bookings')
      .insert({
        renter_id: user.id,
        property_id,
        amount: INSPECTION_PRICE,
        preferred_date,
        preferred_time,
        notes: notes || null,
        whatsapp_number: whatsapp_number || null,
        status: 'confirmed',
      })
      .select('id')
      .single();

    if (bookingError || !booking) {
      // Release the claimed pass so it isn't lost
      await adminClient
        .from('inspection_passes')
        .update({ used_at: null })
        .eq('id', pass.id);
      return json({ error: bookingError?.message || 'Failed to create booking.', code: 'booking_failed' }, 500);
    }

    // 6. Link the pass to the booking (best effort)
    await adminClient
      .from('inspection_passes')
      .update({ booking_id: booking.id })
      .eq('id', pass.id);

    // 7. Remaining passes
    const { count: remaining } = await adminClient
      .from('inspection_passes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('used_at', null);

    return json({ success: true, booking_id: booking.id, remaining: remaining ?? 0 });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});
