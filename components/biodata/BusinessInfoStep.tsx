import React from 'react';
import { StyleSheet, View } from 'react-native';
import ThemedTextInput from '../ThemedTextInput';
import { BiodataForm } from '../../types/biodata';
import { FieldLabel, InfoCard, SectionTitle } from './BiodataFormElements';

type Props = {
    form: BiodataForm;
    updateForm: (key: keyof BiodataForm, value: string) => void;
};

const BusinessInfoStep = ({ form, updateForm }: Props) => {
    return (
        <View style={styles.stepContent}>
            <SectionTitle title="Business Information" subtitle="Business registration details (optional)" />

            <View style={styles.inputGroup}>
                <FieldLabel>Business / Company Name</FieldLabel>
                <ThemedTextInput
                    placeholder="e.g. Ade Properties Ltd"
                    value={form.business_name}
                    onChangeText={t => updateForm('business_name', t)}
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel>CAC Registration Number (optional)</FieldLabel>
                <ThemedTextInput
                    placeholder="e.g. RC-1234567"
                    value={form.cac_number}
                    onChangeText={t => updateForm('cac_number', t)}
                />
            </View>

            <InfoCard
                icon="information-circle-outline"
                text="Business info builds trust with tenants. You can skip this if you're an individual landlord."
                variant="neutral"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    stepContent: { paddingTop: 8 },
    inputGroup: { marginBottom: 18 },
});

export default BusinessInfoStep;
