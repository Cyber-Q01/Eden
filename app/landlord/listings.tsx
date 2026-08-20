import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLandlord } from '../../hooks/useLandlord';
import { useNotifications } from '../../hooks/useNotifications';
import { useProfile } from '../../hooks/useProfile';

const { width } = Dimensions.get('window');

type FilterTab = 'All' | 'Live' | 'Pending' | 'Needs Change';

const ListingsScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { role } = useAuth();
    const { activeListings, loading, error, refetch, deleteProperty } = useLandlord();
    const { profile } = useProfile();
    const { unreadCount } = useNotifications();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<FilterTab>('All');

    const liveCount = activeListings.filter(
        (l) => (l.moderation_status || '').toLowerCase() === 'live' || (l.moderation_status || '').toLowerCase() === 'approved'
    ).length;

    const pendingCount = activeListings.filter(
        (l) => !l.moderation_status || (l.moderation_status || '').toLowerCase() === 'pending'
    ).length;

    const needsChangeCount = activeListings.filter(
        (l) => (l.moderation_status || '').toLowerCase() === 'rejected' || (l.moderation_status || '').toLowerCase() === 'flagged'
    ).length;

    const filteredListings = useMemo(() => {
        return activeListings.filter((item) => {
            const matchesSearch =
                item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.location?.toLowerCase().includes(searchQuery.toLowerCase());

            const modStatus = (item.moderation_status || 'pending').toLowerCase();

            const matchesTab =
                activeTab === 'All' ||
                (activeTab === 'Live' && (modStatus === 'live' || modStatus === 'approved')) ||
                (activeTab === 'Pending' && modStatus === 'pending') ||
                (activeTab === 'Needs Change' && (modStatus === 'rejected' || modStatus === 'flagged'));

            return matchesSearch && matchesTab;
        });
    }, [activeListings, searchQuery, activeTab]);

    const handleDelete = (id: string, title: string) => {
        Alert.alert(
            'Delete Listing',
            `Are you sure you want to delete "${title}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteProperty(id)
                },
            ]
        );
    };

    const renderModerationBadge = (modStatus: string) => {
        const status = (modStatus || 'pending').toLowerCase();
        if (status === 'live' || status === 'approved') {
            return (
                <View style={[styles.moderationBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                    <Ionicons name="checkmark-circle" size={11} color="#059669" />
                    <Text style={[styles.moderationText, { color: '#059669' }]}>Approved & Live</Text>
                </View>
            );
        }
        if (status === 'rejected') {
            return (
                <View style={[styles.moderationBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                    <Ionicons name="alert-circle" size={11} color="#DC2626" />
                    <Text style={[styles.moderationText, { color: '#DC2626' }]}>Needs Change / Rejected</Text>
                </View>
            );
        }
        if (status === 'flagged') {
            return (
                <View style={[styles.moderationBadge, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}>
                    <Ionicons name="flag" size={11} color="#EA580C" />
                    <Text style={[styles.moderationText, { color: '#EA580C' }]}>Flagged for Review</Text>
                </View>
            );
        }
        // Default: Pending
        return (
            <View style={[styles.moderationBadge, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Ionicons name="time-outline" size={11} color="#D97706" />
                <Text style={[styles.moderationText, { color: '#D97706' }]}>Waiting for Admin Approval</Text>
            </View>
        );
    };

    const renderListingItem = ({ item }: { item: any }) => {
        const isAvailable = item.status === 'available';
        const modStatus = (item.moderation_status || 'pending').toLowerCase();
        const isNeedsChange = modStatus === 'rejected' || modStatus === 'flagged';
        const feedbackMessage = item.admin_notes || item.moderation_notes || item.rejection_reason;

        return (
            <View style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: isNeedsChange ? '#FECACA' : colors.border },
                isNeedsChange && { borderWidth: 1.5 }
            ]}>
                <View style={styles.cardMainRow}>
                    <Image
                        source={item.images?.[0] ? { uri: item.images[0] } : require('../../assets/images/Homes/home1.png')}
                        style={styles.cardImage}
                    />
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <TouchableOpacity onPress={() => handleDelete(item.id, item.title)}>
                                <Ionicons name="trash-outline" size={18} color="#FF4D4D" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                            <Text style={[styles.cardLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                                {item.location}
                            </Text>
                        </View>

                        {/* Moderation Status Badge */}
                        <View style={{ marginTop: 6 }}>
                            {renderModerationBadge(item.moderation_status)}
                        </View>

                        <View style={styles.footerRow}>
                            <Text style={[styles.cardPrice, { color: colors.primary }]}>
                                ₦{Number(item.price).toLocaleString()}
                            </Text>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: isAvailable ? '#E8F5E9' : '#FFF3E0' }
                            ]}>
                                <Text style={[
                                    styles.statusText,
                                    { color: isAvailable ? '#2E7D32' : '#EF6C00' }
                                ]}>
                                    {isAvailable ? 'Available' : 'Rented'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Prominent Needs Change / Admin Feedback Notice */}
                {isNeedsChange && (
                    <View style={styles.feedbackBox}>
                        <View style={styles.feedbackHeaderRow}>
                            <Ionicons name="alert-circle" size={16} color="#DC2626" />
                            <Text style={styles.feedbackTitle}>Action Required: Admin Feedback</Text>
                        </View>
                        <Text style={styles.feedbackText}>
                            {feedbackMessage || 'Please update your listing details or images to comply with Eden standards and resubmit for approval.'}
                        </Text>
                        <TouchableOpacity
                            style={styles.resolveFeedbackBtn}
                            onPress={() => router.push({
                                pathname: '/landlord-screens/add-property',
                                params: { id: item.id }
                            })}
                        >
                            <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                            <Text style={styles.resolveFeedbackBtnText}>Edit Listing & Resolve Feedback</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.viewButton, { borderColor: colors.border }]}
                    onPress={() => router.push(`/property/${item.id}`)}
                >
                    <Text style={[styles.viewButtonText, { color: colors.primary }]}>View Details & Status</Text>
                    <Ionicons name="chevron-forward" size={15} color={colors.primary} />
                </TouchableOpacity>
            </View>
        );
    };

    const TabButton = ({ title, tabKey, count, badgeColor }: { title: string; tabKey: FilterTab; count: number; badgeColor?: string }) => {
        const isActive = activeTab === tabKey;
        return (
            <TouchableOpacity
                onPress={() => setActiveTab(tabKey)}
                style={[
                    styles.tabButton,
                    { backgroundColor: isActive ? colors.primary : colors.card, borderColor: colors.border },
                    isActive && { borderColor: colors.primary }
                ]}
            >
                <Text style={[
                    styles.tabText,
                    { color: isActive ? '#FFF' : colors.text }
                ]}>
                    {title}
                </Text>
                {count > 0 && (
                    <View style={[
                        styles.tabBadge,
                        { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : (badgeColor || '#EFF6FF') }
                    ]}>
                        <Text style={[
                            styles.tabBadgeText,
                            { color: isActive ? '#FFF' : (tabKey === 'Needs Change' ? '#DC2626' : colors.primary) }
                        ]}>
                            {count}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper withScrollView={true} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {role === 'AGENT' ? 'Assigned Properties' : 'My Listings'}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        {activeListings.length} total properties
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: colors.card }]}
                        onPress={() => router.push('/shared-screens/NotificationsScreen')}
                    >
                        <Ionicons name="notifications-outline" size={24} color={colors.text} />
                        {unreadCount > 0 && <View style={styles.notificationDot} />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/landlord/profile')}>
                        <Image
                            source={profile?.user_biodata?.profile_photo ? { uri: profile.user_biodata.profile_photo } : require('../../assets/icon/profiles/profile1.png')}
                            style={styles.avatar}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search and Moderation Tabs */}
            <View style={styles.filterContainer}>
                <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                    <TextInput
                        placeholder={role === 'AGENT' ? "Search assigned properties..." : "Search your listings..."}
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery !== '' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Pills with Exact Counts */}
                <View style={styles.tabContainer}>
                    <TabButton title="All" tabKey="All" count={activeListings.length} />
                    <TabButton title="Live" tabKey="Live" count={liveCount} badgeColor="#ECFDF5" />
                    <TabButton title="Pending" tabKey="Pending" count={pendingCount} badgeColor="#FFFBEB" />
                    <TabButton title="Needs Change" tabKey="Needs Change" count={needsChangeCount} badgeColor="#FEF2F2" />
                </View>
            </View>

            {loading && activeListings.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : filteredListings.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons
                        name={activeTab === 'Needs Change' ? 'checkmark-done-circle-outline' : 'business-outline'}
                        size={64}
                        color={activeTab === 'Needs Change' ? '#10B981' : colors.border}
                    />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                        {activeTab === 'Needs Change'
                            ? 'No Listings Requiring Changes'
                            : 'No listings in this category'}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        {activeTab === 'Needs Change'
                            ? 'All your listings are approved or waiting for review.'
                            : searchQuery || activeTab !== 'All'
                            ? 'Try adjusting your search or filter pills.'
                            : 'Tap the + button below to add your property listing.'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredListings}
                    keyExtractor={(item) => item.id}
                    renderItem={renderListingItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />
                    }
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/landlord-screens/add-property')}
            >
                <Ionicons name="add" size={32} color="#FFF" />
            </TouchableOpacity>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 14,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
    },
    headerSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF4D4D',
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
    },
    filterContainer: {
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 14,
        paddingHorizontal: 14,
        gap: 8,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 13.5,
        fontWeight: '500',
    },
    tabContainer: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 12,
        borderWidth: 1,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '700',
    },
    tabBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 8,
    },
    tabBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 100,
    },
    card: {
        borderRadius: 20,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    cardMainRow: {
        flexDirection: 'row',
    },
    cardImage: {
        width: 92,
        height: 105,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
    },
    cardContent: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'space-between',
        paddingVertical: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        flex: 1,
        marginRight: 6,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    cardLocation: {
        fontSize: 12,
    },
    moderationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 6,
        borderWidth: 1,
    },
    moderationText: {
        fontSize: 9.5,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    cardPrice: {
        fontSize: 15,
        fontWeight: '800',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    feedbackBox: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        marginTop: 12,
        gap: 6,
    },
    feedbackHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    feedbackTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#DC2626',
    },
    feedbackText: {
        fontSize: 12,
        color: '#991B1B',
        lineHeight: 16,
    },
    resolveFeedbackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#DC2626',
        borderRadius: 8,
        paddingVertical: 7,
        marginTop: 4,
    },
    resolveFeedbackBtnText: {
        color: '#FFFFFF',
        fontSize: 11.5,
        fontWeight: '700',
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 10,
        gap: 4,
    },
    viewButtonText: {
        fontSize: 12,
        fontWeight: '700',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 58,
        height: 58,
        borderRadius: 29,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});

export default ListingsScreen;
