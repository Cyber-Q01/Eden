import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';

const withTimeout = <T>(promise: Promise<T> | PromiseLike<T>, ms: number = 60000): Promise<T> => {
    return Promise.race([
        Promise.resolve(promise),
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Storage upload timed out after ${ms / 1000}s. Please check your connection.`)), ms))
    ]);
};

export const useLandlord = () => {
    const { user } = useAuth();
    const { showError, showSuccess } = useToast();
    const [stats, setStats] = useState({ earnings: 'N0', activeCount: 0 });
    const [activeListings, setActiveListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchDashboardData = async () => {
        if (!user) return;
        setLoading(true);
        setError(false);
        try {
            const data = await callEdgeFunction<{ listings: any[]; stats: { earnings: string; activeCount: number } }>(
                'landlord-properties', 'GET'
            );
            setActiveListings(data.listings ?? []);
            setStats(data.stats ?? { earnings: 'N0', activeCount: 0 });
        } catch (e) {
            setError(true);
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const addProperty = async (propertyData: any, imageUris: string[]) => {
        if (!user) return { error: 'Not authorized' };

        try {
            console.log('[addProperty] Starting process with', imageUris.length, 'images');

            // 1. Compress & upload images to Supabase Storage (stays client-side)
            const uploadedUrls = [];
            for (let i = 0; i < imageUris.length; i++) {
                const uri = imageUris[i];
                console.log(`[addProperty] Compressing image ${i + 1}/${imageUris.length}...`);

                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    uri,
                    [{ resize: { width: 1080 } }],
                    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
                );

                console.log(`[addProperty] Reading image ${i + 1}/${imageUris.length}...`);
                const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, { encoding: FileSystem.EncodingType.Base64 });
                console.log(`[addProperty] Base64 size: ${(base64.length / 1024 / 1024).toFixed(2)} MB`);
                const ext = 'jpg'; // Always JPEG after manipulation
                const fileName = `${user.id}-${Date.now()}-${Math.random()}.${ext}`;
                const arrayBuffer = decode(base64);

                console.log(`[addProperty] Uploading image ${fileName} to Supabase Storage...`);
                const { data, error: uploadError } = await withTimeout<any>(supabase.storage
                    .from('property-images')
                    .upload(fileName, arrayBuffer, {
                        contentType: `image/${ext}`,
                        upsert: false
                    }));

                if (uploadError) {
                    console.error('[addProperty] Upload error:', uploadError);
                    throw uploadError;
                }

                const { data: publicUrlData } = supabase.storage
                    .from('property-images')
                    .getPublicUrl(data.path);

                console.log(`[addProperty] Upload success. Public URL:`, publicUrlData.publicUrl);
                uploadedUrls.push(publicUrlData.publicUrl);
            }

            // 2. Insert property via Edge Function
            console.log('[addProperty] All images uploaded. Calling add-property edge function...');
            await callEdgeFunction('add-property', 'POST', {
                ...propertyData,
                images: uploadedUrls,
            });

            console.log('[addProperty] Property listed successfully!');
            showSuccess('Property listed successfully');
            fetchDashboardData();
            return { error: null };
        } catch (e: any) {
            console.error('[addProperty] Exception caught:', e);
            const err = await handleError(e);
            showError(err);
            return { error: err.message };
        }
    };

    return { stats, activeListings, loading, error, addProperty, refetch: fetchDashboardData };
};
