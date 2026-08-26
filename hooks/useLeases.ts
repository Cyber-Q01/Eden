import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';
import { useQuery } from '@tanstack/react-query';

export const useLeases = () => {
    const { user } = useAuth();
    const { showError } = useToast();
    const [detailLoading, setDetailLoading] = useState(false);

    const { data: leases, isLoading: loading, refetch } = useQuery({
        queryKey: ['leases', user?.id],
        queryFn: async () => {
            if (!user) return [];
            try {
                const { data, error } = await supabase
                    .from('rentals')
                    .select(`
                        *,
                        property:properties(*, owner:users!properties_landlord_id_fkey(first_name, last_name))
                    `)
                    .eq('renter_id', user.id)
                    .in('status', ['confirmed', 'awaiting_confirmation', 'released'])
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data || [];
            } catch (e) {
                const err = await handleError(e);
                showError(err);
                throw e;
            }
        },
        enabled: !!user
    });

    const fetchLeases = async () => {
        const res = await refetch();
        return res.data ?? [];
    };

    const fetchLeaseDetails = async (rentalId: string) => {
        setDetailLoading(true);
        try {
            const { data, error } = await supabase
                .from('rentals')
                .select(`
                    *,
                    property:properties(*, owner:users!properties_landlord_id_fkey(first_name, last_name)),
                    payments:payments(*)
                `)
                .eq('id', rentalId)
                .single();

            if (error) throw error;
            return data;
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return null;
        } finally {
            setDetailLoading(false);
        }
    };

    return { 
        loading: loading || detailLoading, 
        leases: leases ?? [], 
        fetchLeases, 
        fetchLeaseDetails 
    };
};
