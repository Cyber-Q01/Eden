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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createUserClient(req);
    const userId = await getUserId(req);

    if (req.method === 'GET') {
        const url = new URL(req.url);
        const type = url.searchParams.get('type');
  
        if (type === 'maintenance') {
          const { data, error } = await supabase
            .from('maintenance_requests')
            .select('*')
            .eq('tenant_id', userId)
            .order('created_at', { ascending: false });
  
          if (error) return errorResponse(error.message, 500);
          return jsonResponse(data || []);
        }
  
        if (type === 'complaint') {
          const { data, error } = await supabase
            .from('complaint_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
  
          if (error) return errorResponse(error.message, 500);
          return jsonResponse(data || []);
        }
  
        return errorResponse('Invalid type. Must be "maintenance" or "complaint".');
    }

    if (req.method === 'POST') {
      const { type, category, description, photos } = await req.json();

      if (!type || !category || !description) {
        return errorResponse('Missing required fields: type, category, description');
      }

      if (type === 'maintenance') {
        const { error } = await supabase
          .from('maintenance_requests')
          .insert({
            tenant_id: userId,
            category,
            description,
            photos: photos ?? [],
            status: 'pending',
          });

        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ success: true }, 201);
      }

      if (type === 'complaint') {
        const { error } = await supabase
          .from('complaint_requests')
          .insert({
            user_id: userId,
            category,
            description,
            photos: photos ?? [],
            status: 'open',
          });

        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ success: true }, 201);
      }

      return errorResponse('Invalid type. Must be "maintenance" or "complaint".');
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    return errorResponse(e.message, 401);
  }
});
