import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { handleError } from '../../lib/errorHandler';
// import { configureGoogleSignIn, signInWithGoogle } from '../../lib/google-auth';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../lib/timeout';
import { sanitizeEmail, validateAll, validateEmail, validateRequired } from '../../lib/validation';

// configureGoogleSignIn();

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

    // const handleGoogleLogin = async () => {
    //     setLoading(true);
    //     try {
    //         console.log("handleGoogleLogin: Starting google signin")
    //         const { data, error } = await signInWithGoogle();
    //         if (error) throw error;
    //         console.log("handleGoogleLogin: Google signin success")
    //     } catch (e: any) {
    //         const err = await handleError(e);
    //         console.log(err)
    //         showError(err);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    return (
        <ScreenWrapper withScrollView={false}>
            <View style={styles.container}>
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

                    <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/auth/reset-password')}>
                        <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Forgot Password ?</Text>
                    </TouchableOpacity>

                    <CustomButton
                        title="Login"
                        onPress={handleLogin}
                        style={styles.loginButton}
                        loading={loading}
                    />

                    <TouchableOpacity onPress={() => router.push('/auth/signup')}>
                        <Text style={[styles.signupPrompt, { color: colors.textSecondary }]}>
                            Don't have an Account ? <Text style={[styles.signupLink, { color: colors.primary }]}>Signup</Text>
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomSection}>
                    <View style={styles.dividerContainer}>
                        <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
                    </View>

                    <View style={styles.socialContainer}>
                        <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                            <Image source={require('../../assets/icon/social/apple.png')} style={styles.socialIcon} />
                            <Text style={[styles.socialButtonText, { color: colors.text }]}>Continue with Apple ID</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.socialButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
                            disabled={loading}
                        >
                            <Image source={require('../../assets/icon/social/google.png')} style={styles.socialIcon} />
                            <Text style={[styles.socialButtonText, { color: colors.text }]}>
                                Continue with Google
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 16,
        justifyContent: 'space-around',
    },
    topSection: {
        alignItems: 'center',
    },
    icon: {
        width: 70,
        height: 70,
        marginBottom: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0047AB',
        textAlign: 'center',
    },
    formContainer: {
        gap: 14,
    },
    inputWrapper: {
        height: 52,
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
        marginTop: 6,
    },
    signupPrompt: {
        textAlign: 'center',
        color: '#666',
        fontSize: 14,
        marginTop: 8,
    },
    signupLink: {
        color: '#0047AB',
        fontWeight: '600',
    },
    bottomSection: {
        alignItems: 'stretch',
    },
    dividerContainer: {
        marginVertical: 16,
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
        height: 52,
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
    socialIcon: {
        height: 24,
        width: 24,
    }
});

export default LoginScreen;
