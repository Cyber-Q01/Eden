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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createUserClient(req);
    const userId = await getUserId(req);

    // ── GET: Fetch profile with biodata ────────────────────────────────────
    if (req.method === 'GET') {
      const [userRes, biodataRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_biodata').select('*').eq('id', userId).maybeSingle()
      ]);

      if (userRes.error) return errorResponse(userRes.error.message, 500);
      if (!userRes.data) return errorResponse('User not found', 404);

      const biodata = biodataRes.data ?? null;

      // Flatten profile_photo from user_biodata for convenience
      const profile = {
        ...userRes.data,
        user_biodata: biodata,
        profile_photo: biodata?.profile_photo ?? userRes.data?.user_metadata?.avatar_url ?? null,
        phone: biodata?.phone_number ?? null,
        gender: biodata?.gender ?? null,
      };

      return jsonResponse(profile);
    }

    // ── PUT: Update profile fields ──────────────────────────────────────────
    if (req.method === 'PUT') {
      const body = await req.json();
      const { profile_photo, first_name, last_name, phone, gender } = body;

      // Only first_name and last_name live on the users table
      const userUpdates: Record<string, any> = {};
      if (first_name !== undefined) userUpdates.first_name = first_name;
      if (last_name !== undefined) userUpdates.last_name = last_name;

      if (Object.keys(userUpdates).length > 0) {
        const { error: userError } = await supabase
          .from('users')
          .update(userUpdates)
          .eq('id', userId);

        if (userError) return errorResponse(userError.message, 500);
      }

      // phone, gender, and profile_photo all live in user_biodata
      const biodataUpdates: Record<string, any> = { id: userId };
      if (phone !== undefined) biodataUpdates.phone_number = phone;
      if (gender !== undefined) biodataUpdates.gender = gender;
      if (profile_photo !== undefined) biodataUpdates.profile_photo = profile_photo;

      if (Object.keys(biodataUpdates).length > 1) { // more than just 'id'
        const { error: biodataError } = await supabase
          .from('user_biodata')
          .upsert(biodataUpdates, { onConflict: 'id' });

        if (biodataError) return errorResponse(biodataError.message, 500);
      }

      return jsonResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    return errorResponse(e.message, 401);
  }
});
