import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';

export const useBioData = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { refreshBiodataStatus, user } = useAuth();

    const submitBioData = async (formData: any): Promise<{ error: string | null; data?: any }> => {
        setIsSubmitting(true);
        try {
            const firstName = (formData.first_name || '').trim();
            const lastName = (formData.last_name || '').trim();
            const profilePhoto = (formData.profile_photo || '').trim();

            // Direct local user table update defense-in-depth
            if (user?.id) {
                const directPayload: Record<string, any> = { completed_biodata: true };
                if (firstName) directPayload.first_name = firstName;
                if (lastName) directPayload.last_name = lastName;
                if (profilePhoto && !profilePhoto.startsWith('file://')) directPayload.profile_photo = profilePhoto;

                try {
                    await supabase.from('users').update(directPayload).eq('id', user.id);
                } catch (dbErr) {
                    console.warn('[useBioData] Direct pre-update notice:', dbErr);
                }
            }

            // Call submit-biodata edge function (handles admin upserts, metadata, paystack subaccount)
            const result = await callEdgeFunction('submit-biodata', 'POST', {
                ...formData,
                first_name: firstName,
                last_name: lastName,
                profile_photo: profilePhoto,
            });

            // Immediately sync completed_biodata in AuthContext from DB
            // so _layout.tsx will route the user to the dashboard
            await refreshBiodataStatus();

            return { error: null, data: result };
        } catch (e: any) {
            const err = await handleError(e);
            return { error: err.message || 'Failed to submit biodata' };
        } finally {
            setIsSubmitting(false);
        }
    };

    return { submitBioData, isSubmitting };
};
