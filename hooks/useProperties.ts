import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';
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
                const data = await callEdgeFunction<any[]>('properties', 'GET', null, filters);
                return data ?? [];
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
                const data = await callEdgeFunction('property', 'GET', null, { id: propertyId });
                return data;
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
