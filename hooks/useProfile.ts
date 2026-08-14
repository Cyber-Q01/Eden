import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';

export const useProfile = () => {
    const { user } = useAuth();
    const router = useRouter();
    const { showError, showSuccess } = useToast();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchProfile = async () => {
        if (!user) return;
        setLoading(true);
        setError(false);
        try {
            // Fetch main profile from edge function
            const data = await callEdgeFunction('profile', 'GET');

            // Also fetch user_biodata directly (Supabase client has the join)
            const { data: biodataRow } = await supabase
                .from('user_biodata')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (data) {
                // Merge biodata so both access patterns work:
                //   profile?.profile_photo  (flat)
                //   profile?.user_biodata?.profile_photo  (nested)
                setProfile({
                    ...data,
                    user_biodata: biodataRow ?? null,
                    profile_photo: biodataRow?.profile_photo ?? data?.profile_photo ?? user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? user?.user_metadata?.profile_photo ?? null,
                    phone: biodataRow?.phone_number ?? data?.phone ?? null,
                    gender: biodataRow?.gender ?? data?.gender ?? null,
                });
            }
        } catch (e) {
            setError(true);
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [user]);

    const updateProfile = async (updates: any) => {
        if (!user) return { error: 'Not authenticated' };
        setLoading(true);
        try {
            await callEdgeFunction('profile', 'PUT', updates);
            await fetchProfile();
            showSuccess('Profile updated successfully');
            return { error: null };
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return { error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            router.replace('/auth/login');
        } catch (e) {
            const err = await handleError(e);
            showError(err);
        }
    };

    return { profile, loading, error, signOut, updateProfile, refetch: fetchProfile };
};
