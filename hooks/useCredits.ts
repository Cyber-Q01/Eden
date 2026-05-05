import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';

export type UnlockResult = {
  unlocked: boolean;
  landlord?: any;
  balance: number;
  charged?: boolean;
  error?: string;
};

export const useCredits = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchCredits = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await callEdgeFunction<{ balance: number }>('credits', 'GET');
      setCredits(data?.balance ?? 0);
    } catch (e) {
      const err = await handleError(e);
      // Silently fail — don't show error for credit fetching
      console.warn('Failed to fetch credits:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkUnlocked = async (propertyId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const data = await callEdgeFunction<{ balance: number; unlocked: boolean }>(
        'credits', 'GET', null, { property_id: propertyId }
      );
      setCredits(data?.balance ?? 0);
      return data?.unlocked ?? false;
    } catch {
      return false;
    }
  };

  const initializeTopUp = async (
    nairaAmount: number,
    unlocks: number
  ): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  } | null> => {
    if (!user) return null;
    setLoading(true);
    try {
      const data = await callEdgeFunction(
        'initialize-credit-topup', 'POST',
        { naira_amount: nairaAmount, unlocks }
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

  const verifyTopUp = async (reference: string): Promise<boolean> => {
    setLoading(true);
    try {
      const data = await callEdgeFunction<{ balance: number; unlocks_added: number }>(
        'verify-credit-topup', 'POST', { reference }
      );
      setCredits(data?.balance ?? 0);
      if (data?.unlocks_added && data.unlocks_added > 0) {
        showSuccess(`${data.unlocks_added} credits added! 🎉`);
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

  const unlockProperty = async (propertyId: string): Promise<UnlockResult> => {
    if (!user) return { unlocked: false, balance: 0, error: 'not_authenticated' };
    setLoading(true);
    try {
      const data = await callEdgeFunction<UnlockResult>(
        'unlock-property', 'POST', { property_id: propertyId }
      );

      if (data?.error === 'insufficient_credits') {
        setCredits(data.balance);
        return data;
      }

      if (data?.unlocked) {
        setCredits(data.balance);
        if (data.charged) {
          showSuccess('Property unlocked! 🔓');
        }
        return data;
      }

      return { unlocked: false, balance: 0 };
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return { unlocked: false, balance: 0, error: 'network_error' };
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCredits();
    }, [user])
  );

  return {
    credits,
    loading,
    fetchCredits,
    checkUnlocked,
    initializeTopUp,
    verifyTopUp,
    unlockProperty,
  };
};
