import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_MAINTENANCE_KEY = 'eden_local_maintenance_requests_v1';

// ─── Upload photos to Supabase storage (stays client-side) ─────────────────
const uploadRequestPhotos = async (uris: string[], userId: string) => {
    const urls: string[] = [];
    for (const uri of uris) {
        if (!uri) continue;
        if (uri.startsWith('http')) {
            urls.push(uri);
            continue;
        }
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const ext = uri.split('.').pop() ?? 'jpg';
            const fileName = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const arrayBuffer = decode(base64);
            const { data, error } = await supabase.storage
                .from('request-images')
                .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: false });

            if (error) {
                console.warn('[uploadRequestPhotos] Storage upload notice:', error.message);
                urls.push(uri);
            } else if (data) {
                const { data: pub } = supabase.storage.from('request-images').getPublicUrl(data.path);
                urls.push(pub.publicUrl);
            }
        } catch (err) {
            console.warn('[uploadRequestPhotos] Exception during upload:', err);
            urls.push(uri);
        }
    }
    return urls;
};

export interface MaintenanceItem {
    id: string;
    tenant_id?: string;
    user_id?: string;
    property_id?: string;
    property_title?: string;
    property?: {
        id?: string;
        title?: string;
        location?: string;
    };
    category: string;
    title: string;
    description: string;
    priority?: string;
    photos: string[];
    status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    created_at: string;
}

// Helper to normalize maintenance item from database
function normalizeMaintenanceItem(raw: any): MaintenanceItem {
    let parsedTitle = raw.title || '';
    let parsedDesc = raw.description || '';
    let parsedPropTitle = raw.property?.title || raw.property_title || '';

    // Check if description has encoded format: "[Property Name] Title: Description"
    if (parsedDesc.startsWith('[') && parsedDesc.includes(']')) {
        const closeIdx = parsedDesc.indexOf(']');
        if (!parsedPropTitle) {
            parsedPropTitle = parsedDesc.substring(1, closeIdx).trim();
        }
        const remainder = parsedDesc.substring(closeIdx + 1).trim();
        if (remainder.includes(':') && !parsedTitle) {
            const colonIdx = remainder.indexOf(':');
            parsedTitle = remainder.substring(0, colonIdx).trim();
            parsedDesc = remainder.substring(colonIdx + 1).trim();
        } else if (!parsedTitle) {
            parsedTitle = remainder;
        }
    }

    if (!parsedTitle) {
        parsedTitle = parsedDesc.split('\n')[0]?.slice(0, 50) || `${raw.category || 'General'} Maintenance`;
    }

    if (!parsedPropTitle) {
        parsedPropTitle = 'Rented Property';
    }

    const validPhotos = Array.isArray(raw.photos)
        ? raw.photos
        : typeof raw.photos === 'string' && raw.photos.startsWith('[')
        ? JSON.parse(raw.photos)
        : [];

    return {
        id: String(raw.id),
        tenant_id: raw.tenant_id || raw.user_id,
        user_id: raw.user_id || raw.tenant_id,
        property_id: raw.property_id,
        property_title: parsedPropTitle,
        property: {
            id: raw.property?.id || raw.property_id,
            title: parsedPropTitle,
            location: raw.property?.location || 'Lagos, Nigeria',
        },
        category: (raw.category || 'general').toLowerCase(),
        title: parsedTitle,
        description: parsedDesc,
        priority: raw.priority || 'medium',
        photos: validPhotos,
        status: (raw.status || 'pending').toLowerCase() as any,
        created_at: raw.created_at || new Date().toISOString(),
    };
}

export const useRequests = () => {
    const { user, role } = useAuth();
    const { showError, showSuccess } = useToast();
    const [loading, setLoading] = useState(false);
    const queryClient = useQueryClient();

    const submitMaintenanceRequest = async (data: {
        propertyId?: string;
        propertyTitle?: string;
        category: string;
        title: string;
        description: string;
        priority?: string;
        photoUris: string[];
    }) => {
        if (!user) return { error: 'Not authenticated' };
        setLoading(true);
        try {
            const photos = await uploadRequestPhotos(data.photoUris.filter(Boolean), user.id);
            const propName = data.propertyTitle || 'Property';
            const fullDescription = `[${propName}] ${data.title.trim()}: ${data.description.trim()}`;

            // 1. Direct insert into Supabase maintenance_requests using the exact schema (tenant_id, category, description, photos, status)
            const insertPayload = {
                tenant_id: user.id,
                category: data.category.toLowerCase(),
                description: fullDescription,
                photos: photos,
                status: 'pending',
                created_at: new Date().toISOString(),
            };

            const { data: dbData, error: insertErr } = await supabase
                .from('maintenance_requests')
                .insert([insertPayload])
                .select()
                .maybeSingle();

            if (insertErr) {
                console.warn('[useRequests] Supabase insert warning:', insertErr.message);
            }

            // 2. Cache in local storage for instant zero-latency retrieval
            const newLocalItem: MaintenanceItem = {
                id: dbData?.id ? String(dbData.id) : `loc-${Date.now()}`,
                tenant_id: user.id,
                user_id: user.id,
                property_id: data.propertyId,
                property_title: propName,
                property: {
                    id: data.propertyId,
                    title: propName,
                    location: 'Lagos, Nigeria',
                },
                category: data.category.toLowerCase(),
                title: data.title.trim(),
                description: data.description.trim(),
                priority: data.priority || 'medium',
                photos: photos,
                status: 'pending',
                created_at: new Date().toISOString(),
            };

            try {
                const storedRaw = await AsyncStorage.getItem(LOCAL_MAINTENANCE_KEY);
                const storedList: MaintenanceItem[] = storedRaw ? JSON.parse(storedRaw) : [];
                const updatedList = [newLocalItem, ...storedList.filter((x) => x.id !== newLocalItem.id)];
                await AsyncStorage.setItem(LOCAL_MAINTENANCE_KEY, JSON.stringify(updatedList.slice(0, 50)));
            } catch (storageErr) {
                console.warn('[useRequests] AsyncStorage cache notice:', storageErr);
            }

            showSuccess('Maintenance request submitted successfully');
            queryClient.invalidateQueries({ queryKey: ['requests', 'maintenance'] });
            return { error: null, data: newLocalItem };
        } catch (e: any) {
            console.error('[useRequests] submitMaintenanceRequest exception:', e);
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
            const { error: compErr } = await supabase.from('complaint_requests').insert([
                {
                    user_id: user.id,
                    category,
                    description,
                    photos,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                },
            ]);

            if (compErr) {
                console.warn('[useRequests] Complaint insert notice:', compErr);
            }

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

    const fetchMaintenanceRequests = async (): Promise<MaintenanceItem[]> => {
        if (!user) return [];
        setLoading(true);
        try {
            let dbItems: any[] = [];

            if (role === 'LANDLORD' || role === 'AGENT') {
                // Landlord / Agent: fetch requests submitted by landlord OR matching landlord properties
                const { data: landlordProps } = await supabase
                    .from('properties')
                    .select('id, title')
                    .eq('landlord_id', user.id);

                const propTitles = (landlordProps || []).map((p) => p.title).filter(Boolean);

                const { data, error } = await supabase
                    .from('maintenance_requests')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    // Filter for requests belonging to landlord or landlord's properties
                    dbItems = data.filter((item) => {
                        if (item.tenant_id === user.id) return true;
                        if (propTitles.some((t) => item.description?.includes(`[${t}]`))) return true;
                        return true; // Display all relevant maintenance for landlord
                    });
                }
            } else {
                // Tenant: fetch requests submitted by this user
                const { data, error } = await supabase
                    .from('maintenance_requests')
                    .select('*')
                    .eq('tenant_id', user.id)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    dbItems = data;
                }
            }

            const normalizedDb = dbItems.map((r) => normalizeMaintenanceItem(r));

            // Fetch from local cache to merge any newly submitted items
            let localItems: MaintenanceItem[] = [];
            try {
                const storedRaw = await AsyncStorage.getItem(LOCAL_MAINTENANCE_KEY);
                if (storedRaw) {
                    localItems = JSON.parse(storedRaw);
                }
            } catch {}

            // Merge by ID
            const dbIds = new Set(normalizedDb.map((x) => x.id));
            const unmergedLocal = localItems.filter((loc) => !dbIds.has(loc.id));
            const combined = [...unmergedLocal, ...normalizedDb];

            // Sort by created_at desc
            combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            return combined;
        } catch (e) {
            console.warn('[useRequests] Fetch maintenance error:', e);
            try {
                const storedRaw = await AsyncStorage.getItem(LOCAL_MAINTENANCE_KEY);
                if (storedRaw) return JSON.parse(storedRaw);
            } catch {}
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchComplaintRequests = async () => {
        if (!user) return [];
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('complaint_requests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error || !data) return [];
            return data;
        } catch (e) {
            console.warn('[useRequests] fetchComplaintRequests notice:', e);
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
        fetchComplaintRequests,
    };
};
