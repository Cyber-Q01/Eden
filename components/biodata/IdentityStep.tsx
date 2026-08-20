import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { callEdgeFunction } from '../../lib/api';
import { BiodataForm, ModalKeys } from '../../types/biodata';
import { FieldLabel, SectionTitle } from './BiodataFormElements';

type Props = {
    form: BiodataForm;
    updateForm: (key: keyof BiodataForm, value: any) => void;
    openModal: (key: ModalKeys) => void;
};

const IdentityStep = ({ form, updateForm }: Props) => {
    const { colors, isDark } = useTheme();
    const { showSuccess, showError } = useToast();
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState<string | null>(null);

    const handleTriggerNINVerification = async () => {
        const nin = (form.id_number || '').trim();

        if (!nin || nin.length !== 11) {
            Alert.alert('Invalid NIN', 'Please enter your 11-digit National Identification Number.');
            return;
        }

        if (!form.first_name?.trim() || !form.last_name?.trim()) {
            Alert.alert(
                'Names Missing',
                'Please go back to Step 1 (Personal Info) and fill in your First Name and Last Name as on your ID before verifying.'
            );
            return;
        }

        setIsVerifying(true);
        setVerificationError(null);

        try {
            const response = await callEdgeFunction<{
                success: boolean;
                message?: string;
                data?: {
                    is_verified?: boolean;
                    firstName?: string;
                    lastName?: string;
                    first_name?: string;
                    last_name?: string;
                };
            }>(
                'verify-nin',
                'POST',
                {
                    nin: nin,
                    first_name: form.first_name.trim(),
                    last_name: form.last_name.trim(),
                    dob: form.dob || '',
                    method: 'nin',
                }
            );

            if (response?.success) {
                updateForm('is_nin_verified', true);
                updateForm('id_type', 'NIN');
                const verifiedFirst = response.data?.first_name || response.data?.firstName;
                const verifiedLast = response.data?.last_name || response.data?.lastName;
                if (verifiedFirst) updateForm('first_name', verifiedFirst);
                if (verifiedLast) updateForm('last_name', verifiedLast);
                showSuccess('National ID Verified Successfully! 🎉');
            } else {
                setVerificationError('Could not verify NIN record with NIMC database.');
            }
        } catch (error: any) {
            console.error('[NIN Verification Error]:', error);
            const msg = error?.message || 'NIN verification failed';
            setVerificationError(msg);

            if (msg.includes('Name Mismatch') || msg.includes('Date of Birth Mismatch')) {
                Alert.alert(
                    'Identity Mismatch ⚠️',
                    'The First Name, Last Name, or Date of Birth you entered does not match your official NIMC National ID record.\n\nPlease go back to Step 1 and make sure your names and Date of Birth match your National ID card exactly.',
                    [{ text: 'Review Step 1 Names' }]
                );
            } else if (msg.includes('Duplicate Identity')) {
                Alert.alert(
                    'Duplicate Identity ⚠️',
                    'This National Identification Number (NIN) is already registered on another Eden account. Each user may only operate one account.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Verification Failed', msg);
            }
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <View style={styles.stepContent}>
            <SectionTitle
                title="National ID (NIN) Verification"
                subtitle="Instant automated identity lookup with official NIMC database"
            />

            {/* NDPR Privacy & Data Protection Banner */}
            <View style={[styles.ndprCard, { backgroundColor: isDark ? '#0c1844' : '#EFF6FF', borderColor: isDark ? '#1e3a8a' : '#BFDBFE' }]}>
                <View style={styles.ndprHeader}>
                    <Ionicons name="shield-checkmark" size={18} color="#1D4ED8" />
                    <Text style={[styles.ndprTitle, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                        NDPR 2023 Compliant • Transient Verification
                    </Text>
                </View>
                <Text style={[styles.ndprText, { color: isDark ? '#BFDBFE' : '#1E3A8A' }]}>
                    Your 11-digit NIN is verified directly with the official NIMC database. <Text style={{ fontWeight: '700' }}>Eden NEVER stores your plaintext NIN in our database.</Text>
                </Text>
            </View>

            {/* Legal Name Summary Review Card */}
            <View style={[styles.nameReviewBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.nameReviewLabel, { color: colors.textSecondary }]}>Legal Identity on Record:</Text>
                <Text style={[styles.nameReviewValue, { color: colors.text }]}>
                    {form.first_name || 'First Name'} {form.last_name || 'Last Name'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    DOB: {form.dob || 'Not set'} • If incorrect, tap &apos;Back&apos; to edit in Step 1
                </Text>
            </View>

            {/* 11-digit NIN Input Group */}
            <View style={styles.inputGroup}>
                <FieldLabel>11-Digit National Identification Number (NIN)</FieldLabel>
                <TextInput
                    style={[
                        styles.ninInput,
                        {
                            borderColor: form.is_nin_verified ? '#10B981' : colors.border,
                            color: colors.text,
                            backgroundColor: colors.card,
                        },
                    ]}
                    placeholder="e.g. 74839274986"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={11}
                    value={form.id_number}
                    onChangeText={(t) => {
                        updateForm('id_number', t);
                        if (form.is_nin_verified) {
                            updateForm('is_nin_verified', false);
                        }
                    }}
                />
            </View>

            {/* Verification Trigger Button */}
            {!form.is_nin_verified ? (
                <TouchableOpacity
                    style={[styles.verifyBtn, { backgroundColor: colors.primary }]}
                    onPress={handleTriggerNINVerification}
                    disabled={isVerifying || (form.id_number || '').trim().length !== 11}
                    activeOpacity={0.85}
                >
                    {isVerifying ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <ActivityIndicator size="small" color="#FFF" />
                            <Text style={styles.verifyBtnText}>Checking NIMC Database...</Text>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="shield-checkmark-outline" size={18} color="#FFF" />
                            <Text style={styles.verifyBtnText}>Verify NIN with NIMC</Text>
                        </View>
                    )}
                </TouchableOpacity>
            ) : (
                <View style={styles.verifiedBadgeCard}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.verifiedTitle}>NIN Identity Verified ✓</Text>
                        <Text style={styles.verifiedSub}>
                            NIMC record confirmed for {form.first_name} {form.last_name}
                        </Text>
                    </View>
                </View>
            )}

            {/* Error Display if any */}
            {verificationError && !form.is_nin_verified && (
                <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color="#EF4444" />
                    <Text style={styles.errorText}>{verificationError}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    stepContent: { paddingTop: 8 },
    ndprCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        marginBottom: 16,
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
    nameReviewBox: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 18,
    },
    nameReviewLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    nameReviewValue: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 2,
    },
    inputGroup: { marginBottom: 16 },
    ninInput: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 16,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 2,
    },
    verifyBtn: {
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
        shadowColor: '#1D4ED8',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
    },
    verifyBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    verifiedBadgeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#ECFDF5',
        borderWidth: 1.5,
        borderColor: '#10B981',
        marginTop: 6,
    },
    verifiedTitle: {
        color: '#059669',
        fontSize: 14,
        fontWeight: '800',
    },
    verifiedSub: {
        color: '#047857',
        fontSize: 12,
        marginTop: 1,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        marginTop: 12,
    },
    errorText: {
        color: '#DC2626',
        fontSize: 12,
        flex: 1,
        lineHeight: 17,
        fontWeight: '500',
    },
});

export default IdentityStep;
