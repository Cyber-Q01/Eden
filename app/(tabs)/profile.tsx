import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useProfile } from '../../hooks/useProfile';
import { useCredits } from '../../hooks/useCredits';

// ─── Small reusable pieces ────────────────────────────────────────────────────

type MenuRowProps = {
    icon: string;
    label: string;
    onPress: () => void;
    value?: string;
    danger?: boolean;
    badge?: string;
    badgeColor?: string;
};

const MenuRow = ({ icon, label, onPress, value, danger, badge, badgeColor }: MenuRowProps) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            style={[styles.menuRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.menuIconWrap, { backgroundColor: danger ? '#FFEDED' : colors.primary + '15' }]}>
                <Ionicons name={icon as any} size={18} color={danger ? '#FF4D4D' : colors.primary} />
            </View>
            <View style={styles.menuRowContent}>
                <Text style={[styles.menuRowLabel, { color: danger ? '#FF4D4D' : colors.text }]}>{label}</Text>
                {value ? <Text style={[styles.menuRowValue, { color: colors.textSecondary }]}>{value}</Text> : null}
            </View>
            {badge ? (
                <View style={[styles.menuBadge, { backgroundColor: badgeColor || colors.primary }]}>
                    <Text style={styles.menuBadgeText}>{badge}</Text>
                </View>
            ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            )}
        </TouchableOpacity>
    );
};

type SectionProps = { title: string; children: React.ReactNode };
const Section = ({ title, children }: SectionProps) => {
    const { colors } = useTheme();
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>
            <View style={styles.sectionGroup}>{children}</View>
        </View>
    );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const ProfileScreen = () => {
    const router = useRouter();
    const { colors, isDark, toggleTheme } = useTheme();
    const { role } = useAuth();
    const [pushEnabled, setPushEnabled] = useState(true);
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const { profile, loading, signOut } = useProfile();
    const { credits, loading: creditsLoading, fetchCredits } = useCredits();

    const CREDIT_PRICE = 666;

    const handleSignOut = async () => {
        setShowSignOutModal(false);
        await signOut();
    };

    const verificationStatus = profile?.is_verified ? 'Verified' : 'Pending';
    const verificationColor = profile?.is_verified ? '#22C55E' : colors.textSecondary;

    return (
        <ScreenWrapper withScrollView={true}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

                {/* ── Profile Card ── */}
                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
                ) : (
                    <TouchableOpacity
                        style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push('/profile/edit-profile')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.avatarWrap}>
                            <Image
                                source={
                                    profile?.profile_photo
                                        ? { uri: profile.profile_photo }
                                        : { uri: 'https://i.pravatar.cc/200' }
                                }
                                style={styles.avatar}
                            />
                            {profile?.is_verified && (
                                <View style={[styles.verifiedDot, { backgroundColor: '#22C55E' }]}>
                                    <Ionicons name="checkmark" size={10} color="#fff" />
                                </View>
                            )}
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={[styles.name, { color: colors.text }]}>
                                {profile?.first_name || 'Your'} {profile?.last_name || 'Name'}
                            </Text>
                            <Text style={[styles.email, { color: colors.textSecondary }]}>{profile?.email || ''}</Text>
                            {profile?.phone && (
                                <Text style={[styles.phone, { color: colors.textSecondary }]}>{profile.phone}</Text>
                            )}
                            {/* <View style={[styles.roleBadge, { backgroundColor: '#8B5CF6' + '20' }]}>
                                <Text style={[styles.roleBadgeText, { color: '#8B5CF6' }]}>🔑 Tenant</Text>
                            </View> */}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}

                {/* ── Credits & Unlocks ── */}
                <TouchableOpacity
                    style={[styles.creditCard, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/shared-screens/TopUpCreditsScreen')}
                    activeOpacity={0.85}
                >
                    <View style={styles.creditCardLeft}>
                        <View style={styles.creditIconWrap}>
                            <Ionicons name="wallet-outline" size={22} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.creditCardLabel}>Credit Balance</Text>
                            <Text style={styles.creditCardBalance}>
                                {creditsLoading ? '...' : `₦${(credits * CREDIT_PRICE).toLocaleString()}`}
                            </Text>
                            <Text style={styles.creditCardUnlocks}>
                                {creditsLoading ? '' : `${credits} unlock${credits !== 1 ? 's' : ''} remaining`}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.creditTopUpBtn}>
                        <Text style={styles.creditTopUpText}>Top Up</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                    </View>
                </TouchableOpacity>

                {/* ── TENANT sections ── */}
                <Section title="My Tenancy">
                    <MenuRow
                        icon="home-outline"
                        label="Current Lease"
                        value={profile?.current_property ? 'Active' : 'No active lease'}
                        onPress={() => router.push('/(tabs)')}
                    />
                    <MenuRow
                        icon="receipt-outline"
                        label="Payment History"
                        onPress={() => router.push('/shared-screens/PaymentHistoryScreen')}
                    />
                    <MenuRow
                        icon="document-text-outline"
                        label="Lease Documents"
                        onPress={() => router.push('/(tabs)')}
                    />
                    <MenuRow
                        icon="file-tray-full-outline"
                        label="My Applications"
                        onPress={() => router.push('/shared-screens/ApplicationsScreen')}
                    />
                </Section>

                <Section title="Requests">
                    <MenuRow
                        icon="construct-outline"
                        label="Maintenance Request"
                        onPress={() => router.push('/profile/maintenance-request')}
                    />
                    <MenuRow
                        icon="chatbox-ellipses-outline"
                        label="Complaint"
                        onPress={() => router.push('/profile/complaint-request')}
                    />
                </Section>

                {/* ── Verification ── */}
                <Section title="Verification">
                    <MenuRow
                        icon="shield-checkmark-outline"
                        label="KYC Verification"
                        value={verificationStatus}
                        badge={verificationStatus}
                        badgeColor={verificationColor}
                        onPress={() => router.push('/profilesetup/id-verification')}
                    />
                </Section>

                {/* ── Account Settings ── */}
                <Section title="Account">
                    <MenuRow
                        icon="person-outline"
                        label="Edit Profile"
                        onPress={() => router.push('/profile/edit-profile')}
                    />
                    <MenuRow
                        icon="lock-closed-outline"
                        label="Change Password"
                        onPress={() => Alert.alert('Coming Soon', 'Password change is coming soon.')}
                    />
                </Section>

                {/* ── Preferences ── */}
                <Section title="Preferences">
                    <View style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.switchLeft}>
                            <View style={[styles.menuIconWrap, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="moon-outline" size={18} color={colors.primary} />
                            </View>
                            <Text style={[styles.menuRowLabel, { color: colors.text }]}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#767577', true: colors.primary }}
                            thumbColor="#FFF"
                        />
                    </View>
                    <View style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.switchLeft}>
                            <View style={[styles.menuIconWrap, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                            </View>
                            <Text style={[styles.menuRowLabel, { color: colors.text }]}>Push Notifications</Text>
                        </View>
                        <Switch
                            value={pushEnabled}
                            onValueChange={setPushEnabled}
                            trackColor={{ false: '#767577', true: colors.primary }}
                            thumbColor="#FFF"
                        />
                    </View>
                </Section>

                {/* ── Legal ── */}
                <Section title="Legal">
                    <MenuRow
                        icon="document-outline"
                        label="Terms of Service"
                        onPress={() => Linking.openURL('https://edenhome.ng/terms')}
                    />
                    <MenuRow
                        icon="eye-outline"
                        label="Privacy Policy"
                        onPress={() => Linking.openURL('https://edenhome.ng/privacy')}
                    />
                </Section>

                {/* ── Sign Out ── */}
                <View style={styles.section}>
                    <MenuRow
                        icon="log-out-outline"
                        label="Sign Out"
                        danger
                        onPress={() => setShowSignOutModal(true)}
                    />
                </View>
            </ScrollView>

            {/* Sign Out Modal */}
            <Modal
                visible={showSignOutModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSignOutModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalIconCircle, { backgroundColor: '#FFEDED' }]}>
                            <Ionicons name="log-out-outline" size={32} color="#FF4D4D" />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Sign Out?</Text>
                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                            Are you sure you want to sign out of your account?
                        </Text>
                        <TouchableOpacity style={styles.modalSignOutBtn} onPress={handleSignOut}>
                            <Text style={styles.modalSignOutText}>Yes, Sign Out</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalCancelBtn, { borderColor: colors.border }]}
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
    scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },
    title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginVertical: 20 },

    // Profile card
    profileCard: {
        borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center',
        gap: 14, marginBottom: 8, borderWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    },
    avatarWrap: { position: 'relative' },
    avatar: { width: 72, height: 72, borderRadius: 36 },
    verifiedDot: {
        position: 'absolute', bottom: 0, right: 0,
        width: 20, height: 20, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    profileInfo: { flex: 1 },
    name: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
    email: { fontSize: 13, marginBottom: 2 },
    phone: { fontSize: 13, marginBottom: 6 },
    roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    roleBadgeText: { fontSize: 12, fontWeight: '600' },

    // Sections
    section: { marginTop: 24 },
    sectionHeader: {
        fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: 1, marginBottom: 10, paddingLeft: 4,
    },
    sectionGroup: { gap: 8 },

    // Menu rows
    menuRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: 14, borderWidth: 1,
    },
    menuIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    menuRowContent: { flex: 1 },
    menuRowLabel: { fontSize: 15, fontWeight: '500' },
    menuRowValue: { fontSize: 12, marginTop: 2 },
    menuBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    menuBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },

    // Switch rows
    switchRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 14, borderRadius: 14, borderWidth: 1,
    },
    switchLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },

    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center', alignItems: 'center', padding: 32,
    },
    modalCard: {
        width: '100%', borderRadius: 28, padding: 32, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15, shadowRadius: 20, elevation: 12,
    },
    modalIconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
    modalSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    modalSignOutBtn: {
        width: '100%', backgroundColor: '#FF4D4D', paddingVertical: 16,
        borderRadius: 14, alignItems: 'center', marginBottom: 12,
    },
    modalSignOutText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    modalCancelBtn: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
    modalCancelText: { fontSize: 16, fontWeight: '500' },

    // Credit Card
    creditCard: {
        borderRadius: 20, padding: 18, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between',
        marginTop: 16, marginBottom: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
    },
    creditCardLeft: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
    },
    creditIconWrap: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    creditCardLabel: {
        color: 'rgba(255,255,255,0.7)', fontSize: 11,
        fontWeight: '600', marginBottom: 2,
    },
    creditCardBalance: {
        color: '#fff', fontSize: 20, fontWeight: '800',
    },
    creditCardUnlocks: {
        color: 'rgba(255,255,255,0.6)', fontSize: 11,
        fontWeight: '500', marginTop: 2,
    },
    creditTopUpBtn: {
        backgroundColor: '#fff', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 8,
        flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    creditTopUpText: {
        fontSize: 13, fontWeight: '700',
    },
});

export default ProfileScreen;
