import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useAgentManagement } from '../../hooks/useAgentManagement';

const ManageAgentsScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showSuccess, showError } = useToast();
    const { agents, loading, fetchAgents, createInvite, revokeAgent } = useAgentManagement();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [currentInviteCode, setCurrentInviteCode] = useState<string>('AB123D');
    const [codeCreatedAt, setCodeCreatedAt] = useState<Date>(new Date());

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    // Track active pending code
    useEffect(() => {
        const pendingInvite = agents.find((a) => a.status === 'pending' && a.invite_code);
        if (pendingInvite) {
            setCurrentInviteCode(pendingInvite.invite_code);
            if (pendingInvite.created_at) {
                setCodeCreatedAt(new Date(pendingInvite.created_at));
            }
        }
    }, [agents]);

    const onRefresh = async () => {
        setIsRefreshing(true);
        await fetchAgents();
        setIsRefreshing(false);
    };

    const handleGenerateNewCode = async () => {
        setGenerating(true);
        try {
            const newCode = await createInvite();
            if (newCode) {
                setCurrentInviteCode(newCode);
                setCodeCreatedAt(new Date());
                showSuccess('New 6-character invite code generated!');
            }
        } catch (e: any) {
            showError({ type: 'unknown', title: 'Generation Failed', message: e.message || 'Could not generate code' });
        } finally {
            setGenerating(false);
        }
    };

    const handleCopyCode = async () => {
        if (!currentInviteCode) return;
        await Clipboard.setStringAsync(currentInviteCode);
        showSuccess(`Code ${currentInviteCode} copied to clipboard!`);
    };

    const handleShare = async () => {
        if (!currentInviteCode) return;
        try {
            await Share.share({
                message: `Hello! You have been invited to manage properties on Eden as an authorized Agent. Use this 6-character Invite Code to link your account: ${currentInviteCode}\n\nDownload Eden and select "Link Your Account as Agent" in your profile.`,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const handleSendWhatsApp = async () => {
        if (!currentInviteCode) return;
        const text = `Hello! You have been invited to manage properties on Eden as an authorized Agent. Use this 6-character Invite Code to link your account: ${currentInviteCode}\n\nDownload Eden and select "Link Your Account as Agent" in your profile.`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            handleShare();
        }
    };

    const handleMessageAgent = (agent: any) => {
        const phone = agent.users?.user_biodata?.phone_number || '08012345678';
        Alert.alert(
            `Contact ${agent.users?.first_name || 'Agent'}`,
            `Choose how you would like to reach out:`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Call Phone',
                    onPress: () => Linking.openURL(`tel:${phone}`),
                },
                {
                    text: 'Send WhatsApp',
                    onPress: () => Linking.openURL(`https://wa.me/234${phone.replace(/^0/, '')}?text=Hello%20${agent.users?.first_name || 'Agent'}`),
                },
            ]
        );
    };

    const handleUnlinkAgent = (agentId: string, name: string) => {
        Alert.alert(
            'Unlink Agent',
            `Are you sure you want to unlink ${name}? They will no longer be able to manage your properties.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unlink',
                    style: 'destructive',
                    onPress: () => revokeAgent(agentId),
                },
            ]
        );
    };

    // Calculate time elapsed & remaining
    const hoursElapsed = Math.max(0, Math.floor((Date.now() - codeCreatedAt.getTime()) / (1000 * 60 * 60)));
    const hoursRemaining = Math.max(1, 24 - hoursElapsed);
    const generatedTimeText = hoursElapsed === 0 ? 'Generated just now' : `Generated ${hoursElapsed} hour${hoursElapsed > 1 ? 's' : ''} ago`;

    // Filter active agents (or default demo preview if none yet)
    const activeAgentsList = agents.filter((a) => a.status === 'active' || (a.agent_id && a.status !== 'revoked'));

    return (
        <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background }]}>
            {/* ── Top Header ────────────────────────────────────────── */}
            <View style={styles.topHeader}>
                <TouchableOpacity
                    style={[styles.backBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Agent Management</Text>
                <TouchableOpacity
                    style={[styles.backBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                    onPress={onRefresh}
                    activeOpacity={0.7}
                >
                    <Ionicons name="refresh-outline" size={18} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* ── Hero Banner ("Manage Your Agents") ──────────────── */}
                <View style={styles.heroCard}>
                    {/* Watermark logo */}
                    <View style={styles.watermarkContainer}>
                        <Image
                            source={require('../../assets/images/eicon.png')}
                            style={styles.watermarkImage}
                            resizeMode="contain"
                        />
                    </View>

                    <View style={styles.heroRow}>
                        <View style={styles.heroIconBadge}>
                            <Ionicons name="people" size={26} color="#FFFFFF" />
                        </View>
                        <View style={styles.heroTextContent}>
                            <Text style={styles.heroTitle}>Manage Your Agents</Text>
                            <Text style={styles.heroSubtitle}>
                                Generate invite codes to link agents to your properties. Each agent manages on your behalf
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── "Your Invite Code" Card ─────────────────────────── */}
                <View style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {/* Card Header */}
                    <View style={styles.inviteCardHeader}>
                        <Text style={[styles.inviteCardTitle, { color: colors.text }]}>Your Invite Code</Text>
                        <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                    </View>

                    {/* Dashed Code Box */}
                    <TouchableOpacity
                        style={[styles.codeBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                        onPress={handleCopyCode}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.codeText}>{currentInviteCode}</Text>
                    </TouchableOpacity>

                    {/* Timers Row */}
                    <View style={styles.timingRow}>
                        <View style={styles.timingItem}>
                            <Ionicons name="time-outline" size={13} color="#64748B" />
                            <Text style={styles.timingText}>{generatedTimeText}</Text>
                        </View>
                        <View style={styles.timingItem}>
                            <Ionicons name="timer-outline" size={13} color="#64748B" />
                            <Text style={styles.timingText}>Expires in {hoursRemaining} hrs</Text>
                        </View>
                    </View>

                    {/* Action Buttons Row */}
                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                            style={styles.copyBtn}
                            onPress={handleCopyCode}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.copyBtnText}>Copy Code</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.shareBtn, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}
                            onPress={handleShare}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="share-social-outline" size={16} color="#1D4ED8" />
                            <Text style={styles.shareBtnText}>Share</Text>
                        </TouchableOpacity>
                    </View>

                    {/* WhatsApp Button */}
                    <TouchableOpacity
                        style={styles.whatsappBtn}
                        onPress={handleSendWhatsApp}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
                        <Text style={styles.whatsappBtnText}>Send via WhatsApp</Text>
                    </TouchableOpacity>
                </View>

                {/* ── "Generate New Code" Button ─────────────────────── */}
                <TouchableOpacity
                    style={[styles.generateBtn, { borderColor: colors.primary, backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}
                    onPress={handleGenerateNewCode}
                    disabled={generating}
                    activeOpacity={0.8}
                >
                    {generating ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Text style={[styles.generateBtnText, { color: colors.primary }]}>Generate New Code</Text>
                    )}
                </TouchableOpacity>

                {/* ── "Active Agents" Section ─────────────────────────── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Active Agents</Text>
                </View>

                {/* Render active agents list */}
                {activeAgentsList.length > 0 ? (
                    activeAgentsList.map((item) => {
                        const agentUser = item.users;
                        const agentName = agentUser
                            ? `${agentUser.first_name || ''} ${agentUser.last_name || ''}`.trim() || agentUser.email || 'Akin Oladele'
                            : 'Akin Oladele';
                        const assignedProps = item.assigned_properties_count || 0;
                        const agentCode = item.agent_id ? `AGT-2026-${item.agent_id.substring(0, 5).toUpperCase()}` : 'AGT-2026-00087';
                        const photo = agentUser?.user_biodata?.profile_photo;

                        return (
                            <View
                                key={item.id}
                                style={[styles.agentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                            >
                                {/* Left Avatar */}
                                <View style={styles.avatarContainer}>
                                    {photo ? (
                                        <Image source={{ uri: photo }} style={styles.avatarImage} />
                                    ) : (
                                        <View style={styles.avatarCircle}>
                                            <Ionicons name="person" size={24} color="#1D4ED8" />
                                        </View>
                                    )}
                                </View>

                                {/* Middle Info */}
                                <View style={styles.agentInfoCol}>
                                    <Text style={[styles.agentName, { color: colors.text }]} numberOfLines={1}>
                                        {agentName}
                                    </Text>
                                    <View style={styles.verifiedRow}>
                                        <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                                        <Text style={styles.verifiedText}>Verified Agent</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => router.push({
                                            pathname: '/landlord-screens/assign-properties',
                                            params: {
                                                agentId: item.agent_id || item.id,
                                                agentName,
                                                agentEmail: agentUser?.email || '',
                                                agentPhoto: photo || ''
                                            }
                                        })}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.propertiesAssignedText}>
                                            {assignedProps} propert{assignedProps === 1 ? 'y' : 'ies'} assigned ›
                                        </Text>
                                    </TouchableOpacity>
                                    <Text style={styles.agentCodeText}>{agentCode}</Text>
                                </View>

                                {/* Right Action Buttons (Message / Unlink) */}
                                <View style={styles.agentActionsCol}>
                                    <TouchableOpacity
                                        style={styles.messageBtn}
                                        onPress={() => handleMessageAgent(item)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.messageBtnText}>Message</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.unlinkBtn}
                                        onPress={() => handleUnlinkAgent(item.agent_id || item.id, agentName)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.unlinkBtnText}>Unlink</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                ) : (
                    // Default active agent sample preview matching the exact layout
                    <View style={[styles.agentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {/* Left Avatar */}
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarCircle}>
                                <Ionicons name="person" size={24} color="#1D4ED8" />
                            </View>
                        </View>

                        {/* Middle Info */}
                        <View style={styles.agentInfoCol}>
                            <Text style={[styles.agentName, { color: colors.text }]}>Akin Oladele</Text>
                            <View style={styles.verifiedRow}>
                                <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                                <Text style={styles.verifiedText}>Verified Agent</Text>
                            </View>
                            <Text style={styles.propertiesAssignedText}>3 properties assigned</Text>
                            <Text style={styles.agentCodeText}>AGT-2026-00087</Text>
                        </View>

                        {/* Right Action Buttons */}
                        <View style={styles.agentActionsCol}>
                            <TouchableOpacity
                                style={styles.messageBtn}
                                onPress={() => handleMessageAgent({ users: { first_name: 'Akin' } })}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.messageBtnText}>Message</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.unlinkBtn}
                                onPress={() => handleUnlinkAgent('demo-agent-id', 'Akin Oladele')}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.unlinkBtnText}>Unlink</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 8 : 14,
        paddingBottom: 10,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 30,
    },

    // ── Hero Banner ──────────────────────────────────────────────────
    heroCard: {
        backgroundColor: '#162B75',
        borderRadius: 24,
        padding: 20,
        paddingVertical: 22,
        marginBottom: 16,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#162B75',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    watermarkContainer: {
        position: 'absolute',
        top: -10,
        right: -10,
        opacity: 0.12,
    },
    watermarkImage: {
        width: 100,
        height: 100,
        tintColor: '#FFFFFF',
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    heroIconBadge: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    heroTextContent: {
        flex: 1,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 6,
    },
    heroSubtitle: {
        fontSize: 12.5,
        lineHeight: 18,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '400',
    },

    // ── Invite Code Card ─────────────────────────────────────────────
    inviteCard: {
        borderRadius: 22,
        borderWidth: 1,
        padding: 18,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    inviteCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    inviteCardTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    activeBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 16,
        paddingVertical: 5,
        borderRadius: 20,
    },
    activeBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    codeBox: {
        borderWidth: 1.8,
        borderStyle: 'dashed',
        borderColor: '#3B82F6',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    codeText: {
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: 6,
        color: '#1D4ED8',
    },
    timingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    timingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    timingText: {
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '500',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    copyBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#1D4ED8',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#1D4ED8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    copyBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    shareBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    shareBtnText: {
        color: '#1D4ED8',
        fontSize: 14,
        fontWeight: '700',
    },
    whatsappBtn: {
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    whatsappBtnText: {
        color: '#15803D',
        fontSize: 14,
        fontWeight: '700',
    },

    // ── Generate New Code Button ─────────────────────────────────────
    generateBtn: {
        height: 50,
        borderRadius: 16,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    generateBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },

    // ── Section Header ───────────────────────────────────────────────
    sectionHeader: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        letterSpacing: 0.3,
    },

    // ── Active Agent Card ────────────────────────────────────────────
    agentCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatarCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#1D4ED8',
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    agentInfoCol: {
        flex: 1,
        gap: 3,
    },
    agentName: {
        fontSize: 15,
        fontWeight: '700',
    },
    verifiedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    verifiedText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
    },
    propertiesAssignedText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 1,
    },
    agentCodeText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
        marginTop: 1,
    },
    agentActionsCol: {
        gap: 8,
        alignItems: 'flex-end',
    },
    messageBtn: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    messageBtnText: {
        color: '#1D4ED8',
        fontSize: 12,
        fontWeight: '700',
    },
    unlinkBtn: {
        paddingHorizontal: 18,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    unlinkBtnText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '700',
    },
});

export default ManageAgentsScreen;
