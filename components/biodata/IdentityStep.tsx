import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ID_TYPE_OPTIONS } from '../../constants/biodataOptions';
import { useTheme } from '../../context/ThemeContext';
import { BiodataForm, ModalKeys } from '../../types/biodata';
import ThemedTextInput from '../ThemedTextInput';
import { DropdownButton, FieldLabel, PhotoUploadBox, SectionTitle } from './BiodataFormElements';

type Props = {
    form: BiodataForm;
    updateForm: (key: keyof BiodataForm, value: string) => void;
    openModal: (key: ModalKeys) => void;
};

const IdentityStep = ({ form, updateForm, openModal }: Props) => {
    const { colors } = useTheme();

    const pickImage = async (field: 'id_front_image' | 'id_back_image') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
        });
        if (!result.canceled) updateForm(field, result.assets[0].uri);
    };

    return (
        <View style={styles.stepContent}>
            <SectionTitle title="Identity Verification" subtitle="We need to verify your identity" />

            <View style={styles.inputGroup}>
                <FieldLabel>ID Type</FieldLabel>
                <DropdownButton
                    value={ID_TYPE_OPTIONS.find(o => o.value === form.id_type)?.label ?? ''}
                    placeholder="Select ID type"
                    icon="card-outline"
                    onPress={() => openModal('idType')}
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel>ID Number</FieldLabel>
                <ThemedTextInput
                    placeholder="Enter your ID number"
                    value={form.id_number}
                    onChangeText={t => updateForm('id_number', t)}
                    keyboardType='name-phone-pad'
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel>Upload ID Images</FieldLabel>
                <View style={styles.idUploadRow}>
                    <PhotoUploadBox
                        label="Front of ID"
                        uri={form.id_front_image}
                        onPress={() => pickImage('id_front_image')}
                        icon="id-card-outline"
                    />
                    <PhotoUploadBox
                        label="Back of ID"
                        uri={form.id_back_image}
                        onPress={() => pickImage('id_back_image')}
                        icon="id-card-outline"
                    />
                </View>
                <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                    📸 Make sure the ID is clear and all details are visible
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    stepContent: { paddingTop: 8 },
    inputGroup: { marginBottom: 18 },
    idUploadRow: { flexDirection: 'row', gap: 12 },
    hintText: { fontSize: 12, marginTop: 8, lineHeight: 18 },
});

export default IdentityStep;
