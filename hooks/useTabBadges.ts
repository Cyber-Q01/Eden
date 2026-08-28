// hooks/useTabBadges.ts
// Red counter badges for the tenant bottom tabs.
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useUnreleasedEscrowCount } from './useEscrow';

// Pending applications only — the number of applications still waiting for an answer
export const usePendingApplicationsCount = () => {
    const { user } = useAuth();

    const { data } = useQuery({
        queryKey: ['badge-pending-applications', user?.id],
        queryFn: async () => {
            if (!user) return 0;
            const { count, error } = await supabase
                .from('property_applications')
                .select('id', { count: 'exact', head: true })
                .eq('renter_id', user.id)
                .eq('status', 'pending');
            return error ? 0 : (count ?? 0);
        },
        enabled: !!user,
        staleTime: 30_000,
        // The tab layout stays mounted, so without an interval the badge would go
        // permanently stale (e.g. owner accepts/declines from their device).
        refetchInterval: 30_000,
    });

    return data ?? 0;
};

export const useTabBadges = () => {
    const pendingApplications = usePendingApplicationsCount();
    const unreleasedEscrow = useUnreleasedEscrowCount();

    return {
        pendingApplications,
        unreleasedEscrow,
    };
};
