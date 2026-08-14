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

const ListingsScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { role } = useAuth();
    const { activeListings, loading, error, refetch, deleteProperty } = useLandlord();
    const { profile } = useProfile();
    const { unreadCount } = useNotifications();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'All' | 'Available' | 'Taken'>('All');

    const filteredListings = useMemo(() => {
        return activeListings.filter((item) => {
            const matchesSearch =
                item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.location?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesTab =
                activeTab === 'All' ||
                (activeTab === 'Available' && item.status === 'available') ||
                (activeTab === 'Taken' && item.status === 'taken');

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

    const renderListingItem = ({ item }: { item: any }) => {
        const isAvailable = item.status === 'available';

        return (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
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
                            <Ionicons name="trash-outline" size={20} color="#FF4D4D" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.cardLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.location}
                        </Text>
                    </View>

                    <View style={styles.footerRow}>
                        <Text style={[styles.cardPrice, { color: colors.primary }]}>
                            ₦{item.price.toLocaleString()}
                        </Text>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: isAvailable ? '#E8F5E9' : '#FFF3E0' }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: isAvailable ? '#2E7D32' : '#EF6C00' }
                            ]}>
                                {isAvailable ? 'Available' : 'Taken'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.viewButton, { borderColor: colors.border }]}
                        onPress={() => router.push(`/property/${item.id}`)}
                    >
                        <Text style={[styles.viewButtonText, { color: colors.primary }]}>View Details</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const TabButton = ({ title }: { title: 'All' | 'Available' | 'Taken' }) => {
        const isActive = activeTab === title;
        return (
            <TouchableOpacity
                onPress={() => setActiveTab(title)}
                style={[
                    styles.tabButton,
                    isActive && { backgroundColor: colors.primary }
                ]}
            >
                <Text style={[
                    styles.tabText,
                    { color: isActive ? '#FFF' : colors.textSecondary }
                ]}>
                    {title}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper withScrollView={true} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{role === 'AGENT' ? 'Assigned Properties' : 'My Listings'}</Text>
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

            {/* Search and Tabs */}
            <View style={styles.filterContainer}>
                <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
                    <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                    <TextInput
                        placeholder={role === 'AGENT' ? "Search assigned properties..." : "Search your listings..."}
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery !== '' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.tabContainer}>
                    <TabButton title="All" />
                    <TabButton title="Available" />
                    <TabButton title="Taken" />
                </View>
            </View>

            {loading && activeListings.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : filteredListings.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="business-outline" size={80} color={colors.border} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No listings found</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        {searchQuery || activeTab !== 'All'
                            ? "Try adjusting your filters"
                            : "Start by adding your first property"}
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
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 10,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF4D4D',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    filterContainer: {
        paddingHorizontal: 20,
        gap: 16,
        marginBottom: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        borderRadius: 16,
        paddingHorizontal: 15,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    tabContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    tabButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#F0F0F0', // Light gray for inactive
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 100,
    },
    card: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    cardImage: {
        width: 100,
        height: 120,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
    },
    cardContent: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
        marginRight: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    cardLocation: {
        fontSize: 13,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    cardPrice: {
        fontSize: 17,
        fontWeight: '800',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
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
        fontSize: 13,
        fontWeight: '700',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginTop: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
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
