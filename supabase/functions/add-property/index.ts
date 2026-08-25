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

function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createUserClient(req);
    const userId = await getUserId(supabase);
    const adminClient = createAdminClient();

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await req.json();
      const isUpdate = req.method === 'PUT';

      const {
        id: propertyId,
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
        landlord_id: providedLandlordId,
        video_url,
        has_multiple_units = false,
        units_count = 1,
        land_size,
        land_measurement_unit,
        moderation_status,
      } = body;

      // ── Moderation state ─────────────────────────────────────────────────
      // New listings start in the PENDING filter for admin review.
      // Any edit/resubmission of an existing listing IMMEDIATELY re-enters
      // the PENDING state so the changed listing is re-reviewed before going live.
      const effectiveModerationStatus = isUpdate
        ? 'pending'
        : (typeof moderation_status === 'string' && moderation_status.length > 0 ? moderation_status : 'pending');

      // Required field validation
      const required: Record<string, unknown> = { title, description, price, location, type, state, lga };
      if (isUpdate && !propertyId) return errorResponse('Missing property id for update');

      const missing = Object.entries(required)
        .filter(([, v]) => v === undefined || v === null || v === '')
        .map(([k]) => k);

      if (missing.length > 0) {
        return errorResponse(`Missing required fields: ${missing.join(', ')}`);
      }

      // Fetch user role
      const { data: userRecord, error: userError } = await adminClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError || !userRecord) return errorResponse('User not found', 404);
      if (!['LANDLORD', 'ADMIN', 'AGENT'].includes(userRecord.role)) {
        return errorResponse('Only landlords or agents can modify properties', 403);
      }

      // For AGENT: resolve the landlord_id from landlord_agents
      let effectiveLandlordId = userId; // Default: landlord is the caller
      if (userRecord.role === 'AGENT') {
        if (!providedLandlordId) {
          return errorResponse('Missing landlord_id for agent', 400);
        }

        const { data: agentRow, error: agentError } = await adminClient
          .from('landlord_agents')
          .select('landlord_id')
          .eq('agent_id', userId)
          .eq('landlord_id', providedLandlordId)
          .eq('status', 'active')
          .maybeSingle();

        if (agentError || !agentRow) {
          return errorResponse('Agent has no active delegation for this landlord', 403);
        }
        effectiveLandlordId = agentRow.landlord_id;
      }

      if (isUpdate) {
        // Verify access to the property
        if (userRecord.role === 'AGENT') {
          // Agent must have this property assigned to them
          const { data: assignment } = await adminClient
            .from('agent_property_assignments')
            .select('id')
            .eq('agent_id', userId)
            .eq('property_id', propertyId)
            .single();

          if (!assignment) return errorResponse('Agent is not assigned to this property', 403);
        } else {
          // Landlord must own the property
          const { data: existing, error: fetchError } = await adminClient
            .from('properties')
            .select('landlord_id')
            .eq('id', propertyId)
            .single();

          if (fetchError || !existing) return errorResponse('Property not found', 404);
          if (existing.landlord_id !== userId) return errorResponse('Unauthorized to update this property', 403);
        }

        const { data, error } = await adminClient
          .from('properties')
          .update({
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
            agency_fee_percentage,
            caution_fee,
            legal_fee,
            service_fee_percentage,
            total_price,
            updated_at: new Date().toISOString(),
            video_url,
            has_multiple_units,
            units_count,
            land_size: land_size ? parseFloat(land_size) : null,
            land_measurement_unit: land_measurement_unit ?? null,
            moderation_status: effectiveModerationStatus,
            rejection_reason: null, // Reset previous rejection on resubmission
          })
          .eq('id', propertyId)
          .select()
          .single();

        if (error) return errorResponse(error.message, 500);
        return jsonResponse(data);
      } else {
        // Insert new property
        const { data, error } = await adminClient
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
            landlord_id: effectiveLandlordId,
            agent_id: userRecord.role === 'AGENT' ? userId : null,
            agency_fee_percentage,
            caution_fee,
            legal_fee,
            service_fee_percentage,
            total_price,
            video_url,
            has_multiple_units,
            units_count,
            land_size: land_size ? parseFloat(land_size) : null,
            land_measurement_unit: land_measurement_unit ?? null,
            moderation_status: effectiveModerationStatus,
            rejection_reason: null,
          })
          .select()
          .single();

        if (error) return errorResponse(error.message, 500);

        // If the caller is an AGENT, auto-assign the new property to themselves
        if (userRecord.role === 'AGENT' && data) {
          await adminClient
            .from('agent_property_assignments')
            .insert({
              agent_id: userId,
              property_id: data.id,
              assigned_by: effectiveLandlordId,
            });
        }

        return jsonResponse(data, 201);
      }
    }

    return errorResponse('Method not allowed', 405);
  } catch (e: any) {
    const status = e.message === 'Unauthorized' ? 401 : 400;
    return errorResponse(e.message, status);
  }
});