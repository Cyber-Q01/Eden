import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';

export const useProperties = () => {
    const { showError } = useToast();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchProperties = async () => {
        setLoading(true);
        setError(false);
        try {
            const data = await callEdgeFunction<any[]>('properties', 'GET');
            setProperties(data ?? []);
        } catch (e) {
            setError(true);
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, []);

    return { properties, loading, error, refetch: fetchProperties };
};

export const useProperty = (id: string | string[] | undefined) => {
    const { showError } = useToast();
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchProperty = async () => {
        if (!id) {
            setLoading(false);
            return;
        }
        const propertyId = Array.isArray(id) ? id[0] : id;
        setLoading(true);
        setError(false);
        try {
            const data = await callEdgeFunction('property', 'GET', null, { id: propertyId });
            setProperty(data);
        } catch (e) {
            setError(true);
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperty();
    }, [id]);

    return { property, loading, error, refetch: fetchProperty };
};

export const useFavorites = () => {
    const { user } = useAuth();
    const { showError, showSuccess } = useToast();
    const [favorites, setFavorites] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const fetchFavorites = async () => {
        if (!user) return;
        setLoading(true);
        setError(false);
        try {
            const data = await callEdgeFunction<any[]>('favorites', 'GET');
            setFavorites(data ?? []);
        } catch (e) {
            setError(true);
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    const addFavorite = async (propertyId: string) => {
        if (!user) return;
        try {
            await callEdgeFunction('favorites', 'POST', { property_id: propertyId });
            showSuccess('Property saved to favorites');
            await fetchFavorites();
        } catch (e) {
            const err = await handleError(e);
            showError(err);
        }
    };

    const removeFavorite = async (propertyId: string) => {
        if (!user) return;
        try {
            await callEdgeFunction('favorites', 'DELETE', { property_id: propertyId });
            showSuccess('Property removed from favorites');
            await fetchFavorites();
        } catch (e) {
            const err = await handleError(e);
            showError(err);
        }
    };

    useEffect(() => {
        fetchFavorites();
    }, [user]);

    return { favorites, loading, error, addFavorite, removeFavorite, refetch: fetchFavorites };
};
