import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) return images.filter(i => typeof i === 'string' && i.length > 0);
  if (typeof images === 'string') {
    // Handle Postgres native array format: {url1,url2}
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

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      if (!id) return errorResponse('Missing id parameter');

      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          landlord:users!landlord_id (
            first_name,
            last_name,
            biodata:user_biodata (
              business_name,
              profile_photo
            )
          ),
          agent:users!agent_id (
            first_name,
            last_name,
            biodata:user_biodata (
              profile_photo
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) return errorResponse(error.message, 500);

      // Flatten biodata into landlord/agent objects for frontend compatibility
      const flattenedData = {
        ...data,
        images: parseImages(data.images),
        landlord: data.landlord ? {
          ...data.landlord,
          business_name: Array.isArray(data.landlord.biodata) 
            ? data.landlord.biodata[0]?.business_name 
            : data.landlord.biodata?.business_name,
          avatar_url: Array.isArray(data.landlord.biodata)
            ? data.landlord.biodata[0]?.profile_photo
            : data.landlord.biodata?.profile_photo
        } : null,
        agent: data.agent ? {
          ...data.agent,
          avatar_url: Array.isArray(data.agent.biodata)
            ? data.agent.biodata[0]?.profile_photo
            : data.agent.biodata?.profile_photo
        } : null
      };

      // Remove the intermediate biodata objects
      if (flattenedData.landlord) delete (flattenedData.landlord as any).biodata;
      if (flattenedData.agent) delete (flattenedData.agent as any).biodata;

      return jsonResponse(flattenedData);
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    return errorResponse(e.message, 401);
  }
});
