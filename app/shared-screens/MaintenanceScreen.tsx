import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useRequests, MaintenanceItem } from '../../hooks/useRequests';

type MaintenanceStatus = 'all' | 'pending' | 'in_progress' | 'resolved' | 'closed';

const MaintenanceScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { fetchMaintenanceRequests, loading } = useRequests();
    const [requests, setRequests] = useState<MaintenanceItem[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<MaintenanceItem[]>([]);
    const [activeFilter, setActiveFilter] = useState<MaintenanceStatus>('all');
    const [refreshing, setRefreshing] = useState(false);

    // Keep a ref to the master data so filter logic doesn't cause re-fetch loops
    const requestsRef = React.useRef<MaintenanceItem[]>([]);
    const activeFilterRef = React.useRef<MaintenanceStatus>(activeFilter);
    activeFilterRef.current = activeFilter;

    const applyFilter = useCallback((filter: MaintenanceStatus, data?: MaintenanceItem[]) => {
        const source = data ?? requestsRef.current;
        setActiveFilter(filter);
        if (filter === 'all') {
            setFilteredRequests(source);
        } else {
            setFilteredRequests(source.filter(r => r.status === filter));
        }
    }, []);

    const loadRequests = useCallback(async () => {
        const data = await fetchMaintenanceRequests();
        requestsRef.current = data;
        setRequests(data);
        // Re-apply whatever filter is currently active on the fresh data
        applyFilter(activeFilterRef.current, data);
    }, [fetchMaintenanceRequests, applyFilter]);

    // Only re-apply filter when activeFilter changes (NOT re-fetch)
    useEffect(() => {
        if (requestsRef.current.length > 0) {
            applyFilter(activeFilter);
        }
    }, [activeFilter, applyFilter]);

    // Refetch whenever screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadRequests();
        }, [loadRequests])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRequests();
        setRefreshing(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#EF4444'; // Red
            case 'in_progress': return '#F59E0B'; // Orange
            case 'resolved': return '#10B981'; // Green
            default: return '#94A3B8'; // Gray
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Open';
            case 'in_progress': return 'In Progress';
            case 'resolved': return 'Resolved';
            case 'closed': return 'Closed';
            default: return status;
        }
    };

    const renderHeader = () => (
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Maintenance</Text>
            <TouchableOpacity
                style={[styles.newBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/profile/maintenance-request')}
            >
                <Ionicons name="add" size={16} color="#FFF" />
                <Text style={styles.newBtnText}>New</Text>
            </TouchableOpacity>
        </View>
    );

    const renderSummary = () => {
        const open = requests.filter(r => r.status === 'pending').length;
        const inProgress = requests.filter(r => r.status === 'in_progress').length;
        const resolved = requests.filter(r => r.status === 'resolved' || r.status === 'closed').length;

        return (
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{open}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Open</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{inProgress}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>In Progress</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#10B981' }]}>{resolved}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Resolved</Text>
                </View>
            </View>
        );
    };

    const renderFilters = () => (
        <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['all', 'pending', 'in_progress', 'resolved'] as MaintenanceStatus[]}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
                <TouchableOpacity
                    style={[
                        styles.filterTab,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        activeFilter === item && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => applyFilter(item)}
                >
                    <Text style={[
                        styles.filterTabText,
                        { color: activeFilter === item ? '#FFF' : colors.textSecondary },
                        activeFilter === item && { fontWeight: '700' }
                    ]}>
                        {item === 'all' ? 'All' : getStatusLabel(item)}
                    </Text>
                </TouchableOpacity>
            )}
        />
    );

    const renderRequest = ({ item }: { item: MaintenanceItem }) => {
        const propertyTitle = item.property_title || item.property?.title || 'Rented Property';

        return (
            <TouchableOpacity
                style={[styles.requestCard, { backgroundColor: colors.card, borderLeftColor: getStatusColor(item.status), borderColor: colors.border }]}
                activeOpacity={0.75}
                onPress={() =>
                    router.push({
                        pathname: '/shared-screens/MaintenanceDetailsScreen',
                        params: { 
                            id: item.id, 
                            requestData: encodeURIComponent(JSON.stringify(item)),
                        },
                    })
                }
            >
                <View style={styles.requestHeader}>
                    <Text style={[styles.requestId, { color: colors.textSecondary }]}>
                        #MT-{String(item.id).slice(-4).toUpperCase()}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {getStatusLabel(item.status)}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.requestTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                </Text>

                <Text style={[styles.requestDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.description}
                </Text>

                <View style={styles.requestFooter}>
                    <View style={styles.footerLeft}>
                        <View style={styles.footerInfo}>
                            <Ionicons name="home-outline" size={13} color={colors.primary} />
                            <Text style={[styles.footerText, { color: colors.text }]} numberOfLines={1}>
                                {propertyTitle}
                            </Text>
                        </View>
                        <View style={styles.footerInfo}>
                            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                                {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </View>

                <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '12' }]}>
                    <Text style={[styles.categoryText, { color: colors.primary }]}>
                        {(item.category || 'General').charAt(0).toUpperCase() + (item.category || 'general').slice(1)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            {renderHeader()}

            <FlatList
                data={filteredRequests}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderRequest}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={() => (
                    <View>
                        {/* Need an Artisan Direct Trigger Banner */}
                        <TouchableOpacity
                            style={[styles.findArtisanBanner, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}
                            onPress={() => router.push('/shared-screens/FindArtisanScreen')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.artisanIconWrap, { backgroundColor: colors.primary }]}>
                                <Ionicons name="construct" size={18} color="#FFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.findArtisanTitle, { color: colors.primary }]}>Need a Technician / Artisan?</Text>
                                <Text style={[styles.findArtisanSub, { color: colors.textSecondary }]}>Browse Eden vetted plumbers, electricians, AC & carpenters</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                        </TouchableOpacity>

                        {renderSummary()}
                        {renderFilters()}
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        {loading && requests.length === 0 ? (
                            <ActivityIndicator size="large" color={colors.primary} />
                        ) : (
                            <>
                                <Ionicons name="construct-outline" size={54} color={colors.border} />
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Maintenance Requests</Text>
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    {activeFilter !== 'all'
                                        ? `No ${getStatusLabel(activeFilter).toLowerCase()} requests found.`
                                        : 'You have not submitted any maintenance requests yet.'}
                                </Text>
                            </>
                        )}
                    </View>
                )}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            />

            <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/profile/maintenance-request')}
                >
                    <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.submitBtnText}>Submit New Request</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    newBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    newBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    findArtisanBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 14,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10,
    },
    artisanIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    findArtisanTitle: {
        fontSize: 13.5,
        fontWeight: '700',
    },
    findArtisanSub: {
        fontSize: 11,
        marginTop: 2,
    },
    summaryCard: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 14,
        paddingVertical: 16,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 2,
    },
    summaryLabel: {
        fontSize: 11.5,
        fontWeight: '500',
    },
    summaryDivider: {
        width: 1,
        height: 24,
    },
    filterList: {
        paddingHorizontal: 20,
        marginTop: 16,
        marginBottom: 12,
        gap: 8,
    },
    filterTab: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 12,
        borderWidth: 1,
    },
    filterTabText: {
        fontSize: 12,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 110,
    },
    requestCard: {
        marginHorizontal: 20,
        marginBottom: 14,
        padding: 16,
        borderRadius: 18,
        borderLeftWidth: 4,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    requestId: {
        fontSize: 11.5,
        fontWeight: '700',
        fontFamily: 'monospace',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    requestTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    requestDesc: {
        fontSize: 12.5,
        lineHeight: 17,
        marginBottom: 10,
    },
    requestFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 11.5,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 8,
    },
    categoryText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    emptyContainer: {
        marginTop: 40,
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 4,
    },
    emptyText: {
        fontSize: 13,
        textAlign: 'center',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
        borderTopWidth: 1,
    },
    submitBtn: {
        height: 52,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default MaintenanceScreen;
