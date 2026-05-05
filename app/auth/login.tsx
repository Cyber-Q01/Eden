import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { handleError } from '../../lib/errorHandler';
import { sanitizeEmail, validateEmail, validateRequired, validateAll } from '../../lib/validation';
import { withTimeout } from '../../lib/timeout';

const LoginScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { showError } = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        const validationError = validateAll([
            { check: () => validateEmail(email) },
            { check: () => validateRequired(password, 'Password') },
        ]);
        if (validationError) {
            showError({ type: 'unknown', title: 'Validation Error', message: validationError });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await withTimeout(supabase.auth.signInWithPassword({
                email: sanitizeEmail(email),
                password,
            }));
            if (error) throw error;
            // Routing is handled automatically by _layout.tsx based on AuthContext state
        } catch (e: any) {
            const msg = e?.message?.toLowerCase() ?? '';
            if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
                showError({ type: 'auth', title: 'Login Failed', message: 'Incorrect email or password. Please try again.' });
            } else if (msg.includes('email not confirmed')) {
                showError({ type: 'auth', title: 'Email Not Verified', message: 'Please check your inbox and verify your email before logging in.' });
            } else {
                const err = await handleError(e);
                showError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.topSection}>
                    <Image
                        source={require('../../assets/images/EdenIcon.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                    <Text style={[styles.title, { color: colors.primary }]}>Welcome Back</Text>
                </View>

                <View style={styles.formContainer}>
                    <ThemedTextInput
                        placeholder="Email address"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize={'none'}
                        keyboardType="email-address"
                    />

                    <ThemedTextInput
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        rightIcon={
                            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        }
                    />

                    <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/auth/new-password')}>
                        <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Forgot Password ?</Text>
                    </TouchableOpacity>

                    <CustomButton
                        title={loading ? "Logging in..." : "Login"}
                        onPress={handleLogin}
                        style={styles.loginButton}
                        disabled={loading}
                    />

                    <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                        <Text style={[styles.signupPrompt, { color: colors.textSecondary }]}>
                            Don't have an Account ? <Text style={[styles.signupLink, { color: colors.primary }]}>Signup</Text>
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.dividerContainer}>
                    <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
                </View>

                <View style={styles.socialContainer}>
                    <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                        <Ionicons name="logo-apple" size={24} color={colors.text} />
                        <Text style={[styles.socialButtonText, { color: colors.text }]}>Continue with Apple ID</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                        <Image
                            source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }}
                            style={{ width: 24, height: 24 }}
                        />
                        <Text style={[styles.socialButtonText, { color: colors.text }]}>Continue with Google</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    topSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    icon: {
        width: 80,
        height: 80,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0047AB',
        textAlign: 'center',
    },
    formContainer: {
        gap: 16,
    },
    inputWrapper: {
        height: 56,
        borderWidth: 1,
        borderColor: '#0047AB',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    eyeIcon: {
        padding: 8,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
    },
    forgotPasswordText: {
        color: '#0047AB',
        fontSize: 14,
        fontWeight: '500',
    },
    loginButton: {
        marginTop: 10,
    },
    signupPrompt: {
        textAlign: 'center',
        color: '#666',
        fontSize: 14,
        marginTop: 10,
    },
    signupLink: {
        color: '#0047AB',
        fontWeight: '600',
    },
    dividerContainer: {
        marginVertical: 30,
        alignItems: 'center',
    },
    dividerText: {
        color: '#666',
        fontSize: 16,
    },
    socialContainer: {
        gap: 12,
    },
    socialButton: {
        height: 56,
        borderWidth: 1,
        borderColor: '#0047AB',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
    },
    socialButtonText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
});

export default LoginScreen;
