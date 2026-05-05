import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { property_id } = await req.json();

    if (!property_id) {
      return new Response(JSON.stringify({ error: 'Missing property_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check if already unlocked
    const { data: existingUnlock } = await adminClient
      .from('property_unlocks')
      .select('id')
      .eq('user_id', user.id)
      .eq('property_id', property_id)
      .single();

    // Fetch landlord data helper
    const fetchLandlordData = async () => {
      const { data: property, error } = await adminClient
        .from('properties')
        .select('id, title, price, location, type, listing_purpose, landlord_id')
        .eq('id', property_id)
        .single();

      if (error || !property) {
        return null;
      }

      // Get landlord details
      const { data: landlord } = await adminClient
        .from('users')
        .select('id, first_name, last_name, email, is_verified, created_at')
        .eq('id', property.landlord_id)
        .single();

      if (!landlord) return null;

      // Get landlord's listing count
      const { count } = await adminClient
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('landlord_id', property.landlord_id);

      // Get landlord profile photo from biodata
      const { data: biodata } = await adminClient
        .from('user_biodata')
        .select('profile_photo')
        .eq('id', property.landlord_id)
        .single();

      return {
        ...landlord,
        profile_photo: biodata?.profile_photo ?? null,
        listing_count: count ?? 0,
      };
    };

    // 1. Atomic: check balance + deduct + record unlock via RPC
    const { data: rpcData, error: rpcError } = await adminClient.rpc('deduct_user_credits', {
      p_user_id: user.id,
      p_property_id: property_id
    });

    if (rpcError) {
      return new Response(JSON.stringify({ error: 'Failed to process unlock: ' + rpcError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const { success, new_balance, error_message } = rpcData[0];

    if (!success) {
      if (error_message === 'insufficient_credits') {
        return new Response(JSON.stringify({
          error: 'insufficient_credits',
          balance: new_balance,
          unlocked: false,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      return new Response(JSON.stringify({ error: error_message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 2. Fetch landlord details for the response
    const landlord = await fetchLandlordData();
    if (!landlord) {
      return new Response(JSON.stringify({ error: 'Landlord not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    return new Response(JSON.stringify({
      unlocked: true,
      landlord,
      balance: new_balance,
      charged: error_message !== 'already_unlocked',
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
