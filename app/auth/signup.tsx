import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useTheme } from '../../context/ThemeContext';

const SignupScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.topSection}>
                    <Image
                        source={require('../../assets/images/EdenIcon.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Create your Account</Text>
                </View>

                <View style={styles.formContainer}>
                    <ThemedTextInput
                        placeholder="Email address"
                    />

                    <ThemedTextInput
                        placeholder="Password"
                        secureTextEntry
                        rightIcon={
                            <TouchableOpacity style={styles.eyeIcon}>
                                <Ionicons name="eye-outline" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        }
                    />

                    <ThemedTextInput
                        placeholder="Confirm Password"
                        secureTextEntry
                        rightIcon={
                            <TouchableOpacity style={styles.eyeIcon}>
                                <Ionicons name="eye-outline" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        }
                    />

                    <CustomButton
                        title="Sign Up"
                        onPress={() => router.push('/auth/verification')}
                        style={styles.signupButton}
                    />

                    <TouchableOpacity onPress={() => router.push('/auth/login')}>
                        <Text style={[styles.loginPrompt, { color: colors.textSecondary }]}>
                            Already have an Account ? <Text style={[styles.loginLink, { color: colors.primary }]}>Login</Text>
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.dividerContainer}>
                    <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
                </View>

                <View style={styles.socialContainer}>
                    <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                        <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                        <Text style={[styles.socialButtonText, { color: colors.text }]}>Continue with Facebook</Text>
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
    signupButton: {
        marginTop: 20,
    },
    loginPrompt: {
        textAlign: 'center',
        color: '#666',
        fontSize: 14,
        marginTop: 10,
    },
    loginLink: {
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

export default SignupScreen;
