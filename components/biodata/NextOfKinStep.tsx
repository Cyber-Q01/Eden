import React from 'react';
import { StyleSheet, View } from 'react-native';
import ThemedTextInput from '../ThemedTextInput';
import { BiodataForm, ModalKeys } from '../../types/biodata';
import { DropdownButton, FieldLabel, SectionTitle } from './BiodataFormElements';

type Props = {
    form: BiodataForm;
    updateForm: (key: keyof BiodataForm, value: string) => void;
    openModal: (key: ModalKeys) => void;
};

const NextOfKinStep = ({ form, updateForm, openModal }: Props) => {
    return (
        <View style={styles.stepContent}>
            <SectionTitle title="Next of Kin" subtitle="Someone we can reach in an emergency" />

            <View style={styles.inputGroup}>
                <FieldLabel>Full Name</FieldLabel>
                <ThemedTextInput
                    placeholder="Enter full name"
                    value={form.next_of_kin_name}
                    onChangeText={t => updateForm('next_of_kin_name', t)}
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel>Phone Number</FieldLabel>
                <ThemedTextInput
                    placeholder="e.g. 08012345678"
                    keyboardType="phone-pad"
                    value={form.next_of_kin_phone}
                    onChangeText={t => updateForm('next_of_kin_phone', t)}
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel>Relationship</FieldLabel>
                <DropdownButton
                    value={form.next_of_kin_relationship}
                    placeholder="Select relationship"
                    icon="people-outline"
                    onPress={() => openModal('relationship')}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    stepContent: { paddingTop: 8 },
    inputGroup: { marginBottom: 18 },
});

export default NextOfKinStep;
