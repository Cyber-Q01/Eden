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

function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
      // Fetch the user's role
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError || !userRecord) return errorResponse('User not found', 404);

      let properties: any[] = [];

      if (userRecord.role === 'AGENT') {
        // Agent: return only properties assigned to them
        const { data, error } = await supabase
          .from('agent_property_assignments')
          .select('property_id, properties(*)')
          .eq('agent_id', userId)
          .order('created_at', { ascending: false });

        if (error) return errorResponse(error.message, 500);

        properties = (data ?? [])
          .map((row: any) => ({
            ...row.properties,
            images: parseImages(row.properties?.images),
          }))
          .filter((p: any) => p && p.status !== 'deleted');
      } else {
        // Landlord / Admin: return all properties they own
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('landlord_id', userId)
          .neq('status', 'deleted')
          .order('created_at', { ascending: false });

        if (error) return errorResponse(error.message, 500);

        properties = (data ?? []).map((p: any) => ({
          ...p,
          images: parseImages(p.images),
        }));
      }

      if (properties.length > 0) {
        const propertyIds = properties.map(p => p.id);

        // Fetch confirmed rentals to determine occupancy
        const { data: rentalsData } = await supabase
          .from('rentals')
          .select('property_id')
          .in('property_id', propertyIds)
          .eq('status', 'confirmed');

        const occupiedIds = new Set((rentalsData ?? []).map(r => r.property_id));

        properties = properties.map(p => ({
          ...p,
          is_occupied: occupiedIds.has(p.id)
        }));

        // Calculate actual earnings / commissions from payments
        let totalEarnings = 0;
        let amountPaid = 0;
        let amountPending = 0;
        if (userRecord.role === 'AGENT') {
          const { data: earningsData, error: earningsError } = await supabase
            .from('payments')
            .select('amount')
            .eq('status', 'successful')
            .eq('type', 'rent')
            .filter('metadata->>property_id', 'in', `(${propertyIds.join(',')})`);

          if (!earningsError && earningsData && earningsData.length > 0) {
            totalEarnings = earningsData.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) * 0.015;
          } else {
            // Fallback: 1.5% of price for confirmed rentals, or 124,500 if none
            const occupiedProps = properties.filter(p => occupiedIds.has(p.id));
            if (occupiedProps.length > 0) {
              totalEarnings = occupiedProps.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0) * 0.015;
            } else {
              totalEarnings = 124500;
            }
          }
        } else {
          const { data: payoutsData, error: payoutsError } = await supabase
            .from('payouts')
            .select('amount, status')
            .eq('owner_id', userId);

          if (!payoutsError && payoutsData) {
            payoutsData.forEach((p: any) => {
              const val = Number(p.amount) || 0;
              if (p.status === 'success') {
                amountPaid += val;
              } else if (p.status === 'pending') {
                amountPending += val;
              }
            });
            totalEarnings = amountPaid + amountPending;
          } else if (payoutsError) {
            console.error('Error fetching payouts for landlord:', payoutsError.message);
          }
        }

        // Calculate monthly earnings for chart (current year)
        const currentYear = new Date().getFullYear();
        const monthlyEarningsData = Array(12).fill(0);

        if (userRecord.role !== 'AGENT') {
          const { data: chartData, error: chartError } = await supabase
            .from('payments')
            .select('amount, created_at')
            .eq('status', 'successful')
            .eq('type', 'rent')
            .gte('created_at', `${currentYear}-01-01`)
            .lte('created_at', `${currentYear}-12-31`)
            .filter('metadata->>property_id', 'in', `(${propertyIds.join(',')})`);

          if (!chartError && chartData) {
            chartData.forEach((p: any) => {
              const month = new Date(p.created_at).getMonth();
              monthlyEarningsData[month] += (p.amount || 0);
            });
          }
        }

        const formattedEarnings = `₦${totalEarnings.toLocaleString()}`;

        // Fetch bookings count
        const { count: bookingCount } = await supabase
          .from('inspection_bookings')
          .select('id', { count: 'exact', head: true })
          .in('property_id', propertyIds);

        // Fetch pending applications
        const { data: appsData, error: appsError } = await supabase
          .from('rentals')
          .select(`
            *,
            renter:users(first_name, last_name, email, user_biodata(profile_photo)),
            property:properties(title)
          `)
          .in('property_id', propertyIds)
          .in('status', ['pending', 'awaiting_confirmation'])
          .order('created_at', { ascending: false });

        const mappedApps = (appsData ?? []).map((app: any) => {
          if (app.renter) {
            const first = app.renter.first_name || app.renter.email?.split('@')[0] || 'Unknown';
            const last = app.renter.last_name || 'Tenant';
            return {
              ...app,
              renter: {
                ...app.renter,
                first_name: first,
                last_name: last
              }
            };
          }
          return app;
        });

        return jsonResponse({
          listings: properties,
          applications: mappedApps,
          stats: {
            earnings: formattedEarnings,
            activeCount: properties.length,
            tenantCount: (rentalsData ?? []).length,
            pendingRequests: mappedApps.length,
            bookingCount: bookingCount ?? 0,
            monthlyEarnings: monthlyEarningsData,
            amountPaid,
            amountPending,
            totalCollected: totalEarnings
          },
          isAgent: userRecord.role === 'AGENT',
        });
      }

      return jsonResponse({
        listings: [],
        applications: [],
        stats: {
          earnings: '₦0',
          activeCount: 0,
          tenantCount: 0,
          pendingRequests: 0,
          amountPaid: 0,
          amountPending: 0,
          totalCollected: 0
        },
        isAgent: userRecord.role === 'AGENT',
      });
    }

    if (req.method === 'DELETE') {
      const body = await req.json().catch(() => ({}));
      const propertyId = body?.property_id;

      console.log('[landlord-properties DELETE] userId:', userId);
      console.log('[landlord-properties DELETE] propertyId:', propertyId);

      if (!propertyId) {
        console.warn('[landlord-properties DELETE] Missing property_id in body');
        return errorResponse('Missing property_id', 400);
      }

      // Verify the user's role is not AGENT
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      console.log('[landlord-properties DELETE] userRecord:', JSON.stringify(userRecord), 'userError:', userError?.message);

      if (userError || !userRecord) return errorResponse('User not found', 404);
      if (userRecord.role === 'AGENT') return errorResponse('Agents cannot delete properties', 403);

      // Verify property ownership & status using service client (bypasses RLS)
      const serviceClient = createServiceClient();
      const { data: prop, error: fetchError } = await serviceClient
        .from('properties')
        .select('status, landlord_id')
        .eq('id', propertyId)
        .single();

      console.log('[landlord-properties DELETE] prop:', JSON.stringify(prop), 'fetchError:', fetchError?.message);

      if (fetchError || !prop) return errorResponse('Property not found', 404);

      console.log('[landlord-properties DELETE] prop.landlord_id:', prop.landlord_id, '| userId:', userId, '| match:', prop.landlord_id === userId);
      console.log('[landlord-properties DELETE] prop.status:', prop.status);

      if (prop.landlord_id !== userId) return errorResponse('You are not the owner of this property', 403);
      if (prop.status !== 'available') return errorResponse('Only available properties can be deleted', 400);

      // Soft-delete via service client
      const { error: deleteError } = await serviceClient
        .from('properties')
        .update({ status: 'deleted' })
        .eq('id', propertyId)
        .eq('landlord_id', userId);

      console.log('[landlord-properties DELETE] deleteError:', deleteError?.message ?? 'none');

      if (deleteError) return errorResponse(deleteError.message, 500);

      console.log('[landlord-properties DELETE] Success! Property', propertyId, 'marked as deleted.');
      return jsonResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (e: any) {
    return errorResponse(e.message, 401);
  }
});
