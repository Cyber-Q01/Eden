import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) return images.filter(i => typeof i === 'string' && i.length > 0);
  if (typeof images === 'string') {
    if (images.startsWith('{') && images.endsWith('}')) {
      const inner = images.slice(1, -1);
      if (inner.length === 0) return [];
      return inner.split(',').map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
    }
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed.filter(i => typeof i === 'string' && i.length > 0) : [];
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createUserClient(req);
    const userId = await getUserId(req);

    // ── GET: Fetch favorites ────────────────────────────────────────────
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, properties(*)')
        .eq('user_id', userId);

      if (error) return errorResponse(error.message, 500);

      const favorites = (data ?? [])
        .map((f: any) => f.properties)
        .filter(Boolean)
        .map((p: any) => ({ ...p, images: parseImages(p.images) }));

      return jsonResponse(favorites);
    }

    // ── POST: Add favorite ──────────────────────────────────────────────
    if (req.method === 'POST') {
      const { property_id } = await req.json();
      if (!property_id) return errorResponse('Missing property_id');

      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, property_id });

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ success: true }, 201);
    }

    // ── DELETE: Remove favorite ─────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { property_id } = await req.json();
      if (!property_id) return errorResponse('Missing property_id');

      const { error } = await supabase
        .from('favorites')
        .delete()
        .match({ user_id: userId, property_id });

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    return errorResponse(e.message, 401);
  }
});
