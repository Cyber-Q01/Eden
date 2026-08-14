import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { handleError } from '../../lib/errorHandler';
import { withTimeout } from '../../lib/timeout';

const VerificationScreen = () => {
    const router = useRouter();
    const { email, inviteCode } = useLocalSearchParams<{ email: string; inviteCode?: string }>();
    const { colors } = useTheme();
    const { showError, showSuccess } = useToast();

    const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6-digit OTP
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef<Array<TextInput | null>>([]);

    const handleInputChange = (text: string, index: number) => {
        // Handle Paste (multiple characters)
        if (text.length > 1) {
            const pastedData = text.slice(0, 6).split('');
            const newOtp = [...otp];
            pastedData.forEach((char, i) => {
                if (index + i < 6) newOtp[index + i] = char;
            });
            setOtp(newOtp);
            // Focus last filled or last input
            const lastIndex = Math.min(index + pastedData.length - 1, 5);
            inputRefs.current[lastIndex]?.focus();
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Move to next input if there's text
        if (text && index < 5 && inputRefs.current[index + 1]) {
            inputRefs.current[index + 1]?.focus();
        }
        // Move to previous input if text was deleted (Backspace behavior)
        else if (!text && index > 0 && inputRefs.current[index - 1]) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const token = otp.join('');
        if (token.length !== 6) {
            showError({ type: 'unknown', title: 'Invalid Code', message: 'Please enter a valid 6-digit code.' });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await withTimeout(supabase.auth.verifyOtp({
                email: email as string,
                token,
                type: 'signup'
            }));
            if (error) throw error;
            
            const isAgent = data?.user?.user_metadata?.role === 'AGENT';

            if (isAgent || inviteCode) {
                router.push({
                    pathname: '/auth/accept-invite',
                    params: inviteCode ? { inviteCode } : undefined
                });
            } else {
                router.push('/auth/success');
            }
        } catch (e) {
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) return;
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email as string
            });
            if (error) throw error;
            showSuccess('Verification code resent!');
        } catch (e) {
            const err = await handleError(e);
            showError(err);
        }
    };

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.content}>
                <View style={styles.topSection}>
                    <Text style={[styles.title, { color: colors.primary }]}>Enter Verification Code</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        We just sent 6-digit code to{'\n'}
                        <Text style={[styles.email, { color: colors.text }]}>{email}</Text>, enter it below:
                    </Text>
                </View>

                <View style={styles.codeContainer}>
                    {otp.map((digit, index) => (
                        <ThemedTextInput
                            key={index}
                            containerStyle={styles.codeInputContainer}
                            style={styles.codeInput}
                            keyboardType="number-pad"
                            maxLength={index === 0 ? 6 : 1} // Allow paste into first box
                            value={digit}
                            onChangeText={(text) => handleInputChange(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            ref={(el: any) => inputRefs.current[index] = el}
                            selectTextOnFocus={true}
                        />
                    ))}
                </View>

                <View style={styles.footer}>
                    <CustomButton
                        title={loading ? "Verifying..." : "Verify Code"}
                        onPress={handleVerifyOtp}
                        style={styles.verifyButton}
                        disabled={loading}
                    />

                    <TouchableOpacity onPress={handleResend}>
                        <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                            Didn't receive code ? <Text style={[styles.resendLink, { color: colors.primary }]}>Resend</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
    },
    content: {
        flex: 1,
        paddingTop: 80,
    },
    topSection: {
        alignItems: 'center',
        gap: 16,
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0047AB',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    email: {
        fontWeight: '500',
        color: '#333',
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        gap: 10,
    },
    codeInputContainer: {
        width: 48,
        height: 56,
        paddingHorizontal: 0,
        justifyContent: 'center',
        borderRadius: 12,
    },
    codeInput: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        width: '100%',
    },
    footer: {
        gap: 24,
        alignItems: 'center',
        marginTop: 48,
    },
    verifyButton: {
        width: '100%',
    },
    resendText: {
        color: '#666',
        fontSize: 14,
    },
    resendLink: {
        color: '#0047AB',
        fontWeight: '600',
    },
});

export default VerificationScreen;
