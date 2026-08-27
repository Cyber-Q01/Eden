import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

export const INSPECTION_PACK_SIZE = 3;
export const INSPECTION_PRICE = 666;
export const INSPECTION_PACK_TOTAL = 2148; // 3 x 666 + 7.5% VAT

export interface PassesState {
  remaining: number;
  used: number;
  total: number;
}

const EMPTY_PASSES: PassesState = { remaining: 0, used: 0, total: 0 };

/**
 * Inspection booking passes.
 * A tenant buys a FIXED pack of 3 real-world property inspections in naira
 * (Paystack, verified server-side). Each pass is consumed by one booking.
 * No free-floating credit balance — store-compliant.
 */
export const useInspectionPasses = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading: queryLoading, refetch } = useQuery({
    queryKey: ['inspection-passes', user?.id],
    queryFn: async (): Promise<PassesState> => {
      if (!user) return EMPTY_PASSES;
      try {
        const { data: rows } = await supabase
          .from('inspection_passes')
          .select('id, used_at');
        const all = rows ?? [];
        const used = all.filter((p: any) => p.used_at).length;
        return { remaining: all.length - used, used, total: all.length };
      } catch (e) {
        console.warn('Failed to fetch inspection passes:', e);
        return EMPTY_PASSES;
      }
    },
    enabled: !!user,
  });

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const initializePack = async (): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  } | null> => {
    if (!user) return null;
    setActionLoading(true);
    try {
      const data = await callEdgeFunction('initialize-inspection-pack', 'POST', {});
      return data;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const verifyPack = async (reference: string): Promise<boolean> => {
    if (!user) return false;
    setActionLoading(true);
    try {
      const data = await callEdgeFunction<{ added: number; remaining: number }>(
        'verify-inspection-pack', 'POST', { reference }
      );
      if (data?.added && data.added > 0) {
        showSuccess(`${data.added} inspection bookings added! 🔑`);
      }
      await refetch();
      return true;
    } catch (e) {
      const err = await handleError(e);
      showError(err);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user) refetch();
    }, [user, refetch])
  );

  const state = data ?? EMPTY_PASSES;

  return {
    remaining: state.remaining,
    used: state.used,
    total: state.total,
    loading: queryLoading || actionLoading,
    refresh,
    initializePack,
    verifyPack,
  };
};
