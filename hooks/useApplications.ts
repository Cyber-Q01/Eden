// hooks/useApplications.ts
import { useState } from 'react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type ApplicationStatus = 'pending' | 'accepted' | 'declined';

export type Application = {
  id: string;
  property_id: string;
  renter_id: string;
  owner_id: string;
  move_in_date: string;
  message: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  property?: {
    id: string;
    title: string;
    location: string;
    type: string;
    price: number;
    images: string[];
  };
  renter?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    profile_photo?: string;
    phone_number?: string;
  };
  owner?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    profile_photo?: string;
    phone_number?: string;
  };
};

const EMPTY_ARRAY: any[] = [];

export const useApplicationDetails = (applicationId: string | null) => {
  const { user } = useAuth();
  const { showError } = useToast();

  const { data: application, isLoading: loading, refetch } = useQuery({
    queryKey: ['application', applicationId],
    queryFn: async () => {
      if (!user || !applicationId) return null;
      try {
        const { data: appData, error: fetchError } = await supabase
          .from('property_applications')
          .select('*')
          .eq('id', applicationId)
          .single();

        if (fetchError) throw fetchError;

        if (appData) {
          const { data: propData } = await supabase.from('properties').select('*').eq('id', appData.property_id).single();
          appData.property = propData;

          const [renterRes, ownerRes] = await Promise.all([
            supabase.functions.invoke('get-user-profile', { body: { userId: appData.renter_id } }),
            supabase.functions.invoke('get-user-profile', { body: { userId: appData.owner_id } })
          ]);

          appData.renter = renterRes.data;
          appData.owner = ownerRes.data;
          return appData as Application;
        }
        return null;
      } catch (e) {
        const err = await handleError(e);
        showError(err);
        throw e;
      }
    },
    enabled: !!(user && applicationId)
  });

  const fetchDetails = async () => {
    const res = await refetch();
    return res.data;
  };

  return { application, loading, refetch: fetchDetails };
};

export const useMyApplications = () => {
  const { user, role } = useAuth();
  const { showError } = useToast();
  const queryClient = useQueryClient();

  const { data: applications, isLoading: loading, isError: error, refetch } = useQuery({
    queryKey: ['my-applications', user?.id],
    queryFn: async () => {
      if (!user || role !== 'TENANT') return [];
      try {
        const data = await callEdgeFunction<Application[]>(
          'submit-application',
          'POST',
          { role: 'tenant', action: 'list' }
        );
        return data ?? [];
      } catch (e) {
        const err = await handleError(e);
        showError(err);
        throw e;
      }
    },
    enabled: !!(user && role === 'TENANT')
  });

  const fetchApplications = async () => {
    const res = await refetch();
    return res.data ?? [];
  };

  const submitApplication = async (
    propertyId: string,
    moveInDate: string,
    message: string
  ): Promise<{ error: string | null }> => {
    try {
      await callEdgeFunction('submit-application', 'POST', {
        property_id: propertyId,
        move_in_date: moveInDate,
        message,
      });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      return { error: null };
    } catch (e: any) {
      const err = await handleError(e);
      showError(err);
      return { error: err.message };
    }
  };

  return {
    applications: applications ?? EMPTY_ARRAY,
    loading,
    error,
    submitApplication,
    refetch: fetchApplications,
  };
};

export const useLandlordApplications = () => {
  const { user, role } = useAuth();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const [responding, setResponding] = useState(false);

  const { data: applications, isLoading: loading, isError: error, refetch } = useQuery({
    queryKey: ['landlord-applications', user?.id],
    queryFn: async () => {
      if (!user || role !== 'LANDLORD') return [];
      try {
        const data = await callEdgeFunction<Application[]>(
          'submit-application',
          'POST',
          { role: 'landlord', action: 'list' }
        );
        return data ?? [];
      } catch (e) {
        const err = await handleError(e);
        showError(err);
        throw e;
      }
    },
    enabled: !!(user && role === 'LANDLORD')
  });

  const fetchApplications = async () => {
    const res = await refetch();
    return res.data ?? [];
  };

  const respondToApplication = async (
    applicationId: string,
    action: 'accept' | 'decline'
  ): Promise<{ error: string | null; rental_reference?: string }> => {
    setResponding(true);
    try {
      const data = await callEdgeFunction<{ rental_reference?: string }>(
        'respond-to-application',
        'POST',
        {
          application_id: applicationId,
          action,
        }
      );
      showSuccess(
        action === 'accept'
          ? 'Application accepted! The tenant can now pay.'
          : 'Application declined.'
      );
      queryClient.invalidateQueries({ queryKey: ['landlord-applications'] });
      return { error: null, rental_reference: data?.rental_reference };
    } catch (e: any) {
      const err = await handleError(e);
      showError(err);
      return { error: err.message };
    } finally {
      setResponding(false);
    }
  };

  return {
    applications: applications ?? EMPTY_ARRAY,
    loading,
    responding,
    error,
    respondToApplication,
    refetch: fetchApplications,
  };
};

export const useOwnerApplications = useLandlordApplications;