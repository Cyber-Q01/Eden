import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useTheme } from '../../context/ThemeContext';

const NewPasswordScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.content}>
                <View style={styles.topSection}>
                    <Text style={[styles.title, { color: colors.primary }]}>Create New Password</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Your new password must be different from{'\n'}the old one
                    </Text>
                </View>

                <View style={styles.formContainer}>
                    <ThemedTextInput
                        placeholder="Enter new password"
                        secureTextEntry
                        rightIcon={
                            <TouchableOpacity style={styles.eyeIcon}>
                                <Ionicons name="eye-outline" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        }
                    />

                    <ThemedTextInput
                        placeholder="Renter new Password"
                        secureTextEntry
                        rightIcon={
                            <TouchableOpacity style={styles.eyeIcon}>
                                <Ionicons name="eye-outline" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        }
                    />

                    <CustomButton
                        title="Reset Password"
                        onPress={() => router.push('/auth/login')}
                        style={styles.resetButton}
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
    content: {
        flex: 1,
        paddingVertical: 60,
    },
    topSection: {
        alignItems: 'center',
        marginBottom: 48,
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
    formContainer: {
        gap: 20,
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
    resetButton: {
        marginTop: 20,
    },
});

export default NewPasswordScreen;
