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
    const { colors, isDark } = useTheme();

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
            <SectionTitle title="Personal Information" subtitle="Enter your legal identity details" />

            {/* Prominent Name Matching Notice */}
            <View style={[styles.infoBanner, { backgroundColor: isDark ? '#0c1844' : '#EFF6FF', borderColor: isDark ? '#1E3A8A' : '#BFDBFE' }]}>
                <Ionicons name="information-circle" size={20} color="#1D4ED8" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                    <Text style={[styles.infoBannerTitle, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                        Important Name Matching Requirement
                    </Text>
                    <Text style={[styles.infoBannerText, { color: isDark ? '#BFDBFE' : '#1E3A8A' }]}>
                        Please enter your First Name and Last Name <Text style={{ fontWeight: '700' }}>EXACTLY as they appear on your National ID (NIN)</Text>. You can edit your names here to correct any typos before verification.
                    </Text>
                </View>
            </View>

            {/* Legal First & Last Name Inputs */}
            <View style={styles.inputGroup}>
                <FieldLabel>First Name (as on National ID)</FieldLabel>
                <ThemedTextInput
                    placeholder="e.g. Akin"
                    value={form.first_name || ''}
                    onChangeText={t => updateForm('first_name', t)}
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel>Last Name / Surname (as on National ID)</FieldLabel>
                <ThemedTextInput
                    placeholder="e.g. Oladele"
                    value={form.last_name || ''}
                    onChangeText={t => updateForm('last_name', t)}
                />
            </View>

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
                <FieldLabel>Date of Birth (as on National ID)</FieldLabel>
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
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 20,
    },
    infoBannerTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    infoBannerText: {
        fontSize: 12,
        lineHeight: 17,
    },
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
