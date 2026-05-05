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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createUserClient(req);
    const userId = await getUserId(req);

    // ── GET: Fetch messages for a conversation ──────────────────────────
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const conversationId = url.searchParams.get('conversation_id');
      if (!conversationId) return errorResponse('Missing conversation_id parameter');

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data ?? []);
    }

    // ── POST: Send a message ────────────────────────────────────────────
    if (req.method === 'POST') {
      const { conversation_id, content } = await req.json();
      if (!conversation_id || !content) return errorResponse('Missing conversation_id or content');

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id,
          sender_id: userId,
          content: content.trim(),
        });

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ success: true }, 201);
    }

    // ── PUT: Mark messages as read ──────────────────────────────────────
    if (req.method === 'PUT') {
      const { conversation_id } = await req.json();
      if (!conversation_id) return errorResponse('Missing conversation_id');

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversation_id)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    return errorResponse(e.message, 401);
  }
});
