import { Ionicons } from '@expo/vector-icons';
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

const NewPasswordScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { showError, showSuccess } = useToast();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!password || password.length < 6) {
            showError({ type: 'unknown', title: 'Validation Error', message: 'Password must be at least 6 characters.' });
            return;
        }

        if (password !== confirmPassword) {
            showError({ type: 'unknown', title: 'Validation Error', message: 'Passwords do not match.' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            showSuccess('Password reset successfully!');
            // Sign out the user so they can log in with new password
            await supabase.auth.signOut();
            router.replace('/auth/login');
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
                    <Text style={[styles.title, { color: colors.primary }]}>Create New Password</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Your new password must be different from{'\n'}the old one
                    </Text>
                </View>

                <View style={styles.formContainer}>
                    <ThemedTextInput
                        placeholder="Enter new password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        rightIcon={
                            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        }
                    />

                    <ThemedTextInput
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        rightIcon={
                            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        }
                    />

                    <CustomButton
                        title={loading ? "Resetting..." : "Reset Password"}
                        onPress={handleResetPassword}
                        style={styles.resetButton}
                        disabled={loading}
                    />
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
        marginBottom: 48,
        gap: 12,
    },
    icon: {
        width: 70,
        height: 70,
        marginBottom: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    formContainer: {
        gap: 20,
    },
    eyeIcon: {
        padding: 8,
    },
    resetButton: {
        marginTop: 20,
    },
});

export default NewPasswordScreen;
