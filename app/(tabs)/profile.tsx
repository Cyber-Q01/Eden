import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';

const ProfileScreen = () => {
    const router = useRouter();
    const { colors, isDark, toggleTheme } = useTheme();
    const [pushEnabled, setPushEnabled] = React.useState(true);

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Image
                        source={{ uri: 'https://i.pravatar.cc/200' }}
                        style={styles.avatar}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={[styles.name, { color: colors.text }]}>Kinz</Text>
                        <Text style={[styles.email, { color: colors.textSecondary }]}>Kinzswiz1234@gmail.com</Text>
                        <View style={[styles.badge, { backgroundColor: colors.verifiedBadge, borderColor: colors.verifiedText }]}>
                            <Text style={[styles.badgeText, { color: colors.verifiedText }]}>Verified Tenant</Text>
                        </View>
                    </View>
                </View>

                {/* Verification Section */}
                <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Verification</Text>
                <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card }]}>
                    <View style={styles.menuItemContent}>
                        <Text style={[styles.menuItemTitle, { color: colors.text }]}>KYC Verification</Text>
                        <Text style={[styles.menuItemStatus, { color: colors.verifiedText }]}>Completed</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Theme Section */}
                <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Appearance</Text>
                <View style={[styles.notificationItem, { backgroundColor: colors.card }]}>
                    <Text style={[styles.notificationText, { color: colors.textSecondary }]}>Dark Mode</Text>
                    <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ false: '#767577', true: colors.primary }}
                        thumbColor={isDark ? '#FFF' : '#f4f3f4'}
                    />
                </View>

                {/* Account Settings Section */}
                <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Account Settings</Text>
                <View style={styles.menuGroup}>
                    <TouchableOpacity style={[styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/profile/edit-profile')}>
                        <Text style={[styles.menuButtonText, { color: colors.textSecondary }]}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/profile/maintenance-request')}>
                        <Text style={[styles.menuButtonText, { color: colors.textSecondary }]}>Maintenance Request</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/profile/complaint-request')}>
                        <Text style={[styles.menuButtonText, { color: colors.textSecondary }]}>Complaint Request</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.menuButtonText, { color: colors.textSecondary }]}>Change Password</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.menuButtonText, { color: colors.textSecondary }]}>Change Payment Method</Text>
                    </TouchableOpacity>
                </View>

                {/* Notifications Section */}
                <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Notifications</Text>
                <View style={[styles.notificationItem, { backgroundColor: colors.card }]}>
                    <Text style={[styles.notificationText, { color: colors.textSecondary }]}>Push Notification</Text>
                    <Switch
                        value={pushEnabled}
                        onValueChange={setPushEnabled}
                        trackColor={{ false: '#D0D0D0', true: colors.primary }}
                        thumbColor="#FFFFFF"
                    />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#333',
        textAlign: 'center',
        marginVertical: 20,
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    profileInfo: {
        flex: 1,
        alignItems: 'center',
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#999',
        marginBottom: 10,
    },
    badge: {
        backgroundColor: '#E6F9F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D0F0E0',
    },
    badgeText: {
        color: '#00C853',
        fontSize: 12,
        fontWeight: '600',
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: '#888',
        textAlign: 'center',
        marginBottom: 16,
        marginTop: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    menuItemContent: {
        flex: 1,
    },
    menuItemTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    menuItemStatus: {
        fontSize: 14,
        color: '#00C853',
        fontWeight: '500',
    },
    menuGroup: {
        gap: 12,
        marginBottom: 24,
    },
    menuButton: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    menuButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    notificationText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
});

export default ProfileScreen;
