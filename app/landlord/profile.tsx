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
import { useProfile } from '../../hooks/useProfile';
import { useLandlord } from '../../hooks/useLandlord';
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

const LandlordProfileScreen = () => {
    const router = useRouter();
    const { user, role } = useAuth();
    const { colors, isDark, toggleTheme } = useTheme();
    const { showSuccess, showError } = useToast();
    const [loadingPush, setLoadingPush] = useState(false);
    const { profile, loading, signOut } = useProfile();
    const { stats } = useLandlord();
    const { tickets } = useSupportTickets();
    const { registerForPushNotificationsAsync } = useNotifications();
    const [pushEnabled, setPushEnabled] = useState(true);
    const [showSignOutModal, setShowSignOutModal] = useState(false);

    useEffect(() => {
        if (profile) {
            setPushEnabled(profile.push_notifications_enabled ?? true);
        }
    }, [profile]);

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
                title: '🏢 Landlord Test',
                body: 'Your Eden landlord notification system is online!',
                image: 'https://img.freepik.com/free-vector/home-logo-template_23-2148005537.jpg'
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
                                        profile?.user_biodata?.profile_photo
                                            ? { uri: profile.user_biodata.profile_photo }
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
                                {profile?.first_name || (role === 'AGENT' ? 'Agent' : 'Landlord')} {profile?.last_name || ''}
                            </Text>

                            <View style={styles.verifiedRow}>
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="shield-checkmark" size={14} color="#BFDBFE" />
                                    <Text style={styles.verifiedText}>{role === 'AGENT' ? 'Delegated Agent' : 'Verified Landlord'}</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Stats Card */}
                    {(role === 'LANDLORD' || role === 'AGENT') && (
                        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: colors.text }]}>{stats.activeCount}</Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Properties</Text>
                            </View>
                            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: colors.text }]}>{stats.tenantCount}</Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Tenants</Text>
                            </View>
                            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: colors.text }]}>
                                    {stats.rating ? Number(stats.rating).toFixed(1) : '5.0'}
                                </Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Rating</Text>
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.menuContainer}>
                    <Section title={role === 'AGENT' ? "MANAGEMENT" : "MY BUSINESS"}>
                        <MenuRow
                            icon="business-outline"
                            label={role === 'AGENT' ? "Assigned Listings" : "My Listings"}
                            value={`${stats.activeCount} Active`}
                            onPress={() => router.push('/landlord')}
                        />
                        <MenuRow
                            icon="mail-outline"
                            label="Rent Requests"
                            onPress={() => router.push('/shared-screens/ApplicationsScreen')}
                        />
                        <MenuRow
                            icon="stats-chart-outline"
                            label="Rent Tracker"
                            onPress={() => router.push('/landlord-screens/rent-tracker')}
                        />
                        <MenuRow
                            icon="calendar-outline"
                            label="Inspection Bookings"
                            onPress={() => router.push('/shared-screens/InspectionsScreen')}
                        />
                        <MenuRow
                            icon="construct-outline"
                            label="Maintenance Requests"
                            onPress={() => router.push('/shared-screens/MaintenanceScreen')}
                        />
                        <MenuRow
                            icon="analytics-outline"
                            label="Portfolio Analytics"
                            onPress={() => router.push('/landlord-screens/analytics')}
                        />
                        {role === 'LANDLORD' && (
                            <MenuRow
                                icon="people-circle-outline"
                                label="Manage Agents"
                                onPress={() => router.push('/landlord-screens/manage-agents')}
                            />
                        )}
                    </Section>

                    <Section title="ACCOUNT">
                        <MenuRow
                            icon="person-outline"
                            label="Edit Profile"
                            onPress={() => router.push('/profile/edit-profile')}
                        />
                        {role === 'AGENT' && (
                            <MenuRow
                                icon="briefcase-outline"
                                label="Join another Landlord"
                                onPress={() => router.push('/auth/accept-invite')}
                            />
                        )}
                        {role === 'LANDLORD' && (
                            <MenuRow
                                icon="card-outline"
                                label="Bank Account"
                                value={profile?.bank_name || 'Not set'}
                                onPress={() => router.push('/landlord-screens/bank-account')}
                            />
                        )}
                        <View style={[styles.switchRowInside, { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
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
                        {role === 'LANDLORD' && (
                            <MenuRow
                                icon="shield-checkmark-outline"
                                label="KYC Status"
                                value={profile?.is_verified ? 'Verified' : 'Pending'}
                                onPress={() => {
                                    if (profile?.is_verified) {
                                        Alert.alert('KYC Verified ✓', 'Your landlord credentials and identity are verified on Eden.');
                                    } else {
                                        router.push('/profilesetup/id-verification');
                                    }
                                }}
                            />
                        )}
                        {role === 'AGENT' && (
                            <MenuRow
                                icon="link-outline"
                                label="Linked Landlord"
                                value={profile?.delegated_landlord_name || 'Assigned'}
                                onPress={() => {
                                    Alert.alert(
                                        'Delegated Agent Access',
                                        `You are operating as an assigned real estate agent for ${profile?.delegated_landlord_name || 'your partner landlord'}. You have authorization to list properties and manage applications.`
                                    );
                                }}
                                showChevron={true}
                            />
                        )}
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
    headerContainer: { marginBottom: 20 },
    headerGradient: { height: 260, paddingTop: 60, paddingHorizontal: 20 },
    decorCircle: { position: 'absolute', borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)' },
    profileHeaderContent: { alignItems: 'center' },
    avatarContainer: { position: 'relative', marginBottom: 12 },
    avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#FFF' },
    editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#407BFF', padding: 6, borderRadius: 20, borderWidth: 2, borderColor: '#FFF' },
    userName: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 8 },
    verifiedRow: { flexDirection: 'row', alignItems: 'center' },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    verifiedText: { color: '#BFDBFE', fontSize: 12, fontWeight: '600', marginLeft: 6 },
    statsCard: { marginHorizontal: 20, marginTop: -40, padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { fontSize: 18, fontWeight: '700' },
    statLabel: { fontSize: 12, marginTop: 4 },
    statDivider: { width: 1, height: '100%' },
    menuContainer: { paddingHorizontal: 20, marginTop: 10 },
    section: { marginBottom: 24 },
    sectionHeader: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 12, letterSpacing: 1 },
    sectionGroup: { borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
    menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    menuIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    menuRowContent: { flex: 1 },
    menuRowLabel: { fontSize: 16, fontWeight: '500' },
    menuRowValue: { fontSize: 14, marginRight: 8 },
    menuBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 8 },
    menuBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
    switchRowInside: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' },
    switchRowLeft: { flexDirection: 'row', alignItems: 'center' },
    signOutBtn: { marginHorizontal: 20, padding: 16, borderRadius: 12, alignItems: 'center' },
    signOutContent: { flexDirection: 'row', alignItems: 'center' },
    signOutText: { color: '#EF4444', fontWeight: '600', marginLeft: 8 },
    versionText: { textAlign: 'center', color: '#94A3B8', marginTop: 20, fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalCard: { width: '100%', padding: 24, borderRadius: 20, alignItems: 'center' },
    modalIconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
    modalSignOutBtn: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
    modalSignOutText: { color: '#FFF', fontWeight: '600' },
    modalCancelBtn: { padding: 16 },
    modalCancelText: { fontWeight: '600' }
});

export default LandlordProfileScreen;
