import { useState } from 'react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';

export type RentalStatus =
  | 'awaiting_payment'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'disputed'
  | 'released'
  | 'refunded';

export type Rental = {
  id: string;
  application_id: string;
  property_id: string;
  renter_id: string;
  owner_id: string;
  amount: number;
  platform_fee: number;
  owner_payout: number;
  paystack_reference: string;
  status: RentalStatus;
  confirmation_deadline: string | null;
  transfer_reference: string | null;
  created_at: string;
};

export const usePayment = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);

  // ── Membership ─────────────────────────────────────────────────────────────

  const initializeMembership = async (): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  } | null> => {
    if (!user) return null;
    setLoading(true);
    try {
      const data = await callEdgeFunction(
        'initialize-membership-payment', 'POST', {}
      );
      return data;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyMembership = async (reference: string): Promise<boolean> => {
    setLoading(true);
    try {
      await callEdgeFunction('verify-membership-payment', 'POST', { reference });
      showSuccess('Welcome! You are now a Verified Renter 🎉');
      return true;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ── Rent payment ───────────────────────────────────────────────────────────

  const initializeRentPayment = async (rentalId: string): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
    amount: number;
    property_title: string;
    property_location: string;
  } | null> => {
    if (!user) return null;
    setLoading(true);
    try {
      const data = await callEdgeFunction(
        'initialize-rent-payment', 'POST', { rental_id: rentalId }
      );
      return data;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyRentPayment = async (reference: string): Promise<{
    rental_id: string;
    confirmation_deadline: string;
    status: string;
  } | null> => {
    setLoading(true);
    try {
      const data = await callEdgeFunction(
        'verify-rent-payment', 'POST', { reference }
      );
      showSuccess('Payment confirmed! You have 48 hours to inspect the property.');
      return data;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const confirmRental = async (rentalId: string): Promise<boolean> => {
    setLoading(true);
    try {
      // NOTE: there is deliberately NO confirm-rental fallback here. If
      // release-payment fails, the money has NOT moved — marking the rental
      // 'confirmed' would deadlock it (the auto-release cron only picks up
      // 'awaiting_confirmation' rows). The tenant sees the real error and
      // the row self-heals via retry / cron once the issue is fixed.
      const data = await callEdgeFunction<{ released?: boolean }>(
        'release-payment', 'POST', { rental_id: rentalId }, undefined, { timeout: 45000 }
      );
      const released = data?.released ?? null;
      if (released === false) {
        showSuccess('Apartment confirmed! Funds are being released to the owner — this can take a few minutes.');
      } else {
        showSuccess('Apartment confirmed! Funds released to the owner.');
      }
      return true;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disputeRental = async (rentalId: string, reason: string): Promise<boolean> => {
    setLoading(true);
    try {
      try {
        await callEdgeFunction('dispute-rental', 'POST', {
          rental_id: rentalId,
          reason,
        });
      } catch (edgeErr) {
        // Direct Supabase update fallback to freeze 48h timer and flag dispute safely
        if (user) {
          await supabase
            .from('rentals')
            .update({
              status: 'disputed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', rentalId);

          await supabase
            .from('complaint_requests')
            .insert({
              user_id: user.id,
              category: 'rental_dispute',
              description: `[Rental #${rentalId}] Dispute Raised: ${reason}`,
              status: 'open',
            });
        }
      }
      showSuccess('Dispute submitted. Our team will review within 24 hours.');
      return true;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ── Owner recipient setup ──────────────────────────────────────────────────

  const createOwnerRecipient = async (): Promise<boolean> => {
    setLoading(true);
    try {
      await callEdgeFunction('create-owner-recipient', 'POST', {});
      return true;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    initializeMembership,
    verifyMembership,
    initializeRentPayment,
    verifyRentPayment,
    confirmRental,
    disputeRental,
    createOwnerRecipient,
  };
};
