import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useBankDetails } from '@/hooks/useBankDetails';
import { BiodataForm, ModalKeys } from '../../types/biodata';
import ThemedTextInput from '../ThemedTextInput';
import { DropdownButton, FieldLabel, InfoCard, SectionTitle } from './BiodataFormElements';

type Props = {
    form: BiodataForm;
    updateForm: (key: keyof BiodataForm, value: string) => void;
    openModal: (key: ModalKeys) => void;
};

const BankDetailsStep = ({ form, updateForm, openModal }: Props) => {
    const { colors } = useTheme();
    const { resolveAccountName } = useBankDetails();
    const [resolving, setResolving] = useState(false);
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        const resolve = async () => {
            if (form.account_number.length === 10 && form.bank_code) {
                setResolving(true);
                setIsVerified(false);
                const name = await resolveAccountName(form.account_number, form.bank_code);
                if (name) {
                    updateForm('account_name', name);
                    setIsVerified(true);
                } else {
                    updateForm('account_name', '');
                    setIsVerified(false);
                }
                setResolving(false);
            }
        };
        resolve();
    }, [form.account_number, form.bank_code]);

    return (
        <View style={styles.stepContent}>
            <SectionTitle title="Bank Details" subtitle="Where we'll send your rent payments" />

            <View style={styles.inputGroup}>
                <FieldLabel>Bank Name</FieldLabel>
                <DropdownButton
                    value={form.bank_name}
                    placeholder="Select your bank"
                    icon="business-outline"
                    onPress={() => openModal('bank')}
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel>Account Number</FieldLabel>
                <ThemedTextInput
                    placeholder="10-digit account number"
                    keyboardType="numeric"
                    maxLength={10}
                    value={form.account_number}
                    onChangeText={t => updateForm('account_number', t)}
                />
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <FieldLabel>Account Name</FieldLabel>
                    {resolving && <ActivityIndicator size="small" color={colors.primary} />}
                    {isVerified && !resolving && (
                        <View style={styles.verifiedRow}>
                            <Ionicons name="checkmark-circle" size={14} color="#00C853" />
                            <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                    )}
                </View>
                <View style={[styles.nameDisplay, { backgroundColor: colors.card, borderColor: isVerified ? '#00C853' : colors.border }]}>
                    <Text style={[styles.accountNameText, { color: form.account_name ? colors.text : colors.textSecondary }]}>
                        {form.account_name || (resolving ? 'Resolving...' : 'Account name will appear here')}
                    </Text>
                </View>
            </View>

            <InfoCard
                icon="shield-checkmark-outline"
                text="Your bank details are encrypted and only used for rent disbursement."
                variant="primary"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    stepContent: { paddingTop: 8 },
    inputGroup: { marginBottom: 18 },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    verifiedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    verifiedText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#00C853',
    },
    nameDisplay: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    accountNameText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default BankDetailsStep;
