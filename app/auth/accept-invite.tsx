import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useAgentManagement } from '../../hooks/useAgentManagement';
import { useAuth } from '../../context/AuthContext';
import ThemedTextInput from '../../components/ThemedTextInput';
import CustomButton from '../../components/CustomButton';

const AcceptInviteScreen = () => {
    const router = useRouter();
    const { inviteCode: paramInviteCode } = useLocalSearchParams<{ inviteCode?: string }>();
    const { colors } = useTheme();
    const { acceptInvite, loading: inviteLoading } = useAgentManagement();
    const { refreshBiodataStatus, session, loading: authLoading, completedBiodata } = useAuth();
    const [inviteCode, setInviteCode] = useState(paramInviteCode || '');

    const handleSubmit = async () => {
        if (!inviteCode.trim()) return;

        if (authLoading) return; // Wait for auth to settle
        
        if (!session) {
            router.push({
                pathname: '/auth/signup',
                params: { inviteCode: inviteCode.trim().toUpperCase() }
            });
            return;
        }

        const success = await acceptInvite(inviteCode.trim().toUpperCase());
        if (success) {
            await refreshBiodataStatus();
            if (completedBiodata) {
                router.replace('/landlord');
            } else {
                router.replace('/auth/success');
            }
        }
    };

    const handleSkip = () => {
        router.replace('/auth/success');
    };

    if (authLoading) {
        return (
            <ScreenWrapper>
                <View style={[styles.centered, { backgroundColor: colors.background }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Image
                        source={require('../../assets/images/EdenIcon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={[styles.title, { color: colors.primary }]}>Enter Invite Code</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Enter the 8-character code shared by your landlord to link your account.
                    </Text>
                </View>

                <View style={styles.form}>
                    <ThemedTextInput
                        placeholder="Invite Code (e.g. AB12CD34)"
                        value={inviteCode}
                        onChangeText={setInviteCode}
                        autoCapitalize="characters"
                        maxLength={8}
                        style={styles.input}
                    />

                    <CustomButton
                        title="Link Account"
                        onPress={handleSubmit}
                        loading={inviteLoading}
                        disabled={inviteCode.length < 4}
                        style={styles.button}
                    />

                    {!completedBiodata && (
                        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip for now</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            {session?.user?.user_metadata?.role === 'AGENT'
                                ? "Linking your account will give you access to manage properties assigned to you by this new landlord."
                                : "Linking your account will change your role to Agent and give you access to manage properties assigned to you."}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    form: {
        gap: 20,
    },
    input: {
        textAlign: 'center',
        fontSize: 20,
        letterSpacing: 2,
        fontWeight: '700',
    },
    button: {
        marginTop: 10,
    },
    infoBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
        gap: 12,
        marginTop: 20,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipButton: {
        alignItems: 'center',
        marginTop: 4,
    },
    skipText: {
        fontSize: 15,
        textDecorationLine: 'underline',
    },
});

export default AcceptInviteScreen;
