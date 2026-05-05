// hooks/useAgreement.ts

import { useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';

export type AgreementStatus = 'pending' | 'owner_signed' | 'fully_signed' | 'voided';

export type Agreement = {
  id: string;
  rental_id: string;
  property_id: string;
  owner_id: string;
  renter_id: string;
  agreement_text: string;
  generation_type: 'ai' | 'manual';
  custom_clauses: string[];
  uploaded_pdf_url: string | null;
  owner_signed_at: string | null;
  renter_signed_at: string | null;
  status: AgreementStatus;
  pdf_url: string | null;
  created_at: string;
};

export type CustomClauses = {
  deposit_amount?: string;
  pet_policy?: string;
  maintenance_terms?: string;
  additional_rules?: string;
  custom_clauses?: string[];
};

export const useAgreement = (applicationId: string | null) => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const fetchAgreement = async () => {
    if (!applicationId || !user) return;
    setLoading(true);
    setError(false);
    try {
      // ✅ First try to find by rental_id (for existing agreements)
      const { data: rental } = await supabase
        .from('rentals')
        .select('id')
        .eq('application_id', applicationId)
        .maybeSingle();

      let agreementData = null;

      if (rental) {
        const { data, error: dbError } = await supabase
          .from('tenancy_agreements')
          .select('*')
          .eq('rental_id', rental.id)
          .maybeSingle();

        if (dbError && dbError.code !== 'PGRST116') throw dbError;
        agreementData = data;
      }

      setAgreement(agreementData ?? null);
    } catch (e) {
      setError(true);
      const err = await handleError(e);
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Updated to accept customizations
  const generateAgreement = async (customizations?: CustomClauses): Promise<boolean> => {
    if (!applicationId || !user) return false;
    console.log("Generating agreement for applicationId:", applicationId);
    setGenerating(true);
    try {
      const payload: any = { application_id: applicationId };

      // ✅ Add customizations if provided
      if (customizations) {
        payload.customizations = customizations;
        console.log("Including customizations:", customizations);
      }

      const data = await callEdgeFunction<{ success: boolean; agreement_id?: string }>(
        'generate-agreement',
        'POST',
        payload
      );

      if (data?.success) {
        await fetchAgreement();
        showSuccess('Agreement generated successfully!');
        return true;
      }
      return false;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return false;
    } finally {
      setGenerating(false);
    }
  };

  // ✅ New function for manual agreement creation
  const createManualAgreement = async (agreementText: string): Promise<boolean> => {
    if (!applicationId || !user || !agreementText.trim()) return false;
    setGenerating(true);
    try {
      const data = await callEdgeFunction<{ success: boolean; agreement_id?: string }>(
        'create-manual-agreement',
        'POST',
        {
          application_id: applicationId,
          agreement_text: agreementText.trim()
        }
      );

      if (data?.success) {
        await fetchAgreement();
        showSuccess('Agreement created successfully!');
        return true;
      }
      return false;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return false;
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchAgreement();
  }, [applicationId, user]);

  const signAgreement = async (agreementId: string): Promise<boolean> => {
    if (!user || !agreement) return false;
    setSigning(true);
    try {
      const isOwner = user.id === agreement.owner_id;
      const isRenter = user.id === agreement.renter_id;

      if (!isOwner && !isRenter) {
        showError({ type: 'auth', title: 'Not Authorized', message: 'You are not a party to this agreement.' });
        return false;
      }

      const updateField = isOwner ? 'owner_signed_at' : 'renter_signed_at';
      const now = new Date().toISOString();

      // Determine new status
      let newStatus: AgreementStatus = agreement.status;
      if (isOwner && agreement.status === 'pending') newStatus = 'owner_signed';
      if (isRenter && (agreement.status === 'pending' || agreement.status === 'owner_signed')) {
        const ownerAlreadySigned = !!agreement.owner_signed_at;
        newStatus = ownerAlreadySigned ? 'fully_signed' : agreement.status;
      }
      if (isOwner && agreement.renter_signed_at) newStatus = 'fully_signed';

      const { error: updateError } = await supabase
        .from('tenancy_agreements')
        .update({ [updateField]: now, status: newStatus })
        .eq('id', agreementId);

      if (updateError) throw updateError;

      showSuccess(
        newStatus === 'fully_signed'
          ? 'Agreement fully signed! Funds will be released to the owner.'
          : 'Agreement signed. Waiting for the other party.'
      );

      await fetchAgreement();
      return true;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return false;
    } finally {
      setSigning(false);
    }
  };

  const explainClause = async (clauseText: string): Promise<string | null> => {
    try {
      const data = await callEdgeFunction<{ reply: string }>(
        'ai-assistant',
        'POST',
        {
          type: 'explain_clause',
          clause: clauseText,
        }
      );
      return data?.reply ?? null;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return null;
    }
  };

  return {
    agreement,
    loading,
    signing,
    generating,
    error,
    signAgreement,
    generateAgreement,
    createManualAgreement, // ✅ New function
    explainClause,
    refetch: fetchAgreement,
  };
};