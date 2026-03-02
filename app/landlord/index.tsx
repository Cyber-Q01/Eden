import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const LandlordDashboard = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    return (
        <ScreenWrapper style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.greeting, { color: colors.primary }]}>Hi, Micheal</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={[styles.notificationBtn, { backgroundColor: colors.card }]}>
                            <Ionicons name="notifications-outline" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Image
                            source={require('../../assets/icon/profiles/profile1.png')}
                            style={styles.profileImage}
                        />
                    </View>
                </View>

                {/* Earnings Card */}
                <View style={[styles.earningsCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.earningsLabel, { color: colors.textSecondary }]}>Total Earning</Text>
                    <Text style={[styles.earningsAmount, { color: colors.primary }]}>N540,000</Text>
                    <View style={[styles.trendBadge, { backgroundColor: colors.verifiedBadge }]}>
                        <Text style={[styles.trendText, { color: colors.verifiedText }]}>+15% tt month</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: colors.card }]}
                            onPress={() => router.push('/landlord-screens/add-property')}
                        >
                            <View style={styles.actionIconContainer}>
                                <Ionicons name="add-circle-outline" size={32} color={colors.primary} />
                            </View>
                            <Text style={[styles.actionText, { color: colors.text }]}>Add New Listing</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]}>
                            <View style={styles.actionIconContainer}>
                                <Ionicons name="eye-outline" size={32} color={colors.primary} />
                            </View>
                            <Text style={[styles.actionText, { color: colors.text }]}>View Active Listings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]}>
                            <View style={styles.actionIconContainer}>
                                <Ionicons name="chatbubble-outline" size={32} color={colors.primary} />
                            </View>
                            <Text style={[styles.actionText, { color: colors.text }]}>Add New Listing</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]}>
                            <View style={styles.actionIconContainer}>
                                <Ionicons name="create-outline" size={32} color={colors.primary} />
                            </View>
                            <Text style={[styles.actionText, { color: colors.text }]}>Rent Requests</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Your Active Listing */}
                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Active Listing</Text>
                    <View style={[styles.listingPlaceholder, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    greeting: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0047AB',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    notificationBtn: {
        padding: 4,
    },
    profileImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E0E0E0',
    },
    earningsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
        marginBottom: 40,
    },
    earningsLabel: {
        fontSize: 16,
        color: '#999',
        marginBottom: 8,
    },
    earningsAmount: {
        fontSize: 32,
        fontWeight: '800',
        color: '#0047AB',
        marginBottom: 16,
    },
    trendBadge: {
        backgroundColor: '#E6F9F0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    trendText: {
        color: '#00C853',
        fontSize: 14,
        fontWeight: '600',
    },
    sectionContainer: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        marginBottom: 20,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
    },
    actionCard: {
        width: (width - 56) / 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    actionIconContainer: {
        marginBottom: 12,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    listingPlaceholder: {
        width: '100%',
        height: 200,
        backgroundColor: '#E0E0E0',
        borderRadius: 24,
    },
});

export default LandlordDashboard;
