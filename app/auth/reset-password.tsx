import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useTheme } from '../../context/ThemeContext';

const ResetPasswordScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.content}>
                <View style={styles.topSection}>
                    <Image
                        source={require('../../assets/images/EdenIcon.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                    <Text style={[styles.title, { color: colors.primary }]}>Reset Your Password</Text>
                </View>

                <View style={styles.formContainer}>
                    <ThemedTextInput
                        placeholder="Email address"
                    />

                    <View style={styles.buttonGroup}>
                        <CustomButton
                            title="Send Code"
                            onPress={() => router.push('/auth/verification')}
                        />

                        <TouchableOpacity
                            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => router.back()}
                        >
                            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back to Login</Text>
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
    content: {
        flex: 1,
        paddingVertical: 60,
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
        color: '#0047AB',
        textAlign: 'center',
    },
    formContainer: {
        gap: 24,
    },
    inputWrapper: {
        height: 56,
        borderWidth: 1,
        borderColor: '#0047AB',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    input: {
        fontSize: 16,
        color: '#333',
    },
    buttonGroup: {
        gap: 16,
    },
    backButton: {
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    backButtonText: {
        color: '#0047AB',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ResetPasswordScreen;
