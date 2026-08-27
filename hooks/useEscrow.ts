// hooks/useEscrow.ts
// Tenant-side escrow: rent payments held in escrow (paid but not yet released).
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Rental, RentalStatus } from './usePayment';

// Statuses where tenant money is still held (not released to landlord, not refunded)
export const ESCROW_HELD_STATUSES: RentalStatus[] = [
    'awaiting_confirmation',
    'confirmed',
    'disputed',
];

export type EscrowRental = Rental & {
    property?: {
        id: string;
        title: string;
        location: string;
        images: string[];
        [key: string]: any;
    } | null;
    owner?: {
        id: string;
        first_name: string;
        last_name: string;
    } | null;
};

export const useTenantRentals = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['tenant-rentals', user?.id],
        queryFn: async (): Promise<EscrowRental[]> => {
            if (!user) return [];
            const { data: rows, error } = await supabase
                .from('rentals')
                .select(
                    '*, property:properties(*), owner:users!owner_id(id, first_name, last_name)'
                )
                .eq('renter_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (rows || []) as EscrowRental[];
        },
        enabled: !!user,
    });

    const refresh = async () => {
        await refetch();
        queryClient.invalidateQueries({ queryKey: ['badge-unreleased-escrow'] });
    };

    return {
        rentals: (data ?? []) as EscrowRental[],
        loading: isLoading,
        refresh,
    };
};

// Lightweight count used for the red badge on the Escrow tab icon
export const useUnreleasedEscrowCount = () => {
    const { user } = useAuth();

    const { data } = useQuery({
        queryKey: ['badge-unreleased-escrow', user?.id],
        queryFn: async () => {
            if (!user) return 0;
            const { count, error } = await supabase
                .from('rentals')
                .select('id', { count: 'exact', head: true })
                .eq('renter_id', user.id)
                .in('status', ESCROW_HELD_STATUSES);
            return error ? 0 : (count ?? 0);
        },
        enabled: !!user,
        staleTime: 30_000,
    });

    return data ?? 0;
};
