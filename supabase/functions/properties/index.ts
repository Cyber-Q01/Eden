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

function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
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
    const supabase = createAdminClient();
    const url = new URL(req.url);

    if (req.method === 'GET') {
      console.log('Supabase URL defined:', !!Deno.env.get('SUPABASE_URL'));
      console.log('Supabase Key defined:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

      const search = url.searchParams.get('search');
      const type = url.searchParams.get('type');
      const propertyTypes = url.searchParams.get('propertyTypes');
      const location = url.searchParams.get('location');
      const minPrice = url.searchParams.get('minPrice');
      const maxPrice = url.searchParams.get('maxPrice');
      const bedrooms = url.searchParams.get('bedrooms');

      console.log('--- Property Filter Request ---');
      console.log('Search:', search);
      console.log('Type:', type);
      console.log('PropertyTypes:', propertyTypes);
      console.log('Location:', location);
      console.log('MinPrice:', minPrice);
      console.log('MaxPrice:', maxPrice);
      console.log('Bedrooms:', bedrooms);

      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', 'available');

      if (search) {
        query = query.or(`title.ilike."%${search}%",description.ilike."%${search}%"`);
      }

      if (type && type !== 'All') {
        query = query.eq('type', type);
      } else if (propertyTypes) {
        const typesList = propertyTypes.split(',').filter(Boolean);
        if (typesList.length > 0) {
          query = query.in('type', typesList);
        }
      }

      if (location) {
        query = query.or(`location.ilike."%${location}%",state.ilike."%${location}%",lga.ilike."%${location}%"`);
      }

      if (minPrice) {
        query = query.gte('price', parseFloat(minPrice));
      }

      if (maxPrice) {
        query = query.lte('price', parseFloat(maxPrice));
      }

      if (bedrooms) {
        query = query.eq('bedrooms', parseInt(bedrooms));
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Database Error:', error.message);
        return errorResponse(error.message, 500);
      }

      console.log(`Found ${data?.length || 0} properties`);
      console.log('Raw Data:', JSON.stringify(data));

      // Normalize images server-side
      const properties = (data ?? []).map((p: any) => ({
        ...p,
        images: parseImages(p.images),
      }));

      return jsonResponse(properties);
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    return errorResponse(e.message, 401);
  }
});
