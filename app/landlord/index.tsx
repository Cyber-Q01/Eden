import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import PropertyCard from '../../components/PropertyCard';
import RetryOverlay from '../../components/RetryOverlay';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useLandlord } from '../../hooks/useLandlord';
import { useProfile } from '../../hooks/useProfile';
import { useNotifications } from '../../hooks/useNotifications';

const { width } = Dimensions.get('window');

const LandlordDashboard = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { stats, activeListings, loading, error, refetch } = useLandlord();
    const { profile } = useProfile();
    const { unreadCount } = useNotifications();

    return (
        <ScreenWrapper withScrollView={true} style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.greeting, { color: colors.primary }]}>Hi, {profile?.first_name || 'Landlord'}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={[styles.notificationBtn, { backgroundColor: colors.card }]}
                            onPress={() => router.push('/shared-screens/NotificationsScreen')}
                        >
                            <Ionicons name="notifications-outline" size={24} color={colors.text} />
                            {unreadCount > 0 && <View style={[styles.notificationDot, { borderColor: colors.background }]} />}
                        </TouchableOpacity>
                        {profile?.user_biodata?.profile_photo ? (
                            <Image
                                source={{ uri: profile.user_biodata.profile_photo }}
                                style={styles.profileImage}
                            />
                        ) : (
                            <Image
                                source={require('../../assets/icon/profiles/profile1.png')}
                                style={styles.profileImage}
                            />
                        )}
                    </View>
                </View>

                {/* Earnings Card */}
                <View style={[styles.earningsCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.earningsLabel, { color: colors.textSecondary }]}>Total Earning</Text>
                    <Text style={[styles.earningsAmount, { color: colors.primary }]}>{stats.earnings}</Text>
                    <View style={[styles.trendBadge, { backgroundColor: colors.verifiedBadge }]}>
                        <Text style={[styles.trendText, { color: colors.verifiedText }]}>Active Listings: {stats.activeCount}</Text>
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

                        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => router.push('/landlord/listings')}>
                            <View style={styles.actionIconContainer}>
                                <Ionicons name="eye-outline" size={32} color={colors.primary} />
                            </View>
                            <Text style={[styles.actionText, { color: colors.text }]}>View Active Listings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => router.push('/landlord/chat')}>
                            <View style={styles.actionIconContainer}>
                                <Ionicons name="chatbubble-outline" size={32} color={colors.primary} />
                            </View>
                            <Text style={[styles.actionText, { color: colors.text }]}>Messages</Text>
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
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Active Listings</Text>
                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : error ? (
                        <RetryOverlay message="Couldn't load listings. Tap to retry." onRetry={refetch} />
                    ) : activeListings.length === 0 ? (
                        <View style={[styles.listingPlaceholder, { backgroundColor: isDark ? '#333' : '#E0E0E0', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ color: colors.textSecondary }}>No listings yet.</Text>
                        </View>
                    ) : (
                        activeListings.map(item => (
                            <PropertyCard
                                key={item.id}
                                image={item.images?.[0] ? { uri: item.images[0] } : require('../../assets/images/Homes/home1.png')}
                                title={item.title}
                                price={`₦${item.price}`}
                                location={item.location}
                                variant="horizontal"
                                onPress={() => router.push(`/property/${item.id}`)}
                                containerStyle={{ marginBottom: 15 }}
                            />
                        ))
                    )}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    notificationBtn: {
        padding: 4,
        borderRadius: 20,
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 2,
        right: 4,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#ef4444',
        borderWidth: 2,
    },
    profileImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    earningsCard: {
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
        marginBottom: 8,
    },
    earningsAmount: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 16,
    },
    trendBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    trendText: {
        fontSize: 14,
        fontWeight: '600',
    },
    sectionContainer: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
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
        textAlign: 'center',
    },
    listingPlaceholder: {
        width: '100%',
        height: 200,
        borderRadius: 24,
    },
});

export default LandlordDashboard;
