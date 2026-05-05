import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { handleError } from '../../lib/errorHandler';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../lib/timeout';
import { sanitizeEmail, sanitizeName, validateAll, validateEmail, validateName, validatePassword } from '../../lib/validation';

const SignupScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showError, showSuccess } = useToast();

    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [selectedType, setSelectedType] = useState<'tenant' | 'landlord'>('tenant');
    const [agreed, setAgreed] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        const error = validateAll([
            { check: () => validateName(fullName, 'Full name') },
            { check: () => validateEmail(email) },
            { check: () => validatePassword(password) },
        ]);
        if (error) {
            showError({ type: 'unknown', title: 'Validation Error', message: error });
            return;
        }
        if (!agreed) {
            showError({ type: 'unknown', title: 'Terms Required', message: 'Please agree to the Terms & conditions.' });
            return;
        }

        const nameParts = fullName.trim().split(' ');
        const cleanFirst = sanitizeName(nameParts[0]);
        const cleanLast = sanitizeName(nameParts.slice(1).join(' ') || '');
        const cleanEmail = sanitizeEmail(email);

        setLoading(true);
        try {
            const { data, error: authError } = await withTimeout(supabase.auth.signUp({
                email: cleanEmail,
                password,
                options: {
                    data: {
                        firstName: cleanFirst,
                        lastName: cleanLast,
                        role: selectedType.toUpperCase()
                    }
                }
            }));
            if (authError) throw authError;
            showSuccess('Check your email for the verification code.');
            router.push({ pathname: '/auth/verification', params: { email: cleanEmail } });
        } catch (e) {
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper style={{ backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={[styles.mainTitle, { color: colors.text }]}>Create Account</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Join Eden-no agents, no stress</Text>
                </View>

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

                <View style={styles.formContainer}>
                    <ThemedTextInput
                        placeholder="Full Name"
                        value={fullName}
                        onChangeText={setFullName}
                    // containerStyle={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                    />

                    <ThemedTextInput
                        placeholder="Enter your email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize={'none'}
                        keyboardType="email-address"
                    // containerStyle={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                    />

                    <ThemedTextInput
                        placeholder="Create a password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        // containerStyle={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                        rightIcon={
                            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        }
                    />

                    <TouchableOpacity
                        style={styles.termsContainer}
                        onPress={() => setAgreed(!agreed)}
                    >
                        <View style={[
                            styles.checkbox,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            agreed && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}>
                            {agreed && <Ionicons name="checkmark" size={14} color="#FFF" />}
                        </View>
                        <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                            I agree to Eden's <Text style={[styles.termsLink, { color: colors.primary }]}>Terms & conditions</Text>
                        </Text>
                    </TouchableOpacity>

                    <CustomButton
                        title={loading ? "Creating Account..." : "Sign Up"}
                        onPress={handleSignup}
                        style={[styles.signupButton]}
                        disabled={loading}
                    />

                    <TouchableOpacity onPress={() => router.push('/auth/login')}>
                        <Text style={[styles.loginPrompt, { color: colors.textSecondary }]}>
                            Already have an Account ? <Text style={[styles.loginLink, { color: colors.primary }]}>Log In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    mainTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
    },
    roleSelectionContainer: {
        marginBottom: 32,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    roleCardsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    roleCard: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    roleTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 8,
    },
    roleDesc: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
    },
    formContainer: {
        gap: 20,
    },
    input: {
        borderRadius: 12,
        borderWidth: 1,
        height: 60,
    },
    eyeIcon: {
        padding: 8,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    termsText: {
        fontSize: 14,
    },
    termsLink: {
        fontWeight: '600',
    },
    signupButton: {

        marginTop: 10,
    },
    loginPrompt: {
        textAlign: 'center',
        fontSize: 15,
    },
    loginLink: {
        fontWeight: '700',
    },
});

export default SignupScreen;
