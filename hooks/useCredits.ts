import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);

  const { data: credits, isLoading: queryLoading, refetch } = useQuery({
    queryKey: ['credits', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      try {
        const data = await callEdgeFunction<{ balance: number }>('credits', 'GET');
        return data?.balance ?? 0;
      } catch (e) {
        const err = await handleError(e);
        console.warn('Failed to fetch credits:', err);
        throw e;
      }
    },
    enabled: !!user
  });

  const fetchCredits = async () => {
    const res = await refetch();
    return res.data ?? 0;
  };

  const checkUnlocked = async (propertyId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const data = await callEdgeFunction<{ balance: number; unlocked: boolean }>(
        'credits', 'GET', null, { property_id: propertyId }
      );
      // Optimistically update credits balance if changed
      if (data?.balance !== undefined) {
        queryClient.setQueryData(['credits', user.id], data.balance);
      }
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
    setActionLoading(true);
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
      setActionLoading(false);
    }
  };

  const verifyTopUp = async (reference: string): Promise<boolean> => {
    setActionLoading(true);
    try {
      const data = await callEdgeFunction<{ balance: number; unlocks_added: number }>(
        'verify-credit-topup', 'POST', { reference }
      );
      if (data?.balance !== undefined) {
        queryClient.setQueryData(['credits', user?.id], data.balance);
      }
      if (data?.unlocks_added && data.unlocks_added > 0) {
        showSuccess(`${data.unlocks_added} credits added! 🎉`);
      }
      return true;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const unlockProperty = async (propertyId: string): Promise<UnlockResult> => {
    if (!user) return { unlocked: false, balance: 0, error: 'not_authenticated' };
    setActionLoading(true);
    try {
      const data = await callEdgeFunction<UnlockResult>(
        'unlock-property', 'POST', { property_id: propertyId }
      );

      if (data?.error === 'insufficient_credits') {
        if (data.balance !== undefined) queryClient.setQueryData(['credits', user.id], data.balance);
        return data;
      }

      if (data?.unlocked) {
        if (data.balance !== undefined) queryClient.setQueryData(['credits', user.id], data.balance);
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
      setActionLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [user, refetch])
  );

  return {
    credits: credits ?? 0,
    loading: queryLoading || actionLoading,
    fetchCredits,
    checkUnlocked,
    initializeTopUp,
    verifyTopUp,
    unlockProperty,
  };
};
