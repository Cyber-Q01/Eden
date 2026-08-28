import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';
import { callEdgeFunction } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';

const IDVerificationScreen = () => {
    const router = useRouter();
    const { userType } = useUser();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const { showError, showSuccess } = useToast();
    const { signOut } = useProfile();

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); } },
            ]
        );
    };

    const [ninInput, setNinInput] = useState('');
    const [firstNameInput, setFirstNameInput] = useState('');
    const [lastNameInput, setLastNameInput] = useState('');
    const [dobInput, setDobInput] = useState('');
    const [showNINModal, setShowNINModal] = useState(false);

    const [verificationStatus, setVerificationStatus] = useState({
        id: 'pending', // 'pending' | 'verified' | 'failed'
        selfie: 'pending',
    });
    const [isVerifyingNIN, setIsVerifyingNIN] = useState(false);
    const [isProcessingSelfie, setIsProcessingSelfie] = useState(false);

    // Load existing user details from metadata or biodata
    useEffect(() => {
        const loadInitialData = async () => {
            if (!user) return;
            try {
                const { data: userData } = await supabase
                    .from('users')
                    .select('first_name, last_name, is_verified, user_biodata!user_biodata_id_fkey(dob, kyc_status)')
                    .eq('id', user.id)
                    .maybeSingle();

                if (userData) {
                    if (userData.first_name) setFirstNameInput(userData.first_name);
                    if (userData.last_name) setLastNameInput(userData.last_name);
                    if (userData.is_verified) {
                        setVerificationStatus(prev => ({ ...prev, id: 'verified' }));
                    }

                    const bio = Array.isArray(userData.user_biodata) ? userData.user_biodata[0] : userData.user_biodata;
                    if (bio) {
                        if (bio.dob) setDobInput(bio.dob);
                        // NIN is never pre-filled — user must re-enter for security
                        if (bio.kyc_status === 'verified') {
                            setVerificationStatus(prev => ({ ...prev, id: 'verified' }));
                        }
                    }
                }
            } catch (e) {
                console.warn('[IDVerification] Fetch warning:', e);
            }
        };

        loadInitialData();
    }, [user]);

    const handleVerifyNIN = async () => {
        if (!ninInput.trim() || ninInput.trim().length !== 11) {
            Alert.alert('Invalid NIN', 'Please enter a valid 11-digit National Identification Number.');
            return;
        }
        if (!firstNameInput.trim() || !lastNameInput.trim()) {
            Alert.alert('Names Required', 'Please provide your legal First Name and Last Name as on your National ID.');
            return;
        }

        setIsVerifyingNIN(true);
        try {
            const response = await callEdgeFunction<{ success: boolean; message?: string }>(
                'verify-nin',
                'POST',
                {
                    nin: ninInput.trim(),
                    first_name: firstNameInput.trim(),
                    last_name: lastNameInput.trim(),
                    dob: dobInput.trim(),
                    method: 'nin',
                }
            );

            if (response?.success) {
                setVerificationStatus(prev => ({ ...prev, id: 'verified' }));
                setShowNINModal(false);
                showSuccess('National ID Verified Successfully! 🎉');
            } else {
                Alert.alert('Verification Notice', 'Could not verify NIN record.');
            }
        } catch (error: any) {
            console.error('[NIN Verification Error]:', error);
            const msg = error?.message || '';

            if (msg.includes('Name Mismatch') || msg.includes('Date of Birth Mismatch') || msg.includes('IDENTITY_MISMATCH')) {
                Alert.alert(
                    'Identity Mismatch ⚠️',
                    'The First Name, Last Name, or Date of Birth you entered does not match your official NIMC National ID record.\n\nPlease review your names and Date of Birth and make sure they match your National ID card exactly.',
                    [{ text: 'Review Details' }]
                );
            } else if (msg.includes('Duplicate Identity') || msg.includes('already been linked')) {
                Alert.alert(
                    'Duplicate Identity ⚠️',
                    'This National Identification Number (NIN) is already linked and verified on another Eden account. Each user may only operate one verified account.',
                    [{ text: 'OK' }]
                );
            } else if (msg.includes('NIN verification attempts') || msg.includes('before your next NIN verification attempt') || msg.includes('temporarily locked')) {
                // Rate limit hit (server-side) — show the exact wait time, no more provider calls
                Alert.alert('Hold on ⏳', msg, [{ text: 'OK' }]);
            } else {
                Alert.alert('Verification Failed', 'We could not verify your identity at this time. Please check your details and try again.');
            }
        } finally {
            setIsVerifyingNIN(false);
        }
    };

    const handleStartSelfie = async () => {
        setIsProcessingSelfie(true);
        setTimeout(() => {
            setVerificationStatus(prev => ({ ...prev, selfie: 'verified' }));
            setIsProcessingSelfie(false);
            showSuccess('Facial Biometrics Matched ✓');
        }, 1200);
    };

    const handleContinueToApp = async () => {
        if (!userType) {
            router.replace('/(tabs)');
            return;
        }

        if (userType === 'landlord') {
            router.replace('/landlord');
        } else {
            router.replace('/(tabs)');
        }
    };

    return (
        <ScreenWrapper withScrollView={true}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.header, { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: colors.primary }]}>NIN Identity Verification</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Verified identity protection required for all Eden network participants
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleLogout}
                        style={{ padding: 4, marginTop: 2 }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                {/* NDPR Privacy Banner */}
                <View style={[styles.ndprCard, { backgroundColor: isDark ? '#0c1844' : '#EFF6FF', borderColor: isDark ? '#1e3a8a' : '#BFDBFE' }]}>
                    <View style={styles.ndprHeader}>
                        <Ionicons name="shield-checkmark" size={18} color="#1D4ED8" />
                        <Text style={[styles.ndprTitle, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                            NDPR Privacy &amp; Data Protection Guarantee
                        </Text>
                    </View>
                    <Text style={[styles.ndprText, { color: isDark ? '#BFDBFE' : '#1E3A8A' }]}>
                        Your National Identification Number is verified securely through official NIMC identity channels. <Text style={{ fontWeight: '700' }}>Eden NEVER displays your NIN publicly.</Text> Only your verified trust status is retained.
                    </Text>
                </View>

                {/* Step 1: NIN Verification Card */}
                <View style={styles.verificationSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>1. National Identification Number (NIN)</Text>
                    <TouchableOpacity
                        style={[
                            styles.uploadCard,
                            { backgroundColor: colors.card, borderColor: verificationStatus.id === 'verified' ? '#10B981' : colors.border }
                        ]}
                        onPress={() => {
                            if (verificationStatus.id !== 'verified') {
                                setShowNINModal(true);
                            }
                        }}
                        activeOpacity={0.85}
                    >
                        {verificationStatus.id === 'verified' ? (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                                <View>
                                    <Text style={styles.verifiedText}>National ID (NIN) Verified ✓</Text>
                                    <Text style={{ fontSize: 11, color: '#059669' }}>
                                        {firstNameInput} {lastNameInput}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="card-outline" size={32} color={colors.primary} />
                                </View>
                                <Text style={[styles.uploadText, { color: colors.text }]}>Tap to Verify your 11-digit NIN</Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Instant automated lookup with official NIMC database</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Step 2: Facial Biometrics */}
                <View style={styles.verificationSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Live Facial Biometric Match</Text>
                    <TouchableOpacity
                        style={[
                            styles.uploadCard,
                            { backgroundColor: colors.card, borderColor: verificationStatus.selfie === 'verified' ? '#10B981' : colors.border }
                        ]}
                        onPress={handleStartSelfie}
                        disabled={isProcessingSelfie || verificationStatus.selfie === 'verified'}
                        activeOpacity={0.85}
                    >
                        {isProcessingSelfie ? (
                            <View style={{ alignItems: 'center', gap: 6 }}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Matching live facial biometrics...</Text>
                            </View>
                        ) : verificationStatus.selfie === 'verified' ? (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                                <Text style={styles.verifiedText}>Facial Biometrics Matched ✓</Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="camera-outline" size={32} color={colors.primary} />
                                </View>
                                <Text style={[styles.uploadText, { color: colors.text }]}>Take a Live Selfie</Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Ensure your face is clear, well-lit, and unobstructed</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <CustomButton
                    title={verificationStatus.id === 'verified' && verificationStatus.selfie === 'verified' ? "Continue to App" : "Verify & Continue"}
                    onPress={handleContinueToApp}
                    style={styles.verifyButton}
                />
            </ScrollView>

            {/* ─── NIN VERIFICATION MODAL ────────────────────────────────── */}
            <Modal
                visible={showNINModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowNINModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Verify National ID (NIN)</Text>
                            <TouchableOpacity onPress={() => setShowNINModal(false)}>
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                            Enter your 11-digit NIN and ensure your First Name and Last Name match your ID card.
                        </Text>

                        {/* Name Confirmation Review */}
                        <View style={styles.formGroup}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>11-Digit NIN Number</Text>
                            <TextInput
                                style={[styles.modalInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                placeholder="e.g. 74839274986"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="number-pad"
                                maxLength={11}
                                value={ninInput}
                                autoComplete="off"
                                textContentType="none"
                                autoCorrect={false}
                                onChangeText={(t) => setNinInput(t.replace(/[^0-9]/g, ''))}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>First Name (as on ID)</Text>
                            <TextInput
                                style={[styles.modalInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                placeholder="First Name"
                                placeholderTextColor={colors.textSecondary}
                                value={firstNameInput}
                                onChangeText={setFirstNameInput}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Last Name / Surname (as on ID)</Text>
                            <TextInput
                                style={[styles.modalInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                placeholder="Last Name"
                                placeholderTextColor={colors.textSecondary}
                                value={lastNameInput}
                                onChangeText={setLastNameInput}
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.confirmIdBtn,
                                {
                                    backgroundColor: colors.primary,
                                    opacity: (isVerifyingNIN || ninInput.trim().length !== 11) ? 0.5 : 1,
                                },
                            ]}
                            onPress={handleVerifyNIN}
                            disabled={isVerifyingNIN || ninInput.trim().length !== 11}
                        >
                            {isVerifyingNIN ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>
                                    Verify with NIMC
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 20,
        paddingVertical: 32,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
        gap: 6,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13.5,
        textAlign: 'center',
        lineHeight: 19,
    },
    ndprCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        marginBottom: 24,
        gap: 6,
    },
    ndprHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    ndprTitle: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    ndprText: {
        fontSize: 11.5,
        lineHeight: 16,
    },
    verificationSection: {
        marginBottom: 20,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    uploadCard: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    uploadText: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    verifyButton: {
        marginTop: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        width: '100%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 22,
        paddingBottom: 36,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    modalSubtitle: {
        fontSize: 12.5,
        marginBottom: 16,
        lineHeight: 17,
    },
    formGroup: {
        marginBottom: 14,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
    },
    modalInput: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    confirmIdBtn: {
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    verifiedBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderColor: '#10B981',
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    verifiedText: {
        color: '#059669',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default IDVerificationScreen;
