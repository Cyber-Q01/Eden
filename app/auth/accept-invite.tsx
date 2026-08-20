import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TextInput,
    Linking,
    Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useAgentManagement } from '../../hooks/useAgentManagement';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

export default function AcceptInviteScreen() {
    const router = useRouter();
    const { inviteCode: paramInviteCode } = useLocalSearchParams<{ inviteCode?: string }>();
    const { colors, isDark } = useTheme();
    const { showError, showSuccess } = useToast();
    const { acceptInvite, loading: inviteLoading } = useAgentManagement();
    const { refreshBiodataStatus, session, loading: authLoading, completedBiodata } = useAuth();

    // 6 individual character slots for the invite code (e.g. ['A', 'B', '1', '2', '3', ''])
    const [codeSlots, setCodeSlots] = useState<string[]>(['', '', '', '', '', '']);
    const inputRefs = useRef<Array<TextInput | null>>([]);

    useEffect(() => {
        if (paramInviteCode) {
            const clean = paramInviteCode.toUpperCase().slice(0, 6);
            const slots = clean.split('');
            while (slots.length < 6) slots.push('');
            setCodeSlots(slots);
        }
    }, [paramInviteCode]);

    const handleSlotChange = (text: string, index: number) => {
        // Handle Paste (multi-character input)
        if (text.length > 1) {
            const pasted = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
            const newSlots = [...codeSlots];
            pasted.split('').forEach((char, i) => {
                if (index + i < 6) newSlots[index + i] = char;
            });
            setCodeSlots(newSlots);
            const nextIdx = Math.min(index + pasted.length, 5);
            inputRefs.current[nextIdx]?.focus();
            return;
        }

        const cleanChar = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const newSlots = [...codeSlots];
        newSlots[index] = cleanChar;
        setCodeSlots(newSlots);

        // Auto-advance to next box if character was entered
        if (cleanChar && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace') {
            if (!codeSlots[index] && index > 0) {
                const newSlots = [...codeSlots];
                newSlots[index - 1] = '';
                setCodeSlots(newSlots);
                inputRefs.current[index - 1]?.focus();
            }
        }
    };

    const handlePasteCode = async () => {
        try {
            const text = await Clipboard.getStringAsync();
            if (text) {
                const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                if (clean.length > 0) {
                    const slots = clean.split('');
                    while (slots.length < 6) slots.push('');
                    setCodeSlots(slots);
                    showSuccess(`Pasted code: ${clean}`);
                    inputRefs.current[Math.min(clean.length, 5)]?.focus();
                } else {
                    showError({ type: 'unknown', title: 'Clipboard Empty', message: 'No valid code found on your clipboard.' });
                }
            }
        } catch (err) {
            showError({ type: 'unknown', title: 'Paste Error', message: 'Could not access clipboard.' });
        }
    };

    const handleAskLandlordWhatsApp = () => {
        const url = 'https://wa.me/?text=Hello!%20Please%20generate%20a%206-character%20Agent%20Invite%20Code%20for%20me%20from%20your%20Eden%20Landlord%20Profile%20so%20I%20can%20link%20my%20account.';
        Linking.openURL(url).catch(() => {
            Alert.alert('Notice', 'Ask your landlord to generate an Agent Code from their Landlord Profile > Manage Agents.');
        });
    };

    const fullCode = codeSlots.join('').trim().toUpperCase();
    const isCodeComplete = fullCode.length === 6;

    const handleSubmit = async () => {
        if (!isCodeComplete) {
            showError({ type: 'unknown', title: 'Incomplete Code', message: 'Please enter all 6 characters of your agent invite code.' });
            return;
        }

        if (authLoading) return;

        if (!session) {
            router.push({
                pathname: '/auth/signup',
                params: { inviteCode: fullCode }
            });
            return;
        }

        const success = await acceptInvite(fullCode);
        if (success) {
            await refreshBiodataStatus();
            if (completedBiodata) {
                router.replace('/landlord');
            } else {
                router.replace('/auth/success');
            }
        }
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
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Back Button */}
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>

                    {/* Top Logo Icon */}
                    <View style={styles.topLogoWrap}>
                        <View style={styles.circleLogo}>
                            <View style={styles.innerHouseIcon}>
                                <Ionicons name="home" size={28} color="#FFFFFF" />
                            </View>
                        </View>
                    </View>

                    {/* Header Text */}
                    <Text style={[styles.mainTitle, { color: '#0F172A' }]}>Link Your Account</Text>
                    <Text style={styles.subtitle}>
                        Enter the 6-character invite code shared by your landlord to link your account as an agent.
                    </Text>

                    {/* 6 Individual Code Boxes */}
                    <View style={styles.codeSlotsRow}>
                        {codeSlots.map((char, index) => {
                            const isFocused = Boolean(char) || (index === 0 && !codeSlots[0]);
                            return (
                                <View
                                    key={index}
                                    style={[
                                        styles.slotBox,
                                        {
                                            backgroundColor: '#FFFFFF',
                                            borderColor: char ? '#1D4ED8' : '#CBD5E1',
                                            borderWidth: char ? 2 : 1.5,
                                        }
                                    ]}
                                >
                                    <TextInput
                                        ref={(ref) => {
                                            inputRefs.current[index] = ref;
                                        }}
                                        value={char}
                                        onChangeText={(t) => handleSlotChange(t, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        style={styles.slotInput}
                                        maxLength={6}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        keyboardType="default"
                                        selectTextOnFocus={true}
                                    />
                                </View>
                            );
                        })}
                    </View>

                    {/* Character Helper Hint */}
                    <View style={styles.hintRow}>
                        <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                        <Text style={styles.hintText}>6 characters-letters and numbers</Text>
                    </View>

                    {/* Paste Code Button */}
                    <TouchableOpacity
                        style={styles.pasteCodeBtn}
                        onPress={handlePasteCode}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="copy-outline" size={16} color="#1D4ED8" />
                        <Text style={styles.pasteCodeBtnText}>Paste Code</Text>
                    </TouchableOpacity>

                    {/* Divider: ─── or ─── */}
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Card 1: Don't have a code? */}
                    <View style={styles.infoCard}>
                        <Text style={styles.infoCardTitle}>Don&apos;t have a code?</Text>
                        <Text style={styles.infoCardDesc}>
                            Ask your landlord to go to their profile, Generate Agent Code. They&apos;ll share a 6-character code with you
                        </Text>
                        <TouchableOpacity
                            style={styles.whatsAppRow}
                            onPress={handleAskLandlordWhatsApp}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
                            <Text style={styles.whatsAppText}>Landlord can share via WhatsApp</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Card 2: Role Change Warning */}
                    <View style={styles.warningCard}>
                        <Ionicons name="warning-outline" size={20} color="#D97706" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.warningCardLabel}>Your role will change</Text>
                            <Text style={styles.warningCardDesc}>
                                Linking this code will change your role to agent. You will manage this landlord&apos;s assigned properties.
                            </Text>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom Floating Action Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[
                        styles.linkAccountBtn,
                        { backgroundColor: isCodeComplete ? '#1D4ED8' : '#1D4ED8' },
                        inviteLoading && { opacity: 0.8 }
                    ]}
                    onPress={handleSubmit}
                    disabled={inviteLoading}
                    activeOpacity={0.85}
                >
                    {inviteLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <View style={styles.linkBtnContent}>
                            <Ionicons name="link" size={18} color="#FFFFFF" />
                            <Text style={styles.linkAccountBtnText}>Link Account</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 40,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        marginBottom: 8,
    },
    topLogoWrap: {
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 16,
    },
    circleLogo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#1D4ED8',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#1D4ED8',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    innerHouseIcon: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainTitle: {
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        color: '#64748B',
        lineHeight: 20,
        paddingHorizontal: 12,
        marginBottom: 28,
    },
    codeSlotsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        gap: 8,
    },
    slotBox: {
        flex: 1,
        height: 64,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    slotInput: {
        width: '100%',
        height: '100%',
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginBottom: 14,
    },
    hintText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    pasteCodeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        alignSelf: 'center',
        marginBottom: 20,
    },
    pasteCodeBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1D4ED8',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
        marginBottom: 20,
        gap: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    dividerText: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 14,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 1,
    },
    infoCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    infoCardDesc: {
        fontSize: 12.5,
        color: '#64748B',
        lineHeight: 18,
    },
    whatsAppRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    whatsAppText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#16A34A',
    },
    warningCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFBEB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FDE68A',
        gap: 12,
        alignItems: 'flex-start',
    },
    warningCardLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#D97706',
        marginBottom: 2,
    },
    warningCardDesc: {
        fontSize: 12,
        color: '#92400E',
        lineHeight: 17,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E2E8F0',
    },
    linkAccountBtn: {
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#1D4ED8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    linkBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    linkAccountBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
