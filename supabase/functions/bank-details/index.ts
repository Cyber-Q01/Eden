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

    // ── GET: Fetch bank details ─────────────────────────────────────────
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

      // PGRST116 = no rows found — not an error for us
      if (error && error.code !== 'PGRST116') return errorResponse(error.message, 500);
      return jsonResponse(data ?? null);
    }

    // ── POST: Upsert bank details ───────────────────────────────────────
    if (req.method === 'POST') {
      const { bank_name, account_number, account_name } = await req.json();

      if (!bank_name || !account_number || !account_name) {
        return errorResponse('Missing required fields: bank_name, account_number, account_name');
      }

      const { error } = await supabase
        .from('bank_accounts')
        .upsert({
          user_id: userId,
          bank_name,
          account_number,
          account_name,
        }, { onConflict: 'user_id' });

      if (error) return errorResponse(error.message, 500);
      return jsonResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    return errorResponse(e.message, 401);
  }
});
