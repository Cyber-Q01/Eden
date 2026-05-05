import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ThemedTextInput from '../ThemedTextInput';
import { useTheme } from '../../context/ThemeContext';
import { BiodataForm, ModalKeys } from '../../types/biodata';
import { GENDER_OPTIONS } from '../../constants/biodataOptions';
import { DropdownButton, FieldLabel, SectionTitle } from './BiodataFormElements';

type Props = {
    form: BiodataForm;
    updateForm: (key: keyof BiodataForm, value: string) => void;
    openModal: (key: ModalKeys) => void;
    onShowDobPicker: () => void;
};

const PersonalInfoStep = ({ form, updateForm, openModal, onShowDobPicker }: Props) => {
    const { colors } = useTheme();

    const pickProfilePhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
            allowsEditing: true,
            aspect: [1, 1],
        });
        if (!result.canceled) updateForm('profile_photo', result.assets[0].uri);
    };

    return (
        <View style={styles.stepContent}>
            <SectionTitle title="Personal Information" subtitle="Tell us a bit about yourself" />

            <View style={styles.inputGroup}>
                <FieldLabel>Phone Number</FieldLabel>
                <ThemedTextInput
                    placeholder="e.g. 08012345678"
                    keyboardType="phone-pad"
                    value={form.phone_number}
                    onChangeText={t => updateForm('phone_number', t)}
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel>Date of Birth</FieldLabel>
                <DropdownButton
                    value={form.dob}
                    placeholder="Select date of birth"
                    icon="calendar-outline"
                    onPress={onShowDobPicker}
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel>Gender</FieldLabel>
                <DropdownButton
                    value={form.gender}
                    placeholder="Select gender"
                    icon="person-outline"
                    onPress={() => openModal('gender')}
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel>Profile Photo (optional)</FieldLabel>
                {form.profile_photo ? (
                    <View style={styles.profilePhotoWrap}>
                        <Image source={{ uri: form.profile_photo }} style={styles.profilePhoto} />
                        <TouchableOpacity
                            style={[styles.changePhotoBtn, { backgroundColor: colors.primary }]}
                            onPress={pickProfilePhoto}
                        >
                            <Ionicons name="camera" size={14} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.profilePhotoEmpty, { borderColor: colors.border, backgroundColor: colors.card }]}
                        onPress={pickProfilePhoto}
                    >
                        <Ionicons name="person-circle-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.uploadHint, { color: colors.primary, marginTop: 6 }]}>Upload photo</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    stepContent: { paddingTop: 8 },
    inputGroup: { marginBottom: 18 },
    profilePhotoWrap: { position: 'relative', width: 90, height: 90 },
    profilePhoto: { width: 90, height: 90, borderRadius: 45 },
    changePhotoBtn: {
        position: 'absolute', bottom: 0, right: 0,
        width: 28, height: 28, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    profilePhotoEmpty: {
        width: 90, height: 90, borderRadius: 45,
        borderWidth: 1.5, borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center',
    },
    uploadHint: { fontSize: 11, fontWeight: '500' },
});

export default PersonalInfoStep;
