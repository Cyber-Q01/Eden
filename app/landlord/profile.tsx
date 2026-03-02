import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';

const ProfileItem = ({ label, showArrow = true, onPress, textColor }: { label: string; showArrow?: boolean; onPress?: () => void; textColor?: string }) => (
    <TouchableOpacity style={[styles.profileItem, { backgroundColor: useTheme().colors.card }]} onPress={onPress}>
        <Text style={[styles.profileItemText, { color: textColor || useTheme().colors.textSecondary }]}>{label}</Text>
        {showArrow && <Ionicons name="chevron-forward" size={20} color={useTheme().colors.textSecondary} />}
    </TouchableOpacity>
);

const LandlordProfileScreen = () => {
    const router = useRouter();
    const { colors, isDark, toggleTheme } = useTheme();

    return (
        <ScreenWrapper style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>

                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
                    <Image
                        source={require('../../assets/icon/profiles/profile1.png')}
                        style={styles.avatar}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={[styles.userName, { color: colors.text }]}>Kinz</Text>
                        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>Kinzswiz1234@gmail.com</Text>
                        <View style={[styles.verifiedBadge, { backgroundColor: colors.verifiedBadge }]}>
                            <Text style={[styles.verifiedText, { color: colors.verifiedText }]}>Verified Landlord</Text>
                        </View>
                    </View>
                </View>

                {/* Verification Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Verification</Text>
                    <TouchableOpacity style={[styles.verificationCard, { backgroundColor: colors.card }]}>
                        <View>
                            <Text style={[styles.verificationTitle, { color: colors.text }]}>KYC Verification</Text>
                            <Text style={[styles.verificationStatus, { color: colors.verifiedText }]}>Completed</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Account Settings Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Account Settings</Text>
                    <View style={styles.itemsContainer}>
                        <ProfileItem label="Edit Profile" />
                        <ProfileItem label="Change Password" />
                        <ProfileItem label="Change Payment Method" />
                        <ProfileItem label="Bank Details" onPress={() => router.push('/landlord-screens/bank-account')} />
                    </View>
                </View>

                {/* Theme Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Appearance</Text>
                    <View style={[styles.notificationRow, { backgroundColor: colors.card }]}>
                        <Text style={[styles.profileItemText, { color: colors.textSecondary }]}>Dark Mode</Text>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#767577', true: colors.primary }}
                            thumbColor={isDark ? '#FFF' : '#f4f3f4'}
                        />
                    </View>
                </View>

                {/* Notifications Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Notifications</Text>
                    <View style={styles.itemsContainer}>
                        <View style={[styles.notificationRow, { backgroundColor: colors.card }]}>
                            <Text style={[styles.profileItemText, { color: colors.textSecondary }]}>Push Notifications</Text>
                            <View style={styles.toggleActive} />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F8FAF9',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F2F2F7',
    },
    profileInfo: {
        flex: 1,
        alignItems: 'center',
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    verifiedBadge: {
        backgroundColor: '#E6F9F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    verifiedText: {
        color: '#00C853',
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
    },
    verificationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
        elevation: 1,
    },
    verificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    verificationStatus: {
        fontSize: 14,
        color: '#00C853',
        fontWeight: '500',
    },
    itemsContainer: {
        gap: 12,
    },
    profileItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    profileItemText: {
        fontSize: 15,
        color: '#666',
        fontWeight: '500',
    },
    notificationRow: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toggleActive: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#00C853',
    },
});

export default LandlordProfileScreen;
