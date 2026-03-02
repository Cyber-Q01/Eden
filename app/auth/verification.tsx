import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useTheme } from '../../context/ThemeContext';

const VerificationScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.content}>
                <View style={styles.topSection}>
                    <Text style={[styles.title, { color: colors.primary }]}>Enter Verification Code</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        We just sent 5-digit code to{'\n'}
                        <Text style={[styles.email, { color: colors.text }]}>sarah.jansen@gmail.com</Text>, enter it below:
                    </Text>
                </View>

                <View style={styles.codeContainer}>
                    {[1, 2, 3, 4, 5].map((_, index) => (
                        <ThemedTextInput
                            key={index}
                            containerStyle={styles.codeInputContainer}
                            style={styles.codeInput}
                            keyboardType="number-pad"
                            maxLength={1}
                        />
                    ))}
                </View>

                <View style={styles.footer}>
                    <CustomButton
                        title="Verify Code"
                        onPress={() => router.push('/auth/success')}
                        style={styles.verifyButton}
                    />

                    <TouchableOpacity onPress={() => { }}>
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
        paddingVertical: 80,
        justifyContent: 'space-between',
    },
    topSection: {
        alignItems: 'center',
        gap: 16,
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
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
    },
    codeInputContainer: {
        width: 60,
        height: 60,
        paddingHorizontal: 0,
        justifyContent: 'center',
    },
    codeInput: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
    },
    footer: {
        gap: 24,
        alignItems: 'center',
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
