import { useQuery } from '@tanstack/react-query';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';

export type RentTrackerData = {
    totalCollected: number;
    activeTenantsCount: number;
    rentals: any[];
    paymentHistory: any[];
    amountPaid: number;
    amountPending: number;
};

export const useLandlordRentals = () => {
    const { user, role, delegatedLandlordId } = useAuth();
    const { showError } = useToast();

    return useQuery({
        queryKey: ['landlord-rentals', user?.id, role, delegatedLandlordId],
        queryFn: async (): Promise<RentTrackerData> => {
            if (!user) return { totalCollected: 0, activeTenantsCount: 0, rentals: [], paymentHistory: [], amountPaid: 0, amountPending: 0 };

            try {
                console.log('[DEBUG] v3 - Raw Fetching Started');
                // 1. Get the list of property IDs this user can manage
                let propertyIds: string[] = [];
                console.log('[DEBUG] useLandlordRentals - User:', user.id, 'Role:', role);

                if (role === 'AGENT') {
                    const { data: agentProps, error: agentErr } = await supabase
                        .from('agent_property_assignments')
                        .select('property_id')
                        .eq('agent_id', user.id);

                    if (agentErr) console.error('[DEBUG] Agent Props Error:', agentErr);
                    propertyIds = agentProps?.map(p => p.property_id) || [];
                    console.log('[DEBUG] Agent Property IDs:', propertyIds);
                } else {
                    const { data: landlordProps, error: landlordErr } = await supabase
                        .from('properties')
                        .select('id')
                        .eq('landlord_id', user.id)
                        .neq('status', 'deleted');

                    if (landlordErr) console.error('[DEBUG] Landlord Props Error:', landlordErr);
                    propertyIds = landlordProps?.map(p => p.id) || [];
                    console.log('[DEBUG] Landlord Property IDs:', propertyIds);
                }

                // 2. Fetch rentals. 
                // We simplify this to a base select to bypass relationship errors.
                if (propertyIds.length === 0) {
                    console.log('[DEBUG] No property assignments/properties found. Returning empty.');
                    return { totalCollected: 0, activeTenantsCount: 0, rentals: [], paymentHistory: [], amountPaid: 0, amountPending: 0 };
                }

                const { data: rawRentals, error: rentalsError } = await supabase
                    .from('rentals')
                    .select('*')
                    .in('property_id', propertyIds)
                    .order('created_at', { ascending: false });

                console.log('[DEBUG] Raw Rentals Found Count:', rawRentals?.length || 0);
                if (rentalsError) {
                    console.error('[DEBUG] Rentals Query Error:', rentalsError);
                    throw rentalsError;
                }

                // 3. Manually fetch properties and renters to avoid PGRST201
                const rentalsWithData = await Promise.all((rawRentals || []).map(async (rental) => {
                    const { data: prop } = await supabase
                        .from('properties')
                        .select('*')
                        .eq('id', rental.property_id)
                        .maybeSingle();

                    // Fetch renter from users
                    let { data: renter, error: renterErr } = await supabase
                        .from('users')
                        .select('first_name, last_name, email')
                        .eq('id', rental.renter_id)
                        .maybeSingle();

                    if (renterErr) {
                        console.error(`[DEBUG] Error fetching renter for ID ${rental.renter_id}:`, renterErr);
                    }
                    console.log(`[DEBUG] Renter ID ${rental.renter_id} query result:`, renter);

                    const resolvedRenter = renter ? {
                        ...renter,
                        first_name: renter.first_name || renter.email?.split('@')[0] || 'Unknown',
                        last_name: renter.last_name || 'Tenant'
                    } : { first_name: 'Unknown', last_name: 'Tenant' };

                    return {
                        ...rental,
                        property: prop,
                        renter: resolvedRenter,
                        user: resolvedRenter // Alias for consistency
                    };
                }));

                const rentals = rentalsWithData;

                // 3. Fetch all payments for these rentals
                const rentalIds = rentals?.map(r => r.id) || [];
                let paymentHistory: any[] = [];

                if (rentalIds.length > 0) {
                    const { data: payments, error: paymentsError } = await supabase
                        .from('payments')
                        .select(`
                            *,
                            user:users(first_name, last_name)
                        `)
                        .in('rental_id', rentalIds)
                        .eq('status', 'successful')
                        .order('paid_at', { ascending: false });

                    if (paymentsError) throw paymentsError;

                    paymentHistory = payments || [];
                }

                // 4. Fetch payouts for detailed earnings breakdown
                let amountPaid = 0;
                let amountPending = 0;

                const targetOwnerId = (role === 'AGENT' && delegatedLandlordId) ? delegatedLandlordId : user.id;

                if (targetOwnerId) {
                    const { data: payouts, error: payoutsError } = await supabase
                        .from('payouts')
                        .select('amount, status')
                        .eq('owner_id', targetOwnerId);

                    if (!payoutsError && payouts) {
                        payouts.forEach(p => {
                            const val = Number(p.amount) || 0;
                            if (p.status === 'success') {
                                amountPaid += val;
                            } else if (p.status === 'pending') {
                                amountPending += val;
                            }
                        });
                    } else if (payoutsError) {
                        console.error('[DEBUG] Payouts Query Error:', payoutsError);
                    }
                }

                const totalCollected = amountPaid + amountPending;

                return {
                    totalCollected,
                    amountPaid,
                    amountPending,
                    activeTenantsCount: rentals?.filter(r => r.status === 'confirmed').length || 0,
                    rentals: rentals || [],
                    paymentHistory
                };

            } catch (e) {
                const err = await handleError(e);
                showError(err);
                throw e;
            }
        },
        enabled: !!user
    });
};
