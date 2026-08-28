import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';

export const useBankDetails = () => {
    const { user } = useAuth();
    const { showError, showSuccess } = useToast();
    const [bankDetails, setBankDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);

    const fetchBankDetails = async () => {
        if (!user) return;
        setLoading(true);
        setError(false);
        try {
            const data = await callEdgeFunction('bank-details', 'GET');
            setBankDetails(data);
        } catch (e) {
            setError(true);
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBankDetails();
    }, [user]);

    const fetchBanks = async () => {
        try {
            const data = await callEdgeFunction('bank-details?action=list_banks', 'GET');
            return data.map((b: any) => ({ label: b.name, value: b.code }));
        } catch (e) {
            handleError(e);
            return [];
        }
    };

    const resolveAccountName = async (accountNumber: string, bankCode: string) => {
        try {
            const data = await callEdgeFunction(`bank-details?action=resolve&account_number=${accountNumber}&bank_code=${bankCode}`, 'GET');
            return data.account_name;
        } catch (e) {
            await handleError(e);
            // We don't show toast for resolution failures to avoid annoying popups while typing
            return null;
        }
    };

    const saveBankDetails = async (bank: string, accountNumber: string, accountName: string, bankCode?: string) => {
        if (!user) return { error: 'Not authenticated' };
        setSaving(true);
        try {
            const data = await callEdgeFunction<{ recipient_created?: boolean; message?: string }>('bank-details', 'POST', {
                bank_name: bank,
                account_number: accountNumber,
                account_name: accountName,
                bank_code: bankCode
            });
            if (data && data.recipient_created === false) {
                // Bank row saved, but the Paystack payout account couldn't be created
                showSuccess(data.message || 'Bank details saved, but payout account setup needs another try — please save your details again or contact support.');
            } else {
                showSuccess('Bank details saved successfully — payouts are ready.');
            }
            await fetchBankDetails();
            return { error: null };
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return { error: err.message };
        } finally {
            setSaving(false);
        }
    };

    return { bankDetails, loading, saving, error, fetchBanks, resolveAccountName, saveBankDetails, refetch: fetchBankDetails };
};
