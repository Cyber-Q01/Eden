// supabase/functions/landlord-properties/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) return images.filter((i) => typeof i === 'string' && i.length > 0);
  if (typeof images === 'string') {
    if (images.startsWith('{') && images.endsWith('}')) {
      const inner = images.slice(1, -1);
      if (inner.length === 0) return [];
      return inner
        .split(',')
        .map((s) => s.replace(/^"|"$/g, '').trim())
        .filter(Boolean);
    }
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed.filter((i) => typeof i === 'string' && i.length > 0) : [];
    } catch {
      return images.length > 0 ? [images] : [];
    }
  }
  return [];
}

function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
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

async function getUserId(req: Request): Promise<{ userId: string; userClient: any; serviceClient: any }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing Authorization header');

  const token = authHeader.replace('Bearer ', '');
  const service = createServiceClient();
  const { data: { user }, error } = await service.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');

  return {
    userId: user.id,
    userClient: createUserClient(req),
    serviceClient: service,
  };
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
    const { userId, serviceClient } = await getUserId(req);

    if (req.method === 'GET') {
      // 1. Fetch User Record to verify Role
      const { data: userRecord, error: userError } = await serviceClient
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('id', userId)
        .single();

      if (userError || !userRecord) return errorResponse('User not found', 404);

      const isAgent = userRecord.role === 'AGENT';
      let properties: any[] = [];
      let propertyIds: string[] = [];

      if (isAgent) {
        // Agent: Fetch properties assigned via agent_property_assignments OR properties.agent_id
        const { data: assignedRows } = await serviceClient
          .from('agent_property_assignments')
          .select('property_id, properties(*)')
          .eq('agent_id', userId);

        const assignedProps = (assignedRows ?? [])
          .map((r: any) => r.properties)
          .filter((p: any) => p && p.status !== 'deleted');

        const { data: directProps } = await serviceClient
          .from('properties')
          .select('*')
          .eq('agent_id', userId)
          .neq('status', 'deleted');

        const mergedMap = new Map();
        [...assignedProps, ...(directProps ?? [])].forEach((p: any) => {
          if (p && !mergedMap.has(p.id)) mergedMap.set(p.id, p);
        });

        properties = Array.from(mergedMap.values()).map((p: any) => ({
          ...p,
          images: parseImages(p.images),
        }));
        propertyIds = properties.map((p) => p.id);
      } else {
        // Landlord: Fetch all properties owned by this landlord
        const { data: landlordProps, error: propError } = await serviceClient
          .from('properties')
          .select('*')
          .eq('landlord_id', userId)
          .neq('status', 'deleted')
          .order('created_at', { ascending: false });

        if (propError) return errorResponse(propError.message, 500);

        properties = (landlordProps ?? []).map((p: any) => ({
          ...p,
          images: parseImages(p.images),
        }));
        propertyIds = properties.map((p) => p.id);
      }

      // 2. Fetch Active Rentals to determine Occupancy & Tenant count
      let occupiedCount = 0;
      let rentalsList: any[] = [];

      if (propertyIds.length > 0) {
        const { data: rentalsData } = await serviceClient
          .from('rentals')
          .select(`
            *,
            property:properties(id, title, location, price),
            renter:users!renter_id(id, first_name, last_name, email, user_biodata!user_biodata_id_fkey(phone_number, profile_photo))
          `)
          .in('property_id', propertyIds)
          .order('created_at', { ascending: false });

        rentalsList = rentalsData ?? [];
        const occupiedIds = new Set(
          rentalsList
            .filter((r) => ['confirmed', 'awaiting_confirmation', 'released'].includes(r.status))
            .map((r) => r.property_id)
        );

        occupiedCount = occupiedIds.size;

        properties = properties.map((p) => ({
          ...p,
          is_occupied: occupiedIds.has(p.id),
        }));
      }

      // 3. ── CRITICAL: FINANCIAL RECORD SOURCED STRICTLY FROM PAYOUTS TABLE ──
      let amountPaid = 0;
      let amountPending = 0;
      let totalCollected = 0;
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const monthlyEarningsData = Array(12).fill(0);

      // Query payouts table strictly where owner_id = userId
      const { data: payoutsData, error: payoutsError } = await serviceClient
        .from('payouts')
        .select('*')
        .eq('owner_id', userId);

      if (!payoutsError && payoutsData) {
        payoutsData.forEach((p: any) => {
          const val = Number(p.amount) || 0;
          const status = (p.status || 'pending').toLowerCase();

          if (status === 'success') {
            amountPaid += val;

            // Group into 12-month array by completed/initiated timestamp
            const dateStr = p.completed_at || p.initiated_at || p.created_at;
            if (dateStr) {
              const d = new Date(dateStr);
              if (d.getFullYear() === currentYear) {
                monthlyEarningsData[d.getMonth()] += val;
              }
            }
          } else if (status === 'pending') {
            amountPending += val;
          }
        });
      }

      // Also check unreleased rentals where tenant paid into escrow but payout row is awaiting move-in
      if (rentalsList.length > 0) {
        rentalsList.forEach((r: any) => {
          if (
            r.status === 'awaiting_confirmation' &&
            (!payoutsData || !payoutsData.some((p: any) => p.rental_id === r.id))
          ) {
            amountPending += Number(r.owner_payout || 0);
          }
        });
      }

      totalCollected = amountPaid + amountPending;

      // Calculate Last 6-Month Total (Strictly sum of the 6 displayed bars)
      let last6MonthsTotal = 0;
      for (let i = 0; i < 6; i++) {
        const m = (currentMonth - i + 12) % 12;
        last6MonthsTotal += monthlyEarningsData[m] || 0;
      }

      // This Month Earnings (Strictly payouts completed in the current month)
      const thisMonthEarnings = monthlyEarningsData[currentMonth] || 0;

      // 4. Landlord / Agent Rating from landlord_ratings table
      let avgRating = 5.0;
      const { data: ratingsData } = await serviceClient
        .from('landlord_ratings')
        .select('rating')
        .eq('landlord_id', userId);

      if (ratingsData && ratingsData.length > 0) {
        const sum = ratingsData.reduce((acc: number, r: any) => acc + Number(r.rating || 5), 0);
        avgRating = Number((sum / ratingsData.length).toFixed(1));
      }

      // 5. Bookings Count
      let bookingCount = 0;
      if (propertyIds.length > 0) {
        const { count } = await serviceClient
          .from('inspection_bookings')
          .select('id', { count: 'exact', head: true })
          .in('property_id', propertyIds);

        bookingCount = count ?? 0;
      }

      // 6. Pending Applications
      let pendingRequests = 0;
      let applications: any[] = [];
      if (propertyIds.length > 0) {
        const { data: appsData } = await serviceClient
          .from('property_applications')
          .select(`
            *,
            property:properties(id, title, location, price, images),
            renter:users!renter_id(id, first_name, last_name, email, user_biodata!user_biodata_id_fkey(phone_number, profile_photo))
          `)
          .in('property_id', propertyIds)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        applications = appsData ?? [];
        pendingRequests = applications.length;
      }

      const formattedEarnings = `₦${totalCollected.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      return jsonResponse({
        listings: properties,
        applications,
        rentals: rentalsList,
        payouts: payoutsData ?? [],
        stats: {
          earnings: formattedEarnings,
          activeCount: properties.length,
          tenantCount: occupiedCount,
          pendingRequests,
          bookingCount,
          monthlyEarnings: monthlyEarningsData,
          amountPaid,
          amountPending,
          totalCollected,
          last6MonthsTotal,
          thisMonthEarnings,
          rating: avgRating,
        },
        isAgent,
      });
    }

    if (req.method === 'DELETE') {
      const body = await req.json().catch(() => ({}));
      const propertyId = body?.property_id;

      if (!propertyId) return errorResponse('Missing property_id', 400);

      const { data: userRecord } = await serviceClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (!userRecord) return errorResponse('User not found', 404);
      if (userRecord.role === 'AGENT') return errorResponse('Agents cannot delete properties', 403);

      const { data: prop } = await serviceClient
        .from('properties')
        .select('status, landlord_id')
        .eq('id', propertyId)
        .single();

      if (!prop) return errorResponse('Property not found', 404);
      if (prop.landlord_id !== userId) return errorResponse('Not authorized', 403);

      await serviceClient
        .from('properties')
        .update({ status: 'deleted' })
        .eq('id', propertyId)
        .eq('landlord_id', userId);

      return jsonResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (e: any) {
    return errorResponse(e.message, 401);
  }
});
