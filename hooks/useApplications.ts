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
    bedrooms?: number;
    bathrooms?: number;
  };
  renter?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    profile_photo?: string;
    phone_number?: string;
    user_biodata?: {
      phone_number?: string;
      profile_photo?: string;
    };
  };
  owner?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    profile_photo?: string;
    phone_number?: string;
    user_biodata?: {
      phone_number?: string;
      profile_photo?: string;
    };
  };
};

const EMPTY_ARRAY: any[] = [];

// Hard-delete a DECLINED application. Both the tenant side and the landlord side
// can delete — each side is only allowed to delete rows it is a party to.
const deleteApplicationById = async (
  applicationId: string,
  opts: {
    userId: string;
    isOwnerSide: boolean;
    queryClient: ReturnType<typeof useQueryClient>;
    showSuccess: (message: string) => void;
    showError: (error: { type?: any; title: string; message: string }) => void;
  }
): Promise<{ error: string | null }> => {
  try {
    const { data: row } = await supabase
      .from('property_applications')
      .select('status, renter_id, owner_id')
      .eq('id', applicationId)
      .maybeSingle();

    if (!row) return { error: 'Application not found' };
    if (row.status !== 'declined') return { error: 'Only declined applications can be deleted' };
    const allowed = opts.isOwnerSide
      ? row.owner_id === opts.userId
      : row.renter_id === opts.userId;
    if (!allowed) return { error: 'You can only delete applications you are involved in' };

    const { error: deleteError } = await supabase
      .from('property_applications')
      .delete()
      .eq('id', applicationId);
    if (deleteError) throw deleteError;

    opts.showSuccess('Application deleted');
    opts.queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    opts.queryClient.invalidateQueries({ queryKey: ['landlord-applications'] });
    opts.queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
    opts.queryClient.invalidateQueries({ queryKey: ['badge-pending-applications'] });
    return { error: null };
  } catch (e: any) {
    console.warn('[deleteApplication] notice:', e);
    const err = await handleError(e);
    opts.showError(err);
    return { error: err.message };
  }
};

export const useApplicationDetails = (applicationId: string | null | undefined, initialData?: Application | null) => {
  const { user } = useAuth();
  const { showError } = useToast();

  const { data: application, isLoading: loading, refetch } = useQuery({
    queryKey: ['application', applicationId],
    queryFn: async () => {
      if (!applicationId) return initialData || null;
      try {
        const { data: appData, error: fetchError } = await supabase
          .from('property_applications')
          .select(`
            *,
            property:properties(*),
            renter:users!renter_id(id, first_name, last_name, email, role, is_verified, created_at, user_biodata!user_biodata_id_fkey(phone_number, profile_photo)),
            owner:users!owner_id(id, first_name, last_name, email, role, is_verified, created_at, user_biodata!user_biodata_id_fkey(phone_number, profile_photo))
          `)
          .eq('id', applicationId)
          .maybeSingle();

        if (appData) {
          return appData as Application;
        }

        // Simple query fallback
        const { data: simpleData } = await supabase
          .from('property_applications')
          .select('*')
          .eq('id', applicationId)
          .maybeSingle();

        if (simpleData) {
          const { data: prop } = await supabase.from('properties').select('*').eq('id', simpleData.property_id).maybeSingle();
          simpleData.property = prop;
          return simpleData as Application;
        }

        return initialData || null;
      } catch (e) {
        console.warn('[useApplicationDetails] fetch notice:', e);
        return initialData || null;
      }
    },
    initialData: initialData || undefined,
    enabled: !!applicationId || !!initialData
  });

  const fetchDetails = async () => {
    const res = await refetch();
    return res.data || initialData || null;
  };

  return { application: application || initialData || null, loading, refetch: fetchDetails };
};

export const useMyApplications = () => {
  const { user, role } = useAuth();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const { data: applications, isLoading: loading, isError: error, refetch } = useQuery({
    queryKey: ['my-applications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data: directData, error: dbError } = await supabase
          .from('property_applications')
          .select(`
            *,
            property:properties(*),
            renter:users!renter_id(id, first_name, last_name, email, role, is_verified, created_at, user_biodata!user_biodata_id_fkey(phone_number, profile_photo)),
            owner:users!owner_id(id, first_name, last_name, email, role, is_verified, created_at, user_biodata!user_biodata_id_fkey(phone_number, profile_photo))
          `)
          .eq('renter_id', user.id)
          .order('created_at', { ascending: false });

        if (!dbError && directData && directData.length > 0) {
          return directData as Application[];
        }

        const data = await callEdgeFunction<Application[]>(
          'submit-application',
          'POST',
          { role: 'tenant', action: 'list' }
        );
        return data ?? [];
      } catch (e) {
        console.warn('[useMyApplications] notice:', e);
        return [];
      }
    },
    enabled: !!user
  });

  const fetchApplications = async () => {
    const res = await refetch();
    return res.data ?? [];
  };

  const deleteApplication = async (applicationId: string): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };
    return deleteApplicationById(applicationId, {
      userId: user.id,
      isOwnerSide: false,
      queryClient,
      showSuccess,
      showError,
    });
  };

  const submitApplication = async (
    propertyId: string,
    moveInDate: string,
    message: string
  ): Promise<{ error: string | null }> => {
    try {
      // 1. Direct Supabase insert
      let ownerId: string | null = null;
      let propertyTitle: string | null = null;
      if (user) {
        const { data: prop } = await supabase.from('properties').select('landlord_id, title').eq('id', propertyId).maybeSingle();
        ownerId = prop?.landlord_id ?? null;
        propertyTitle = prop?.title ?? null;

        const { error: insErr } = await supabase.from('property_applications').insert([
          {
            property_id: propertyId,
            renter_id: user.id,
            owner_id: ownerId || null,
            move_in_date: moveInDate,
            message: message,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        ]);

        if (insErr) {
          console.warn('[submitApplication] direct insert notice, calling edge function:', insErr.message);
          await callEdgeFunction('submit-application', 'POST', {
            property_id: propertyId,
            move_in_date: moveInDate,
            message,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-applications'] });

      // 2. Push notification to the landlord (non-fatal — never blocks the submit)
      if (ownerId) {
        try {
          await callEdgeFunction('send-push-notification', 'POST', {
            user_id: ownerId,
            title: 'New Application 🏠',
            body: propertyTitle
              ? `A new tenant applied for "${propertyTitle}". Open Eden to review.`
              : 'A new tenant applied for your property. Open Eden to review.',
            image: 'https://ytpggbkndnynyzashexk.supabase.co/storage/v1/object/public/property-images/EdenIcon.png',
          });
        } catch (pushErr) {
          console.warn('[submitApplication] landlord push notice:', pushErr);
        }
      }

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
    deleteApplication,
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
      if (!user) return [];
      try {
        // Fetch properties owned by this landlord
        const { data: landlordProps } = await supabase
          .from('properties')
          .select('id')
          .eq('landlord_id', user.id);

        const propIds = (landlordProps || []).map((p) => p.id);

        let query = supabase
          .from('property_applications')
          .select(`
            *,
            property:properties(*),
            renter:users!renter_id(id, first_name, last_name, email, role, is_verified, created_at, user_biodata!user_biodata_id_fkey(phone_number, profile_photo)),
            owner:users!owner_id(id, first_name, last_name, email, role, is_verified, created_at, user_biodata!user_biodata_id_fkey(phone_number, profile_photo))
          `)
          .order('created_at', { ascending: false });

        if (propIds.length > 0) {
          query = query.or(`owner_id.eq.${user.id},property_id.in.(${propIds.join(',')})`);
        } else {
          query = query.eq('owner_id', user.id);
        }

        const { data: directData, error: dbError } = await query;
        if (!dbError && directData && directData.length > 0) {
          return directData as Application[];
        }

        // Edge function fallback
        const data = await callEdgeFunction<Application[]>(
          'submit-application',
          'POST',
          { role: 'landlord', action: 'list' }
        );
        return data ?? [];
      } catch (e) {
        console.warn('[useLandlordApplications] fetch notice:', e);
        return [];
      }
    },
    enabled: !!user
  });

  const fetchApplications = async () => {
    const res = await refetch();
    return res.data ?? [];
  };

  const deleteApplication = async (applicationId: string): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };
    return deleteApplicationById(applicationId, {
      userId: user.id,
      isOwnerSide: true,
      queryClient,
      showSuccess,
      showError,
    });
  };

  const respondToApplication = async (
    applicationId: string,
    action: 'accept' | 'decline'
  ): Promise<{ error: string | null; rental_reference?: string }> => {
    setResponding(true);
    try {
      // 1. Direct Supabase status update
      const newStatus = action === 'accept' ? 'accepted' : 'declined';
      await supabase
        .from('property_applications')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      // 2. Initialize rental record + auto-reject all other applications on accept
      if (action === 'accept') {
        try {
          const { data: appData } = await supabase
            .from('property_applications')
            .select('*, property:properties(*)')
            .eq('id', applicationId)
            .single();

          if (appData) {
            const prop = appData.property;
            const rent = Number(prop?.price || 0);
            const caution = Number(prop?.caution_fee || 0);
            const legal = Number(prop?.legal_fee || 0);
            const agencyPct = Number(prop?.agency_fee_percentage || 0);
            const agency = agencyPct > 0 ? (rent * agencyPct) / 100 : 0;
            const serviceFee = (rent * 5.0) / 100;
            const escrowFee = rent > 0 ? 1000 : 0;
            const totalAmount = rent + serviceFee + escrowFee + caution + legal + agency;
            const platformFee = serviceFee + escrowFee + caution;
            const ownerPayout = rent + legal + agency;

            const { data: existingRental } = await supabase
              .from('rentals')
              .select('id')
              .eq('application_id', applicationId)
              .maybeSingle();

            if (!existingRental) {
              const paystackRef = `RENT_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
              await supabase.from('rentals').insert({
                application_id: applicationId,
                property_id: appData.property_id,
                renter_id: appData.renter_id,
                owner_id: appData.owner_id,
                amount: totalAmount,
                platform_fee: platformFee,
                owner_payout: ownerPayout,
                paystack_reference: paystackRef,
                status: 'awaiting_payment',
              });
            }

            // ── Auto-decline all OTHER pending applications for this property ──
            try {
              await supabase
                .from('property_applications')
                .update({ status: 'declined', updated_at: new Date().toISOString() })
                .eq('property_id', appData.property_id)
                .eq('status', 'pending')
                .neq('id', applicationId);
            } catch (autoDeclineErr) {
              console.warn('[respondToApplication] Auto-decline warning:', autoDeclineErr);
            }

            // ── Mark property as taken so it stops appearing in search ──
            try {
              await supabase
                .from('properties')
                .update({ status: 'taken', updated_at: new Date().toISOString() })
                .eq('id', appData.property_id);
            } catch (statusErr) {
              console.warn('[respondToApplication] Property status update warning:', statusErr);
            }
          }
        } catch (rentalInitErr) {
          console.warn('[respondToApplication] Rental init warning:', rentalInitErr);
        }
      }

      // Edge function notification trigger
      try {
        await callEdgeFunction<{ rental_reference?: string }>(
          'respond-to-application',
          'POST',
          {
            application_id: applicationId,
            action,
          }
        );
      } catch {}

      // Push notification to the tenant (non-fatal — never blocks the response)
      try {
        const { data: appRow } = await supabase
          .from('property_applications')
          .select('renter_id, property:properties(title)')
          .eq('id', applicationId)
          .maybeSingle();
        if (appRow?.renter_id) {
          const propTitle = (appRow.property as any)?.title || 'the property';
          await callEdgeFunction('send-push-notification', 'POST', {
            user_id: appRow.renter_id,
            title: action === 'accept' ? 'Application Accepted 🎉' : 'Application Update',
            body: action === 'accept'
              ? `Your application for ${propTitle} was accepted. You can now proceed to payment in Eden.`
              : `Your application for ${propTitle} was not accepted. You can explore other listings in Eden.`,
            image: 'https://ytpggbkndnynyzashexk.supabase.co/storage/v1/object/public/property-images/EdenIcon.png',
          });
        }
      } catch (pushErr) {
        console.warn('[respondToApplication] tenant push notice:', pushErr);
      }

      showSuccess(
        action === 'accept'
          ? 'Application accepted! The tenant can now proceed to payment.'
          : 'Application declined.'
      );
      queryClient.invalidateQueries({ queryKey: ['landlord-applications'] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      return { error: null };
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
    deleteApplication,
    refetch: fetchApplications,
  };
};

export const useOwnerApplications = useLandlordApplications;
