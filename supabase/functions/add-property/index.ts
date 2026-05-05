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

async function getUserId(supabase: ReturnType<typeof createUserClient>): Promise<string> {
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

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) return images.filter(i => typeof i === 'string');
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createUserClient(req);
    const userId = await getUserId(supabase);

    if (req.method === 'POST') {
      const body = await req.json();

      const {
        title,
        description,
        price,
        location,
        type,
        listing_purpose = 'rent',
        billing_period = 'yearly',
        state,
        lga,
        landmark,
        bedrooms = 0,
        bathrooms = 0,
        toilets = 0,
        furnishing = 'unfurnished',
        parking = false,
        amenities = [],
        images = [],
        availability_date,
        status = 'available',
        agency_fee_percentage = 0,
        caution_fee = 0,
        legal_fee = 0,
        service_fee_percentage = 1.5,
        total_price,
      } = body;

      // Required field validation
      const required: Record<string, unknown> = { title, description, price, location, type, state, lga };
      const missing = Object.entries(required)
        .filter(([, v]) => v === undefined || v === null || v === '')
        .map(([k]) => k);

      if (missing.length > 0) {
        return errorResponse(`Missing required fields: ${missing.join(', ')}`);
      }

      // Verify user is a landlord
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError || !userRecord) return errorResponse('User not found', 404);
      if (!['LANDLORD', 'ADMIN'].includes(userRecord.role)) {
        return errorResponse('Only landlords can list properties', 403);
      }

      const { data, error } = await supabase
        .from('properties')
        .insert({
          title: title.trim(),
          description: description.trim(),
          price: parseFloat(price),
          location: location.trim(),
          type,
          listing_purpose,
          billing_period: listing_purpose === 'rent' ? billing_period : null,
          state,
          lga,
          landmark: landmark?.trim() ?? null,
          bedrooms,
          bathrooms,
          toilets,
          furnishing,
          parking,
          amenities: Array.isArray(amenities) ? amenities : [],
          images: parseImages(images),
          availability_date: availability_date ?? null,
          status,
          landlord_id: userId,
          agency_fee_percentage,
          caution_fee,
          legal_fee,
          service_fee_percentage,
          total_price,
        })
        .select()
        .single();

      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data, 201);
    }

    return errorResponse('Method not allowed', 405);
  } catch (e) {
    const status = e.message === 'Unauthorized' ? 401 : 400;
    return errorResponse(e.message, status);
  }
});