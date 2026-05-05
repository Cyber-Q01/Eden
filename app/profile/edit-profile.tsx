import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
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
import { sanitizeDigits, sanitizeName, validateAll, validateName, validatePhone } from '../../lib/validation';

const EditProfileScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { showError } = useToast();
    const { profile, loading, updateProfile } = useProfile();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [avatar, setAvatar] = useState('https://i.pravatar.cc/200');
    const [saving, setSaving] = useState(false);
    const [showGenderModal, setShowGenderModal] = useState(false);

    // Pre-fill form once profile is loaded
    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name ?? '');
            setLastName(profile.last_name ?? '');
            setPhone(profile.phone ?? '');
            setGender(profile.gender ?? '');
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
            setAvatar(result.assets[0].uri);
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
        });
        setSaving(false);
        if (!error) {
            router.back();
        }
    };

    return (
        <ScreenWrapper>
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Avatar Section */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarWrapper}>
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                        <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
                            <Ionicons name="camera" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
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

                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
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
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: 30,
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
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FFF',
        padding: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
        color: '#888',
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#333',
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    selectText: {
        fontSize: 16,
        color: '#333',
    },
    placeholderText: {
        color: '#999',
    },
    saveButton: {
        backgroundColor: '#407BFF',
        borderRadius: 12, // Match input border radius for consistency, but design shows rounded heavily.
        // Design looks like a pill button.
        // borderRadius: 30,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#FFF',
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
        color: '#333',
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#333',
    },
    selectedOptionText: {
        color: '#407BFF',
        fontWeight: '500',
    }
});

export default EditProfileScreen;
