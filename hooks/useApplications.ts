// hooks/useApplications.ts

import { useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';

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

// ── Shared: view single application details ──────────────────────────────

export const useApplicationDetails = (applicationId: string | null) => {
  const { user } = useAuth();
  const { showError } = useToast();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetails = async () => {
    if (!user || !applicationId) return;
    setLoading(true);
    try {
      const { data: appData, error: fetchError } = await supabase
        .from('property_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (fetchError) throw fetchError;

      if (appData) {
        // Fetch related property normally (usually has public RLS)
        const { data: propData } = await supabase.from('properties').select('*').eq('id', appData.property_id).single();
        appData.property = propData;

        // Fetch profiles via Edge Function to bypass RLS restrictions
        const [renterRes, ownerRes] = await Promise.all([
          supabase.functions.invoke('get-user-profile', { body: { userId: appData.renter_id } }),
          supabase.functions.invoke('get-user-profile', { body: { userId: appData.owner_id } })
        ]);

        appData.renter = renterRes.data;
        appData.owner = ownerRes.data;
        
        setApplication(appData);
      } else {
        setApplication(null);
      }
    } catch (e) {
      const err = await handleError(e);
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [applicationId, user]);

  return { application, loading, refetch: fetchDetails };
};

// ── Tenant: view own applications ──────────────────────────────────────────

export const useMyApplications = () => {
  const { user, role } = useAuth();
  const { showError } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchApplications = async () => {
    if (!user || role !== 'TENANT') return;
    setLoading(true);
    setError(false);
    try {
      const data = await callEdgeFunction<Application[]>(
        'submit-application',
        'POST',
        { role: 'tenant', action: 'list' }
      );
      setApplications(data ?? []);
    } catch (e) {
      setError(true);
      const err = await handleError(e);
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [user]);

  // hooks/useApplications.ts

  const submitApplication = async (
    propertyId: string,
    moveInDate: string,
    message: string
  ): Promise<{ error: string | null }> => {  // ✅ Removed requiresMembership
    try {
      await callEdgeFunction('submit-application', 'POST', {
        property_id: propertyId,
        move_in_date: moveInDate,
        message,
      });
      await fetchApplications();
      return { error: null };
    } catch (e: any) {
      const err = await handleError(e);
      showError(err);
      return { error: err.message };
    }
  };

  return {
    applications,
    loading,
    error,
    submitApplication,
    refetch: fetchApplications,
  };
};

// ── Landlord: view applications on their properties ───────────────────────────

export const useLandlordApplications = () => {
  const { user, role } = useAuth();
  const { showError, showSuccess } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState(false);

  const fetchApplications = async () => {
    if (!user || role !== 'LANDLORD') return;
    setLoading(true);
    setError(false);
    try {
      const data = await callEdgeFunction<Application[]>(
        'submit-application',
        'POST',
        { role: 'landlord', action: 'list' }
      );
      setApplications(data ?? []);
    } catch (e) {
      setError(true);
      const err = await handleError(e);
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [user]);

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
      await fetchApplications();
      return { error: null, rental_reference: data?.rental_reference };
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return { error: err.message };
    } finally {
      setResponding(false);
    }
  };

  return {
    applications,
    loading,
    responding,
    error,
    respondToApplication,
    refetch: fetchApplications,
  };
};

export const useOwnerApplications = useLandlordApplications;