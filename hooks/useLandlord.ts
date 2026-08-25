import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const withTimeout = <T>(promise: Promise<T> | PromiseLike<T>, ms: number = 60000): Promise<T> => {
    return Promise.race([
        Promise.resolve(promise),
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Storage upload timed out after ${ms / 1000}s. Please check your connection.`)), ms))
    ]);
};

export interface LandlordStats {
    earnings: string;
    activeCount: number;
    tenantCount: number;
    pendingRequests: number;
    bookingCount?: number;
    monthlyEarnings: number[];
    totalCollected: number;
    amountPaid: number;
    amountPending: number;
    last6MonthsTotal: number;
    thisMonthEarnings: number;
    rating?: number;
}

export const useLandlord = () => {
    const { user, role, delegatedLandlordId } = useAuth();
    const { showError, showSuccess } = useToast();
    const queryClient = useQueryClient();

    const { data, isLoading: loading, isError: error, refetch: fetchDashboardData } = useQuery({
        queryKey: ['landlord-properties-v5', user?.id, role, delegatedLandlordId],
        queryFn: async () => {
            if (!user) return null;
            try {
                const response = await callEdgeFunction<{ 
                    listings: any[]; 
                    stats: LandlordStats;
                    applications?: any[];
                    rentals?: any[];
                    payouts?: any[];
                    isAgent?: boolean;
                }>('landlord-properties', 'GET');
                return response;
            } catch (e) {
                const err = await handleError(e);
                showError(err);
                throw e;
            }
        },
        enabled: !!user,
        staleTime: 1000 * 30, // 30 seconds fresh cache
    });

    const stats: LandlordStats = data?.stats ?? { 
        earnings: '₦0.00', 
        activeCount: 0, 
        tenantCount: 0, 
        pendingRequests: 0, 
        bookingCount: 0,
        monthlyEarnings: Array(12).fill(0),
        totalCollected: 0,
        amountPaid: 0,
        amountPending: 0,
        last6MonthsTotal: 0,
        thisMonthEarnings: 0,
        rating: 0,
    };
    const activeListings = data?.listings ?? [];
    const applications = data?.applications ?? [];
    const rentals = data?.rentals ?? [];
    const payouts = data?.payouts ?? [];

    const addProperty = async (propertyData: any, imageUris: string[], videoUri?: string) => {
        if (!user) return { error: 'Not authorized' };

        try {
            console.log('[addProperty] Starting process with', imageUris.length, 'images and', videoUri ? 'a video' : 'no video');

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

            // 2. Insert property via Edge Function & Supabase
            console.log('[addProperty] Images uploaded. Calling add-property edge function...');
            const response = await callEdgeFunction('add-property', 'POST', {
                ...propertyData,
                moderation_status: 'pending',
                images: uploadedUrls,
                video_url: null, // Will be updated via background upload
            });

            // 2b. Guarantee the new property is in the PENDING moderation state immediately,
            // even if the deployed edge function does not persist moderation_status.
            try {
                if (response?.id) {
                    await supabase
                        .from('properties')
                        .update({ moderation_status: 'pending', rejection_reason: null })
                        .eq('id', response.id);
                }
            } catch (modErr) {
                console.warn('[addProperty] Could not force pending status:', modErr);
            }

            // 3. Dispatch background video upload if videoUri exists
            if (videoUri) {
                console.log(`[addProperty] Dispatching background video upload...`);
                // We do NOT await this promise, allowing it to run in the background
                (async () => {
                    try {
                        const base64 = await FileSystem.readAsStringAsync(videoUri, { encoding: FileSystem.EncodingType.Base64 });
                        const ext = videoUri.split('.').pop() || 'mp4';
                        const fileName = `${user.id}-${Date.now()}-${Math.random()}.${ext}`;
                        const arrayBuffer = decode(base64);

                        const { data, error: uploadError } = await supabase.storage
                            .from('property-videos')
                            .upload(fileName, arrayBuffer, {
                                contentType: `video/${ext}`,
                                upsert: false
                            });

                        if (uploadError) {
                            console.error('[Background Video Upload] Error:', uploadError);
                            return;
                        }

                        if (data && response?.id) {
                            const { data: publicUrlData } = supabase.storage
                                .from('property-videos')
                                .getPublicUrl(data.path);
                            
                            // Update the property with the video URL
                            await supabase
                                .from('properties')
                                .update({ video_url: publicUrlData.publicUrl })
                                .eq('id', response.id);
                                
                            console.log('[Background Video Upload] Success. Property updated.');
                        }
                    } catch (err) {
                        console.error('[Background Video Upload] Exception:', err);
                    }
                })();
            }

            console.log('[addProperty] Property listed successfully!');
            showSuccess('Property listed successfully');
            // Refresh the landlord listings (correct query key) so the new
            // property appears in the Pending filter immediately.
            queryClient.invalidateQueries({ queryKey: ['landlord-properties-v5'] });
            return { error: null };
        } catch (e: any) {
            console.error('[addProperty] Exception caught:', e);
            const err = await handleError(e);
            showError(err);
            return { error: err.message };
        }
    };

    const updateProperty = async (propertyId: string, propertyData: any, imageUris: string[], videoUri?: string) => {
        if (!user) return { error: 'Not authorized' };

        try {
            console.log('[updateProperty] Starting update for', propertyId);

            // ── HARD GUARD: listings pending admin approval cannot be edited ──
            // This is the single funnel every edit path goes through, so the
            // rule holds no matter which screen the edit was started from.
            try {
                const { data: currentRow } = await supabase
                    .from('properties')
                    .select('moderation_status')
                    .eq('id', propertyId)
                    .maybeSingle();

                const currentStatus = (currentRow?.moderation_status || '').toLowerCase();
                if (currentStatus === 'pending') {
                    showError({
                        type: 'unknown',
                        title: 'Listing Under Review',
                        message: 'This property is pending admin approval and cannot be edited. Please wait for the moderation review to complete.',
                    });
                    return { error: 'Property is pending moderation and cannot be edited' };
                }
            } catch (statusCheckErr) {
                // If the status check itself fails, continue — don't break normal edits
                console.warn('[updateProperty] Moderation status check failed, continuing:', statusCheckErr);
            }

            // Separate existing remote URLs from new local URIs
            const existingUrls = imageUris.filter(uri => uri.startsWith('http'));
            const newLocalUris = imageUris.filter(uri => !uri.startsWith('http'));

            const uploadedUrls = [...existingUrls];

            // 1. Upload new images if any
            for (let i = 0; i < newLocalUris.length; i++) {
                const uri = newLocalUris[i];
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    uri,
                    [{ resize: { width: 1080 } }],
                    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
                );

                const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, { encoding: FileSystem.EncodingType.Base64 });
                const ext = 'jpg';
                const fileName = `${user.id}-${Date.now()}-${Math.random()}.${ext}`;
                const arrayBuffer = decode(base64);

                const { data, error: uploadError } = await withTimeout<any>(supabase.storage
                    .from('property-images')
                    .upload(fileName, arrayBuffer, {
                        contentType: `image/${ext}`,
                        upsert: false
                    }));

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('property-images')
                    .getPublicUrl(data.path);

                uploadedUrls.push(publicUrlData.publicUrl);
            }

            let finalVideoUrl = undefined;
            if (videoUri && videoUri.startsWith('http')) {
                finalVideoUrl = videoUri;
            }

            // 2. Update property via Edge Function & direct Supabase sync
            try {
                await callEdgeFunction('add-property', 'PUT', {
                    ...propertyData,
                    id: propertyId,
                    moderation_status: 'pending',
                    rejection_reason: null,
                    images: uploadedUrls,
                    ...(finalVideoUrl !== undefined && { video_url: finalVideoUrl }),
                    ...(videoUri === null && { video_url: null }),
                });
            } catch (efErr) {
                console.warn('[updateProperty] Edge function notice, running direct update:', efErr);
            }

            // Always ensure Supabase database record has moderation_status = 'pending'
            await supabase
                .from('properties')
                .update({
                    ...propertyData,
                    moderation_status: 'pending',
                    rejection_reason: null,
                    images: uploadedUrls,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', propertyId);

            // 3. Dispatch background video upload if new videoUri
            if (videoUri && !videoUri.startsWith('http')) {
                console.log(`[updateProperty] Dispatching background video upload...`);
                (async () => {
                    try {
                        const base64 = await FileSystem.readAsStringAsync(videoUri, { encoding: FileSystem.EncodingType.Base64 });
                        const ext = videoUri.split('.').pop() || 'mp4';
                        const fileName = `${user.id}-${Date.now()}-${Math.random()}.${ext}`;
                        const arrayBuffer = decode(base64);

                        const { data, error: uploadError } = await supabase.storage
                            .from('property-videos')
                            .upload(fileName, arrayBuffer, {
                                contentType: `video/${ext}`,
                                upsert: false
                            });

                        if (uploadError) {
                            console.error('[Background Video Upload] Error:', uploadError);
                            return;
                        }

                        if (data) {
                            const { data: publicUrlData } = supabase.storage
                                .from('property-videos')
                                .getPublicUrl(data.path);
                            
                            await supabase
                                .from('properties')
                                .update({ video_url: publicUrlData.publicUrl })
                                .eq('id', propertyId);
                                
                            console.log('[Background Video Upload] Success. Property updated.');
                        }
                    } catch (err) {
                        console.error('[Background Video Upload] Exception:', err);
                    }
                })();
            }

            showSuccess('Property updated successfully');
            // Refresh the landlord listings (correct query key) so the edited
            // property immediately moves back into the Pending filter.
            queryClient.invalidateQueries({ queryKey: ['landlord-properties-v5'] });
            return { error: null };
        } catch (e: any) {
            const err = await handleError(e);
            showError(err);
            return { error: err.message };
        }
    };

    const deleteProperty = async (propertyId: string) => {
        console.log('[deleteProperty] Called with propertyId:', propertyId);
        console.log('[deleteProperty] Current user:', user?.id, '| role:', role);

        if (!user) {
            console.warn('[deleteProperty] No user found, aborting.');
            return;
        }

        if (role === 'AGENT') {
            console.warn('[deleteProperty] Agent tried to delete — blocked.');
            showError({ type: 'error', title: 'Action Prohibited', message: 'Agents are not allowed to delete property listings.' });
            return;
        }
        
        try {
            console.log('[deleteProperty] Calling edge function landlord-properties DELETE...');
            const result = await callEdgeFunction('landlord-properties', 'DELETE', { property_id: propertyId });
            console.log('[deleteProperty] Edge function response:', JSON.stringify(result));

            showSuccess('Property deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['landlord-properties-v5'] });
            console.log('[deleteProperty] Query cache invalidated.');
        } catch (e: any) {
            console.error('[deleteProperty] Exception caught:', e?.message ?? e);
            const err = await handleError(e);
            showError(err);
        }
    };

    return { stats, activeListings, applications, loading, error, addProperty, updateProperty, deleteProperty, refetch: fetchDashboardData };
};
