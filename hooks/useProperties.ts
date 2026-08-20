import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useProperties = (filters?: {
    search?: string;
    type?: string;
    propertyTypes?: string[];
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
}) => {
    const { showError } = useToast();

    const queryInfo = useQuery({
        queryKey: ['properties', filters],
        queryFn: async () => {
            try {
                let list: any[] = [];
                try {
                    const data = await callEdgeFunction<any[]>('properties', 'GET', null, filters);
                    list = data ?? [];
                } catch (edgeErr) {
                    console.warn('[useProperties] Edge function failed, falling back to direct Supabase query:', edgeErr);
                    let query = supabase
                        .from('properties')
                        .select('*')
                        .eq('status', 'available');

                    if (filters?.search) {
                        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
                    }
                    if (filters?.location) {
                        query = query.or(`location.ilike.%${filters.location}%,state.ilike.%${filters.location}%,lga.ilike.%${filters.location}%`);
                    }
                    if (filters?.type && filters.type !== 'All') {
                        query = query.eq('type', filters.type);
                    }
                    if (filters?.propertyTypes && filters.propertyTypes.length > 0) {
                        query = query.in('type', filters.propertyTypes);
                    }
                    if (filters?.minPrice) {
                        query = query.gte('price', filters.minPrice);
                    }
                    if (filters?.maxPrice) {
                        query = query.lte('price', filters.maxPrice);
                    }

                    const { data: supaData } = await query.order('created_at', { ascending: false });
                    list = supaData ?? [];
                }

                // STRICT FILTER: Only approved/live listings display on tenant discovery side
                const approvedOnly = list.filter((p: any) => {
                    const mod = (p.moderation_status || '').toLowerCase().trim();
                    const status = (p.status || '').toLowerCase().trim();
                    // Must be available and approved/live (or legacy unmoderated)
                    const isApproved = mod === 'live' || mod === 'approved' || (!p.moderation_status && status === 'available');
                    const isNotBlocked = mod !== 'rejected' && mod !== 'pending' && mod !== 'flagged';
                    return isApproved && isNotBlocked;
                });

                return approvedOnly;
            } catch (e) {
                const err = await handleError(e);
                showError(err);
                throw e;
            }
        }
    });

    return { 
        properties: queryInfo.data ?? [], 
        loading: queryInfo.isLoading, 
        error: queryInfo.isError, 
        refetch: queryInfo.refetch 
    };
};

export const useProperty = (id: string | string[] | undefined) => {
    const { showError } = useToast();
    const propertyId = Array.isArray(id) ? id[0] : id;

    const queryInfo = useQuery({
        queryKey: ['property', propertyId],
        queryFn: async () => {
            if (!propertyId) return null;
            try {
                let data: any = null;
                try {
                    data = await callEdgeFunction('property', 'GET', null, { id: propertyId });
                    if (data) return data;
                } catch (edgeErr) {
                    console.warn('[useProperty] Edge function notice, querying direct Supabase property:', edgeErr);
                }

                // Direct Supabase fallback
                const { data: prop, error: propErr } = await supabase
                    .from('properties')
                    .select(`
                        *,
                        landlord:users!landlord_id(id, first_name, last_name, email, phone_number),
                        agent:users!agent_id(id, first_name, last_name, email, phone_number)
                    `)
                    .eq('id', propertyId)
                    .maybeSingle();

                if (propErr) throw propErr;
                if (!prop) return null;

                // Also fetch landlord/agent photos if available
                if (prop.landlord_id) {
                    const { data: bRow } = await supabase
                        .from('user_biodata')
                        .select('profile_photo, business_name')
                        .eq('id', prop.landlord_id)
                        .maybeSingle();
                    if (bRow && prop.landlord) {
                        prop.landlord.avatar_url = bRow.profile_photo;
                        prop.landlord.business_name = bRow.business_name;
                    }
                }
                if (prop.agent_id) {
                    const { data: bRow } = await supabase
                        .from('user_biodata')
                        .select('profile_photo, business_name')
                        .eq('id', prop.agent_id)
                        .maybeSingle();
                    if (bRow && prop.agent) {
                        prop.agent.avatar_url = bRow.profile_photo;
                        prop.agent.business_name = bRow.business_name;
                    }
                }

                return prop;
            } catch (e) {
                const err = await handleError(e);
                showError(err);
                throw e;
            }
        },
        enabled: !!propertyId
    });

    return { 
        property: queryInfo.data, 
        loading: queryInfo.isLoading, 
        error: queryInfo.isError, 
        refetch: queryInfo.refetch 
    };
};

export const useFavorites = () => {
    const { user } = useAuth();
    const { showError, showSuccess } = useToast();
    const queryClient = useQueryClient();

    const queryInfo = useQuery({
        queryKey: ['favorites', user?.id],
        queryFn: async () => {
            if (!user) return [];
            try {
                const data = await callEdgeFunction<any[]>('favorites', 'GET');
                return data ?? [];
            } catch (e) {
                const err = await handleError(e);
                showError(err);
                throw e;
            }
        },
        enabled: !!user
    });

    const addMutation = useMutation({
        mutationFn: async (propertyId: string) => {
            await callEdgeFunction('favorites', 'POST', { property_id: propertyId });
        },
        onSuccess: () => {
            showSuccess('Property saved to favorites');
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
        onError: async (e) => {
            const err = await handleError(e);
            showError(err);
        }
    });

    const removeMutation = useMutation({
        mutationFn: async (propertyId: string) => {
            await callEdgeFunction('favorites', 'DELETE', { property_id: propertyId });
        },
        onSuccess: () => {
            showSuccess('Property removed from favorites');
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
        onError: async (e) => {
            const err = await handleError(e);
            showError(err);
        }
    });

    return { 
        favorites: queryInfo.data ?? [], 
        loading: queryInfo.isLoading, 
        error: queryInfo.isError, 
        addFavorite: addMutation.mutateAsync, 
        removeFavorite: removeMutation.mutateAsync, 
        refetch: queryInfo.refetch 
    };
};
