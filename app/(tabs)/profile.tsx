import { useMyApplications } from '@/hooks/useApplications';
import { useLeases } from '@/hooks/useLeases';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCredits } from '../../hooks/useCredits';
import { useProfile } from '../../hooks/useProfile';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { callEdgeFunction } from '../../lib/api';

// ─── Small reusable pieces ────────────────────────────────────────────────────

type MenuRowProps = {
    icon: string;
    label: string;
    onPress: () => void;
    value?: string;
    danger?: boolean;
    badge?: string;
    badgeColor?: string;
    loading?: boolean;
    showChevron?: boolean;
    hasSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
};

const MenuRow = ({ icon, label, onPress, value, danger, badge, badgeColor, loading, showChevron = true, hasSwitch, switchValue, onSwitchChange }: MenuRowProps) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            style={[styles.menuRow, { backgroundColor: colors.card }]}
            onPress={hasSwitch ? undefined : onPress}
            activeOpacity={hasSwitch ? 1 : 0.7}
            disabled={loading}
        >
            <View style={[styles.menuIconWrap, { backgroundColor: danger ? '#FEF2F2' : '#407BFF15' }]}>
                {loading ? (
                    <ActivityIndicator size="small" color="#407BFF" />
                ) : (
                    <Ionicons name={icon as any} size={20} color={danger ? '#EF4444' : '#407BFF'} />
                )}
            </View>
            <View style={styles.menuRowContent}>
                <Text style={[styles.menuRowLabel, { color: danger ? '#EF4444' : colors.text }]}>{label}</Text>
            </View>
            {value ? <Text style={[styles.menuRowValue, { color: colors.textSecondary }]}>{value}</Text> : null}
            {hasSwitch ? (
                <Switch
                    value={switchValue}
                    onValueChange={onSwitchChange}
                    trackColor={{ false: '#E5E7EB', true: '#1D4ED8' }}
                    thumbColor="#FFF"
                />
            ) : (
                <>
                    {badge && (
                        <View style={[styles.menuBadge, { backgroundColor: badgeColor || colors.primary }]}>
                            <Text style={styles.menuBadgeText}>{badge}</Text>
                        </View>
                    )}
                    {showChevron && !badge && <Ionicons name="chevron-forward" size={16} color="#94A3B8" />}
                </>
            )}
        </TouchableOpacity>
    );
};

type SectionProps = { title: string; children: React.ReactNode };
const Section = ({ title, children }: SectionProps) => {
    const { colors } = useTheme();
    return (
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>{title}</Text>
            <View style={[styles.sectionGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {children}
            </View>
        </View>
    );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const ProfileScreen = () => {

    const router = useRouter();
    const { user, role } = useAuth();
    const { colors, isDark, toggleTheme } = useTheme();
    const { showSuccess, showError } = useToast();
    const [loadingPush, setLoadingPush] = useState(false);
    const { profile, loading, signOut } = useProfile();
    const { registerForPushNotificationsAsync } = useNotifications();
    const [pushEnabled, setPushEnabled] = useState(true);
    const { credits, loading: creditsLoading } = useCredits();
    const { leases, fetchLeases, loading: leasesLoading } = useLeases();
    const { applications, refetch: fetchApplications, loading: appsLoading } = useMyApplications();
    const { tickets } = useSupportTickets();
    const [showSignOutModal, setShowSignOutModal] = useState(false);

    useEffect(() => {
        if (profile && profile.push_notifications_enabled !== undefined) {
            setPushEnabled(profile.push_notifications_enabled ?? true);
        }
    }, [profile?.push_notifications_enabled]);

    const leaseCount = leases.length;
    const appCount = applications.length;

    const handleTogglePush = async (value: boolean) => {
        setPushEnabled(value);
        if (!user) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    push_notifications_enabled: value,
                    push_token: value ? undefined : null
                })
                .eq('id', user.id);

            if (error) throw error;
            if (value) await registerForPushNotificationsAsync();
            showSuccess(value ? 'Notifications enabled' : 'Notifications disabled');
        } catch (error: any) {
            setPushEnabled(!value);
            showError({
                type: 'unknown',
                title: 'Settings Error',
                message: 'Failed to update notification settings.'
            });
        }
    };

    const handleTestPush = async () => {
        if (!user) return;
        if (!pushEnabled) {
            Alert.alert('Notifications Disabled', 'Please enable push notifications in settings.');
            return;
        }

        setLoadingPush(true);
        try {
            await callEdgeFunction('send-push-notification', 'POST', {
                user_id: user.id,
                title: '🚀 Test Notification',
                body: 'Your Eden push notification system is working perfectly!',
                image: 'https://ytpggbkndnynyzashexk.supabase.co/storage/v1/object/public/property-images/EdenIcon.png'
            });
            showSuccess('Test notification sent!');
        } catch (error: any) {
            showError({
                type: 'unknown',
                title: 'Push Error',
                message: error.message
            });
        } finally {
            setLoadingPush(false);
        }
    };

    const handleSignOut = async () => {
        setShowSignOutModal(false);
        await signOut();
    };

    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Header Section ── */}
                <View style={styles.headerContainer}>
                    <LinearGradient
                        colors={['#1D4ED8', '#1E3A8A']}
                        style={styles.headerGradient}
                    >
                        {/* Decorative Circles */}
                        <View style={[styles.decorCircle, { width: 200, height: 200, right: -60, top: -40 }]} />
                        <View style={[styles.decorCircle, { width: 120, height: 120, left: -20, top: 100 }]} />

                        <View style={styles.profileHeaderContent}>
                            <View style={styles.avatarContainer}>
                                <Image
                                    source={
                                        profile?.profile_photo
                                            ? { uri: profile.profile_photo }
                                            : { uri: 'https://i.pravatar.cc/200' }
                                    }
                                    style={styles.avatar}
                                />
                                <TouchableOpacity
                                    style={styles.editAvatarBtn}
                                    onPress={() => router.push('/profile/edit-profile')}
                                >
                                    <Ionicons name="camera" size={14} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.userName}>
                                {profile?.first_name || 'User'} {profile?.last_name || ''}
                            </Text>

                            <View style={styles.verifiedRow}>
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={14} color="#BFDBFE" />
                                    <Text style={styles.verifiedText}>Verified Tenant</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Stats Card */}
                    <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{creditsLoading ? '...' : credits}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Units</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{leasesLoading ? '...' : leaseCount}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Lease</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>0</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Applications</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.menuContainer}>
                    <Section title="MY TENANCY">
                        <MenuRow
                            icon="home-outline"
                            label="Current Lease"
                            value={leaseCount > 0 ? `${leaseCount} Active` : 'None'}
                            onPress={() => router.push('/shared-screens/LeasesScreen')}
                        />
                        <MenuRow
                            icon="calendar-outline"
                            label="My Inspections"
                            onPress={() => router.push('/shared-screens/InspectionsScreen')}
                        />
                        <MenuRow
                            icon="file-tray-full-outline"
                            label="My Applications"
                            onPress={() => router.push('/shared-screens/ApplicationsScreen')}
                        />
                        <MenuRow
                            icon="construct-outline"
                            label="Maintenance Requests"
                            onPress={() => router.push('/shared-screens/MaintenanceScreen')}
                        />
                        <MenuRow
                            icon="chatbox-ellipses-outline"
                            label="Complaints"
                            onPress={() => router.push('/profile/complaint-request')}
                        />
                    </Section>

                    <Section title="PAYMENTS">
                        <MenuRow
                            icon="wallet-outline"
                            label="Credit Balance"
                            value={`₦${(credits * 666).toLocaleString()}`}
                            onPress={() => router.push('/shared-screens/TopUpCreditsScreen')}
                        />
                        <MenuRow
                            icon="receipt-outline"
                            label="Payment History"
                            onPress={() => router.push('/shared-screens/PaymentHistoryScreen')}
                        />
                    </Section>

                    <Section title="ACCOUNT">
                        <MenuRow
                            icon="person-outline"
                            label="Edit Profile"
                            onPress={() => router.push('/profile/edit-profile')}
                        />
                        <MenuRow
                            icon="briefcase-outline"
                            label={role === 'AGENT' ? "Join another Landlord" : "Become an Agent"}
                            onPress={() => router.push('/auth/accept-invite')}
                        />
                        <View style={styles.switchRowInside}>
                            <View style={styles.switchRowLeft}>
                                <View style={[styles.menuIconWrap, { backgroundColor: '#407BFF15' }]}>
                                    <Ionicons name="notifications-outline" size={20} color="#407BFF" />
                                </View>
                                <Text style={[styles.menuRowLabel, { color: colors.text }]}>Push Notifications</Text>
                            </View>
                            <Switch
                                value={pushEnabled}
                                onValueChange={handleTogglePush}
                                trackColor={{ false: '#E5E7EB', true: '#1D4ED8' }}
                                thumbColor="#FFF"
                            />
                        </View>
                        <MenuRow
                            icon="shield-checkmark-outline"
                            label="KYC Status"
                            value={profile?.is_verified ? 'Verified' : 'Pending'}
                            onPress={() => {
                                if (profile?.is_verified) {
                                    Alert.alert('KYC Verified ✓', 'Your identity and biometric verification are active on the Eden network.');
                                } else {
                                    router.push('/profilesetup/id-verification');
                                }
                            }}
                        />
                        <MenuRow
                            icon="flask-outline"
                            label="Test Push"
                            onPress={handleTestPush}
                            loading={loadingPush}
                        />
                    </Section>

                    <Section title="APPEARANCE">
                        <MenuRow
                            icon={isDark ? "moon" : "sunny-outline"}
                            label="Dark Mode"
                            hasSwitch={true}
                            switchValue={isDark}
                            onSwitchChange={toggleTheme}
                            onPress={() => { }}
                        />
                    </Section>

                    <Section title="SUPPORT">
                        <MenuRow
                            icon="help-circle-outline"
                            label="Help & Support Desk"
                            badge={tickets.length > 0 ? `${tickets.length}` : undefined}
                            badgeColor="#1D4ED8"
                            onPress={() => router.push('/shared-screens/HelpSupportScreen')}
                        />
                        <MenuRow
                            icon="document-text-outline"
                            label="Terms & Privacy"
                            onPress={() => Linking.openURL('https://Eden.ng/terms')}
                        />
                    </Section>

                    {/* Sign Out Button */}
                    <TouchableOpacity
                        style={[styles.signOutBtn, { backgroundColor: isDark ? '#450a0a' : '#FEF2F2' }]}
                        onPress={() => setShowSignOutModal(true)}
                    >
                        <View style={styles.signOutContent}>
                            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                            <Text style={styles.signOutText}>Log Out</Text>
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>Version 1.0.0</Text>
                </View>
            </ScrollView>

            {/* Sign Out Modal */}
            <Modal visible={showSignOutModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalIconCircle, { backgroundColor: isDark ? '#450a0a' : '#FEF2F2' }]}>
                            <Ionicons name="log-out-outline" size={32} color="#EF4444" />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Sign Out?</Text>
                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                            Are you sure you want to sign out?
                        </Text>
                        <TouchableOpacity style={[styles.modalSignOutBtn, { backgroundColor: '#EF4444' }]} onPress={handleSignOut}>
                            <Text style={styles.modalSignOutText}>Yes, Sign Out</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalCancelBtn}
                            onPress={() => setShowSignOutModal(false)}
                        >
                            <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: { paddingBottom: 40 },
    headerContainer: {
        marginBottom: 20,
    },
    headerGradient: {
        height: 260,
        paddingTop: 60,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    decorCircle: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 999,
    },
    profileHeaderContent: {
        alignItems: 'center',
        zIndex: 10,

    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#FFF',
    },
    editAvatarBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#F97316',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
    },
    verifiedRow: {
        flexDirection: 'row',
        alignItems: 'center',

    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,

    },
    verifiedText: {
        color: '#BFDBFE',
        fontSize: 12,
        fontWeight: '500',
    },
    statsCard: {
        marginHorizontal: 20,
        marginTop: -40,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 19,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        marginTop: 2,
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: 30,
    },
    menuContainer: {
        paddingHorizontal: 20,
    },
    section: {
        marginTop: 20,

    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 10,
        marginLeft: 4,
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    sectionGroup: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        height: 60,
    },
    menuIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuRowContent: {
        flex: 1,
    },
    menuRowLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    menuRowValue: {
        fontSize: 12,
        marginRight: 8,
        color: '#64748B',
    },
    menuBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: 8,
    },
    menuBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    switchRowInside: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        height: 60,
    },
    switchRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    signOutBtn: {
        marginTop: 32,
        borderRadius: 18,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    signOutContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    signOutText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '700',
    },
    versionText: {
        textAlign: 'center',
        color: '#CBD5E1',
        fontSize: 12,
        marginTop: 24,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    modalCard: {
        width: '100%',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
    },
    modalIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 28,
    },
    modalSignOutBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 12,
    },
    modalSignOutText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    modalCancelBtn: {
        paddingVertical: 8,
    },
    modalCancelText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default ProfileScreen;
