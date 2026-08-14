import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Share, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/Toast';
import CustomButton from '../../components/CustomButton';

const InviteAgentScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { showSuccess } = useToast();
    const { code } = useLocalSearchParams<{ code: string }>();

    const handleCopy = async () => {
        await Clipboard.setStringAsync(code || '');
        showSuccess('Invite code copied to clipboard');
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Hey! I'm inviting you to be an agent for my properties on Eden Home. Use this invite code to link your account: ${code}\n\nDownload the app and select "I'm an Agent" during signup.`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>New Agent Invite</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.illustrationContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.primary + '10' }]}>
                        <Ionicons name="mail-open-outline" size={60} color={colors.primary} />
                    </View>
                </View>

                <Text style={[styles.mainTitle, { color: colors.text }]}>Invite Generated!</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Share this unique code with your agent. It can only be used once.
                </Text>

                <TouchableOpacity style={[styles.codeCard, { backgroundColor: colors.card }]} onPress={handleCopy}>
                    <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>INVITE CODE</Text>
                    <Text style={[styles.codeValue, { color: colors.primary }]}>{code}</Text>
                    <View style={styles.copyBadge}>
                        <Ionicons name="copy-outline" size={16} color={colors.primary} />
                        <Text style={[styles.copyText, { color: colors.primary }]}>Tap to copy</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.buttonContainer}>
                    <CustomButton
                        title="Share Invite Code"
                        onPress={handleShare}
                        style={styles.shareButton}
                        leftIcon={<Ionicons name="share-social-outline" size={20} color="#FFF" />}
                    />
                    
                    <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
                        <Text style={[styles.doneButtonText, { color: colors.textSecondary }]}>Done</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.warningBox}>
                    <Ionicons name="alert-circle-outline" size={20} color={colors.textSecondary} />
                    <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                        For security, this code will expire once an agent accepts it. You can manage their property access at any time.
                    </Text>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    illustrationContainer: {
        marginBottom: 32,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    codeCard: {
        width: '100%',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    codeLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
    },
    codeValue: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: 4,
        marginBottom: 12,
    },
    copyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    copyText: {
        fontSize: 12,
        fontWeight: '600',
    },
    buttonContainer: {
        width: '100%',
        marginTop: 40,
        gap: 16,
    },
    shareButton: {
        width: '100%',
    },
    doneButton: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    warningBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
        gap: 12,
        marginTop: 'auto',
        marginBottom: 20,
    },
    warningText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
    },
});

export default InviteAgentScreen;
