import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function createUserClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing Authorization header');

  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );
}

function createServiceRoleClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

async function getUserId(req: Request): Promise<string> {
  const supabase = createUserClient(req);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return user.id;
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonResponse(data: unknown, status = 200) {
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
    const supabase = createUserClient(req);
    const serviceRoleClient = createServiceRoleClient();
    const userId = await getUserId(req);

    // ── GET: Fetch conversations or single conversation ─────────────────
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const conversationId = url.searchParams.get('id');

      if (conversationId) {
        // Fetch single conversation with participant details using service role to bypass RLS for names
        const { data, error } = await serviceRoleClient
          .from('conversations')
          .select(`
            *,
            participant_a:users!participant_a_id(id, first_name, last_name, email, user_biodata!user_biodata_id_fkey(profile_photo)),
            participant_b:users!participant_b_id(id, first_name, last_name, email, user_biodata!user_biodata_id_fkey(profile_photo))
          `)
          .eq('id', conversationId)
          .single();

        if (error) return errorResponse(error.message, 500);
        
        // Verify requesting user is a participant
        if (data.participant_a_id !== userId && data.participant_b_id !== userId) {
          return errorResponse('Unauthorized', 403);
        }

        return jsonResponse(data);
      }

      const { data, error } = await serviceRoleClient
        .from('conversations')
        .select(`
          *,
          participant_a:users!participant_a_id(id, first_name, last_name, email, user_biodata!user_biodata_id_fkey(profile_photo)),
          participant_b:users!participant_b_id(id, first_name, last_name, email, user_biodata!user_biodata_id_fkey(profile_photo))
        `)
        .or(`participant_a_id.eq.${userId},participant_b_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data ?? []);
    }

    // ── POST: Start or get existing conversation ────────────────────────
    if (req.method === 'POST') {
      const { other_user_id } = await req.json();
      if (!other_user_id) return errorResponse('Missing other_user_id');

      // Check if conversation already exists (either direction)
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_a_id.eq.${userId},participant_b_id.eq.${other_user_id}),` +
          `and(participant_a_id.eq.${other_user_id},participant_b_id.eq.${userId})`
        )
        .single();

      if (existing) {
        return jsonResponse({ id: existing.id });
      }

      // Create new
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ participant_a_id: userId, participant_b_id: other_user_id })
        .select('id')
        .single();

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ id: created?.id }, 201);
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    return errorResponse(e.message, 401);
  }
});
