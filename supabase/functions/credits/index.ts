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

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'GET') {
      // Get credit balance (create row if missing)
      const { data: creditRow } = await adminClient
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      const balance = creditRow?.balance ?? 0;

      // Optionally check if a specific property is unlocked
      const url = new URL(req.url);
      const propertyId = url.searchParams.get('property_id');

      let unlocked = false;
      if (propertyId) {
        const { data: unlockRow } = await adminClient
          .from('property_unlocks')
          .select('id')
          .eq('user_id', user.id)
          .eq('property_id', propertyId)
          .single();

        unlocked = !!unlockRow;
      }

      return new Response(JSON.stringify({ balance, unlocked }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }
});
