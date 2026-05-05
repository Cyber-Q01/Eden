import React from 'react';
import { StyleSheet, View } from 'react-native';
import ThemedTextInput from '../ThemedTextInput';
import { BiodataForm, ModalKeys } from '../../types/biodata';
import { DropdownButton, FieldLabel, InfoCard, SectionTitle } from './BiodataFormElements';

type Props = {
    form: BiodataForm;
    updateForm: (key: keyof BiodataForm, value: string) => void;
    openModal: (key: ModalKeys) => void;
};

const BankDetailsStep = ({ form, updateForm, openModal }: Props) => {
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
                <FieldLabel>Account Name</FieldLabel>
                <ThemedTextInput
                    placeholder="Name on the account"
                    value={form.account_name}
                    onChangeText={t => updateForm('account_name', t)}
                />
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
});

export default BankDetailsStep;
