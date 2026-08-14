import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';
import { sanitizeDigits, sanitizeName, validateAll, validateName, validatePhone } from '../../lib/validation';

const PROFILE_PICTURES_BUCKET = 'profile-pictures';
const PLACEHOLDER_AVATAR = 'https://i.pravatar.cc/200';

const EditProfileScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { showError, showSuccess } = useToast();
    const { profile, loading, updateProfile } = useProfile();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null); // local URI or remote URL
    const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null); // final uploaded URL
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showGenderModal, setShowGenderModal] = useState(false);

    // Pre-fill form once profile is loaded
    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name ?? '');
            setLastName(profile.last_name ?? '');
            setPhone(profile.phone ?? '');
            setGender(profile.gender ?? '');
            // Pre-fill existing profile photo
            const existingPhoto = profile.profile_photo ?? profile.user_biodata?.profile_photo;
            if (existingPhoto) {
                setAvatar(existingPhoto);
                setUploadedPhotoUrl(existingPhoto);
            }
        }
    }, [profile]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            const localUri = result.assets[0].uri;
            setAvatar(localUri); // Show preview immediately

            // Upload to Supabase Storage
            setUploadingPhoto(true);
            try {
                // Compress image first
                const manipulated = await ImageManipulator.manipulateAsync(
                    localUri,
                    [{ resize: { width: 400 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                const arrayBuffer = decode(base64);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Not authenticated');

                const fileName = `${user.id}-${Date.now()}.jpg`;

                const { data, error: uploadError } = await supabase.storage
                    .from(PROFILE_PICTURES_BUCKET)
                    .upload(fileName, arrayBuffer, {
                        contentType: 'image/jpeg',
                        upsert: true, // upsert so re-uploading works
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from(PROFILE_PICTURES_BUCKET)
                    .getPublicUrl(data.path);

                setUploadedPhotoUrl(publicUrlData.publicUrl);
                showSuccess('Photo uploaded ✓');
            } catch (e: any) {
                console.error('[EditProfile] Photo upload error:', e);
                showError({ type: 'unknown', title: 'Upload Failed', message: e.message ?? 'Failed to upload photo' });
                // Reset preview back to previous
                const existingPhoto = profile?.profile_photo ?? profile?.user_biodata?.profile_photo ?? null;
                setAvatar(existingPhoto);
            } finally {
                setUploadingPhoto(false);
            }
        }
    };

    const handleSave = async () => {
        const validationError = validateAll([
            { check: () => validateName(firstName, 'First name') },
            { check: () => validateName(lastName, 'Last name') },
            { check: () => phone ? validatePhone(phone) : null },
        ]);
        if (validationError) {
            showError({ type: 'unknown', title: 'Validation Error', message: validationError });
            return;
        }

        setSaving(true);
        const { error } = await updateProfile({
            first_name: sanitizeName(firstName),
            last_name: sanitizeName(lastName),
            phone: sanitizeDigits(phone),
            gender,
            // Only include profile_photo if we have an uploaded URL
            ...(uploadedPhotoUrl ? { profile_photo: uploadedPhotoUrl } : {}),
        });
        setSaving(false);
        if (!error) {
            router.back();
        }
    };

    const displayAvatar = avatar ?? PLACEHOLDER_AVATAR;

    return (
        <ScreenWrapper withScrollView={true} >
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Avatar Section */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarWrapper}>
                        <Image source={{ uri: displayAvatar }} style={styles.avatar} />
                        {uploadingPhoto && (
                            <View style={styles.uploadOverlay}>
                                <ActivityIndicator size="small" color="#FFF" />
                            </View>
                        )}
                        <TouchableOpacity style={styles.cameraButton} onPress={pickImage} disabled={uploadingPhoto}>
                            <Ionicons name={uploadingPhoto ? 'cloud-upload-outline' : 'camera'} size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.photoHint, { color: colors.textSecondary }]}>
                        Tap the camera icon to change your photo
                    </Text>
                </View>

                {/* Form Fields */}
                {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>First Name</Text>
                            <ThemedTextInput
                                value={firstName}
                                onChangeText={(t) => setFirstName(sanitizeName(t))}
                                placeholder="Enter first name"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Last Name</Text>
                            <ThemedTextInput
                                value={lastName}
                                onChangeText={(t) => setLastName(sanitizeName(t))}
                                placeholder="Enter last name"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
                            <ThemedTextInput
                                value={phone}
                                onChangeText={(t) => setPhone(sanitizeDigits(t))}
                                keyboardType="phone-pad"
                                placeholder="Enter phone number"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Gender</Text>
                            <TouchableOpacity style={[styles.selectButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowGenderModal(true)}>
                                <Text style={[styles.selectText, { color: gender ? colors.text : colors.textSecondary }]}>
                                    {gender || 'Select Gender'}
                                </Text>
                                <Ionicons name="caret-down-outline" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving || uploadingPhoto ? 0.7 : 1 }]}
                    onPress={handleSave}
                    disabled={saving || uploadingPhoto}
                >
                    {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                </TouchableOpacity>

            </ScrollView>

            {/* Gender Selection Modal */}
            <Modal
                visible={showGenderModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowGenderModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowGenderModal(false)}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Select Gender</Text>
                        {['Male', 'Female', 'Other'].map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[styles.modalOption, { borderBottomColor: colors.border }]}
                                onPress={() => {
                                    setGender(option);
                                    setShowGenderModal(false);
                                }}
                            >
                                <Text style={[
                                    styles.modalOptionText,
                                    { color: colors.text },
                                    gender === option && [styles.selectedOptionText, { color: colors.primary }]
                                ]}>{option}</Text>
                                {gender === option && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: 30,
        gap: 8,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E0E0E0',
    },
    uploadOverlay: {
        position: 'absolute',
        inset: 0,
        borderRadius: 60,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: '#407BFF',
        padding: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    photoHint: {
        fontSize: 12,
        textAlign: 'center',
    },
    form: {
        gap: 20,
        marginBottom: 30,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        marginLeft: 4,
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    selectText: {
        fontSize: 16,
    },
    saveButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    modalOptionText: {
        fontSize: 16,
    },
    selectedOptionText: {
        fontWeight: '500',
    },
});

export default EditProfileScreen;
