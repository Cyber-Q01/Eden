import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BackButton from '../../components/BackButton';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { handleError } from '../../lib/errorHandler';
import { supabase } from '../../lib/supabase';
import { sanitizeEmail, validateEmail } from '../../lib/validation';

const ResetPasswordScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { showError, showSuccess } = useToast();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendCode = async () => {
        const emailError = validateEmail(email);
        if (emailError) {
            showError({ type: 'unknown', title: 'Validation Error', message: emailError });
            return;
        }

        setLoading(true);
        try {
            const cleanEmail = sanitizeEmail(email);
            const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
            if (error) throw error;

            showSuccess('Reset code sent to your email!');
            router.push({
                pathname: '/auth/forgot-password-verification',
                params: { email: cleanEmail },
            });
        } catch (e: any) {
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.header}>
                <BackButton />
            </View>

            <View style={styles.content}>
                <View style={styles.topSection}>
                    <Image
                        source={require('../../assets/images/EdenIcon.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                    <Text style={[styles.title, { color: colors.primary }]}>Reset Your Password</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Enter the email address associated with your account and we'll send you a verification code.
                    </Text>
                </View>

                <View style={styles.formContainer}>
                    <ThemedTextInput
                        placeholder="Email address"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <View style={styles.buttonGroup}>
                        <CustomButton
                            title={loading ? "Sending..." : "Send Code"}
                            onPress={handleSendCode}
                            disabled={loading}
                        />

                        <TouchableOpacity
                            style={[styles.backToLoginButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => router.back()}
                        >
                            <Text style={[styles.backToLoginText, { color: colors.primary }]}>Back to Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
    },
    header: {
        paddingTop: 16,
    },
    content: {
        flex: 1,
        paddingVertical: 40,
    },
    topSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    icon: {
        width: 80,
        height: 80,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 16,
    },
    formContainer: {
        gap: 24,
    },
    buttonGroup: {
        gap: 16,
    },
    backToLoginButton: {
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    backToLoginText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ResetPasswordScreen;
