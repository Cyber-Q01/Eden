import React from 'react';
import { StyleSheet, View } from 'react-native';
import ThemedTextInput from '../ThemedTextInput';
import { BiodataForm, ModalKeys } from '../../types/biodata';
import { EMPLOYER_HIDDEN_STATUSES } from '../../constants/biodataOptions';
import { DropdownButton, FieldLabel, InfoCard, SectionTitle } from './BiodataFormElements';

type Props = {
    form: BiodataForm;
    updateForm: (key: keyof BiodataForm, value: string) => void;
    openModal: (key: ModalKeys) => void;
};

const OccupationStep = ({ form, updateForm, openModal }: Props) => {
    const showEmployerField = !EMPLOYER_HIDDEN_STATUSES.includes(form.employment_status);

    return (
        <View style={styles.stepContent}>
            <SectionTitle title="Occupation & Financial" subtitle="This helps landlords assess your application" />

            <View style={styles.inputGroup}>
                <FieldLabel>Employment Status</FieldLabel>
                <DropdownButton
                    value={form.employment_status}
                    placeholder="Select employment status"
                    icon="briefcase-outline"
                    onPress={() => openModal('employment')}
                />
            </View>

            {showEmployerField && (
                <View style={styles.inputGroup}>
                    <FieldLabel>Employer / Business Name</FieldLabel>
                    <ThemedTextInput
                        placeholder="Where do you work?"
                        value={form.employer_name}
                        onChangeText={t => updateForm('employer_name', t)}
                    />
                </View>
            )}

            <View style={styles.inputGroup}>
                <FieldLabel>Monthly Income Range</FieldLabel>
                <DropdownButton
                    value={form.monthly_income_range}
                    placeholder="Select income range"
                    icon="cash-outline"
                    onPress={() => openModal('income')}
                />
            </View>

            <InfoCard
                icon="lock-closed-outline"
                text="Your financial information is kept private and only used for tenancy assessment."
                variant="primary"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    stepContent: { paddingTop: 8 },
    inputGroup: { marginBottom: 18 },
});

export default OccupationStep;
