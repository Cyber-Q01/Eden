import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { useQueryClient } from '@tanstack/react-query';

// ─── Upload photos to Supabase storage (stays client-side) ─────────────────
const uploadRequestPhotos = async (uris: string[], userId: string) => {
    const urls: string[] = [];
    for (const uri of uris) {
        if (!uri) continue;
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const ext = uri.split('.').pop() ?? 'jpg';
        const fileName = `${userId}-${Date.now()}-${Math.random()}.${ext}`;
        const arrayBuffer = decode(base64);
        const { data, error } = await supabase.storage
            .from('request-images')
            .upload(fileName, arrayBuffer, { contentType: `image/${ext}` });
        if (error) throw error;
        if (data) {
            const { data: pub } = supabase.storage.from('request-images').getPublicUrl(data.path);
            urls.push(pub.publicUrl);
        }
    }
    return urls;
};

export const useRequests = () => {
    const { user } = useAuth();
    const { showError, showSuccess } = useToast();
    const [loading, setLoading] = useState(false);
    const queryClient = useQueryClient();

    const submitMaintenanceRequest = async (category: string, description: string, photoUris: string[]) => {
        if (!user) return { error: 'Not authenticated' };
        setLoading(true);
        try {
            const photos = await uploadRequestPhotos(photoUris.filter(Boolean), user.id);
            await callEdgeFunction('requests', 'POST', {
                type: 'maintenance',
                category,
                description,
                photos,
            });
            showSuccess('Maintenance request submitted successfully');
            queryClient.invalidateQueries({ queryKey: ['requests', 'maintenance'] });
            return { error: null };
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return { error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const submitComplaintRequest = async (category: string, description: string, photoUris: string[]) => {
        if (!user) return { error: 'Not authenticated' };
        setLoading(true);
        try {
            const photos = await uploadRequestPhotos(photoUris.filter(Boolean), user.id);
            await callEdgeFunction('requests', 'POST', {
                type: 'complaint',
                category,
                description,
                photos,
            });
            showSuccess('Complaint submitted successfully');
            queryClient.invalidateQueries({ queryKey: ['requests', 'complaint'] });
            return { error: null };
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return { error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const fetchMaintenanceRequests = async () => {
        if (!user) return [];
        setLoading(true);
        try {
            return await queryClient.fetchQuery({
                queryKey: ['requests', 'maintenance', user.id],
                queryFn: async () => {
                    const data = await callEdgeFunction('requests', 'GET', null, { type: 'maintenance' });
                    return data || [];
                }
            });
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchComplaintRequests = async () => {
        if (!user) return [];
        setLoading(true);
        try {
            return await queryClient.fetchQuery({
                queryKey: ['requests', 'complaint', user.id],
                queryFn: async () => {
                    const data = await callEdgeFunction('requests', 'GET', null, { type: 'complaint' });
                    return data || [];
                }
            });
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return [];
        } finally {
            setLoading(false);
        }
    };

    return { 
        loading, 
        submitMaintenanceRequest, 
        submitComplaintRequest, 
        fetchMaintenanceRequests, 
        fetchComplaintRequests 
    };
};
