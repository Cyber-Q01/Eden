import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';

export const useBioData = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { refreshBiodataStatus } = useAuth();

    const submitBioData = async (formData: any): Promise<{ error: string | null }> => {
        setIsSubmitting(true);
        try {
            // callEdgeFunction throws on error, returns data on success
            await callEdgeFunction('submit-biodata', 'POST', formData);

            // Immediately sync completed_biodata in AuthContext from DB
            // so _layout.tsx will route the user to the dashboard
            await refreshBiodataStatus();

            return { error: null };
        } catch (e: any) {
            const err = await handleError(e);
            return { error: err.message || 'Failed to submit biodata' };
        } finally {
            setIsSubmitting(false);
        }
    };

    return { submitBioData, isSubmitting };
};
