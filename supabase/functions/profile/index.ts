import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) return images;
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [images];
    } catch {
      return images.length > 0 ? [images] : [];
    }
  }
  return [];
}

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

    // ── GET: Fetch profile ──────────────────────────────────────────────
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data);
    }

    // ── PUT: Update profile ─────────────────────────────────────────────
    if (req.method === 'PUT') {
      const updates = await req.json();
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    return errorResponse(e.message, 401);
  }
});
