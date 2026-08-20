import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { handleError } from '../../lib/errorHandler';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../lib/timeout';
import { sanitizeEmail, validateAll, validateEmail, validatePassword } from '../../lib/validation';

const PRIVACY_URL = 'https://web-portal-eta-smoky.vercel.app/privacy';
const TERMS_URL = 'https://web-portal-eta-smoky.vercel.app/terms';

const SignupScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showError, showSuccess } = useToast();

    const { inviteCode } = useLocalSearchParams<{ inviteCode?: string }>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedType, setSelectedType] = useState<'tenant' | 'landlord' | 'agent'>(inviteCode ? 'agent' : 'tenant');
    const [agreed, setAgreed] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (inviteCode) {
            setSelectedType('agent');
        }
    }, [inviteCode]);

    const openLegalLink = async (url: string) => {
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                showError({ type: 'unknown', title: 'Cannot Open Link', message: 'Please visit ' + url });
            }
        } catch {
            await Linking.openURL(url);
        }
    };

    const handleSignup = async () => {
        if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
            showError({ type: 'unknown', title: 'Missing Fields', message: 'Please enter your email, password, and confirm password.' });
            return;
        }

        if (password !== confirmPassword) {
            showError({ type: 'unknown', title: 'Password Mismatch', message: 'Your passwords do not match. Please re-enter.' });
            return;
        }

        const error = validateAll([
            { check: () => validateEmail(email) },
            { check: () => validatePassword(password) },
        ]);
        if (error) {
            showError({ type: 'unknown', title: 'Validation Error', message: error });
            return;
        }
        if (!agreed) {
            showError({ type: 'unknown', title: 'Agreement Required', message: 'Please agree to Eden’s Privacy Policy and Terms of Use to proceed.' });
            return;
        }

        const cleanEmail = sanitizeEmail(email);

        setLoading(true);
        try {
            const { data, error: authError } = await withTimeout(supabase.auth.signUp({
                email: cleanEmail,
                password,
                options: {
                    data: {
                        role: selectedType.toUpperCase(),
                    }
                }
            }));
            if (authError) throw authError;
            showSuccess('Check your email for the verification code.');
            
            if (selectedType === 'agent') {
                router.push({ 
                    pathname: '/auth/verification', 
                    params: { 
                        email: cleanEmail,
                        inviteCode: inviteCode 
                    } 
                });
            } else {
                router.push({ pathname: '/auth/verification', params: { email: cleanEmail } });
            }
        } catch (e) {
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper withScrollView={true}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    style={{ backgroundColor: 'transparent' }}
                >
                    <View style={styles.header}>
                        <Text style={[styles.mainTitle, { color: colors.text }]}>Create Account</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Join Eden — safe real estate &amp; escrow protection</Text>
                    </View>

                    {/* Role Selection */}
                    <View style={styles.roleSelectionContainer}>
                        <Text style={[styles.label, { color: colors.text }]}>I am a...</Text>
                        <View style={styles.roleCardsRow}>
                            <TouchableOpacity
                                style={[
                                    styles.roleCard,
                                    { backgroundColor: colors.card, borderColor: colors.border },
                                    selectedType === 'tenant' && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                                onPress={() => setSelectedType('tenant')}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name="person"
                                    size={20}
                                    color={selectedType === 'tenant' ? '#FFF' : colors.textSecondary}
                                />
                                <Text style={[styles.roleTitle, { color: colors.primary }, selectedType === 'tenant' && { color: '#FFF' }]}>Tenant</Text>
                                <Text style={[styles.roleDesc, { color: colors.textSecondary }, selectedType === 'tenant' && { color: '#FFF' }]}>Looking for a home</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.roleCard,
                                    { backgroundColor: colors.card, borderColor: colors.border },
                                    selectedType === 'landlord' && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                                onPress={() => setSelectedType('landlord')}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name="home"
                                    size={20}
                                    color={selectedType === 'landlord' ? '#FFF' : colors.textSecondary}
                                />
                                <Text style={[styles.roleTitle, { color: colors.primary }, selectedType === 'landlord' && { color: '#FFF' }]}>Landlord</Text>
                                <Text style={[styles.roleDesc, { color: colors.textSecondary }, selectedType === 'landlord' && { color: '#FFF' }]}>I have a property</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.formContainer}>
                        <ThemedTextInput
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize={'none'}
                            keyboardType="email-address"
                        />

                        <ThemedTextInput
                            placeholder="Create a password (min. 6 characters)"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            rightIcon={
                                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            }
                        />

                        <ThemedTextInput
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showConfirmPassword}
                            rightIcon={
                                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            }
                        />

                        {/* Interactive Privacy Policy & Terms of Service Checkbox */}
                        <View style={styles.termsRow}>
                            <TouchableOpacity
                                style={[
                                    styles.checkbox,
                                    { backgroundColor: colors.card, borderColor: colors.border },
                                    agreed && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                                onPress={() => setAgreed(!agreed)}
                                activeOpacity={0.8}
                            >
                                {agreed && <Ionicons name="checkmark" size={14} color="#FFF" />}
                            </TouchableOpacity>

                            <View style={{ flex: 1 }}>
                                <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                                    I agree to Eden&apos;s{' '}
                                    <Text
                                        style={[styles.termsLink, { color: colors.primary }]}
                                        onPress={() => openLegalLink(TERMS_URL)}
                                    >
                                        Terms of Service
                                    </Text>
                                    {' '}and{' '}
                                    <Text
                                        style={[styles.termsLink, { color: colors.primary }]}
                                        onPress={() => openLegalLink(PRIVACY_URL)}
                                    >
                                        Privacy Policy
                                    </Text>
                                </Text>
                            </View>
                        </View>

                        <CustomButton
                            title={loading ? "Creating Account..." : "Sign Up"}
                            onPress={handleSignup}
                            style={styles.signupButton}
                            disabled={loading}
                        />

                        <TouchableOpacity onPress={() => router.push('/auth/login')}>
                            <Text style={[styles.loginPrompt, { color: colors.textSecondary }]}>
                                Already have an Account? <Text style={[styles.loginLink, { color: colors.primary }]}>Log In</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 48,
        paddingTop: 50,
        flexGrow: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: 28,
        gap: 6,
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    roleSelectionContainer: {
        marginBottom: 26,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    roleCardsRow: {
        flexDirection: 'row',
        gap: 14,
    },
    roleCard: {
        flex: 1,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    roleTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 6,
    },
    roleDesc: {
        fontSize: 11.5,
        textAlign: 'center',
        marginTop: 2,
    },
    formContainer: {
        gap: 16,
    },
    eyeIcon: {
        padding: 8,
    },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginVertical: 4,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    termsText: {
        fontSize: 13,
        lineHeight: 18,
    },
    termsLink: {
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    signupButton: {
        marginTop: 8,
    },
    loginPrompt: {
        textAlign: 'center',
        fontSize: 14,
        marginTop: 8,
    },
    loginLink: {
        fontWeight: '700',
    },
});

export default SignupScreen;
