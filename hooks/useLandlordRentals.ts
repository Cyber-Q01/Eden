import { useQuery } from '@tanstack/react-query';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { callEdgeFunction } from '../lib/api';
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
        queryKey: ['landlord-properties-v5', user?.id, role, delegatedLandlordId],
        queryFn: async (): Promise<RentTrackerData> => {
            if (!user) return { totalCollected: 0, activeTenantsCount: 0, rentals: [], paymentHistory: [], amountPaid: 0, amountPending: 0 };

            try {
                const response = await callEdgeFunction<{
                    listings: any[];
                    stats: any;
                    rentals?: any[];
                    payouts?: any[];
                }>('landlord-properties', 'GET');

                const stats = response?.stats || {};
                const rentalsList = response?.rentals || [];
                const payoutsList = response?.payouts || [];

                return {
                    totalCollected: Number(stats.totalCollected) || 0,
                    amountPaid: Number(stats.amountPaid) || 0,
                    amountPending: Number(stats.amountPending) || 0,
                    activeTenantsCount: Number(stats.tenantCount) || rentalsList.length,
                    rentals: rentalsList,
                    paymentHistory: payoutsList,
                };
            } catch (e) {
                // Direct fallback if edge function unavailable
                const targetOwnerId = (role === 'AGENT' && delegatedLandlordId) ? delegatedLandlordId : user.id;
                let amountPaid = 0;
                let amountPending = 0;

                const { data: payouts } = await supabase
                    .from('payouts')
                    .select('amount, status')
                    .eq('owner_id', targetOwnerId);

                if (payouts) {
                    payouts.forEach((p: any) => {
                        const val = Number(p.amount) || 0;
                        if (p.status === 'success') amountPaid += val;
                        else if (p.status === 'pending') amountPending += val;
                    });
                }

                return {
                    totalCollected: amountPaid + amountPending,
                    amountPaid,
                    amountPending,
                    activeTenantsCount: 0,
                    rentals: [],
                    paymentHistory: payouts || [],
                };
            }
        },
        enabled: !!user,
        staleTime: 1000 * 30,
    });
};
