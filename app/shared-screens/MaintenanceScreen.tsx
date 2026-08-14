import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { useRequests } from '../../hooks/useRequests';

type MaintenanceStatus = 'all' | 'pending' | 'in_progress' | 'resolved' | 'closed';

const MaintenanceScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { fetchMaintenanceRequests, loading } = useRequests();
    const [requests, setRequests] = useState<any[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
    const [activeFilter, setActiveFilter] = useState<MaintenanceStatus>('all');
    const [refreshing, setRefreshing] = useState(false);

    const loadRequests = async () => {
        const data = await fetchMaintenanceRequests();
        setRequests(data);
        applyFilter(activeFilter, data);
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRequests();
        setRefreshing(false);
    };

    const applyFilter = (filter: MaintenanceStatus, data: any[] = requests) => {
        setActiveFilter(filter);
        if (filter === 'all') {
            setFilteredRequests(data);
        } else {
            setFilteredRequests(data.filter(r => r.status === filter));
        }
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
        <View style={[styles.header, { backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Maintenance</Text>
            <TouchableOpacity
                style={[styles.newBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/profile/maintenance-request')}
            >
                <Text style={styles.newBtnText}>+New</Text>
            </TouchableOpacity>
        </View>
    );

    const renderSummary = () => {
        const open = requests.filter(r => r.status === 'pending').length;
        const inProgress = requests.filter(r => r.status === 'in_progress').length;
        const resolved = requests.filter(r => r.status === 'resolved').length;

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
            data={['all', 'pending', 'in_progress', 'resolved', 'closed']}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
                <TouchableOpacity
                    style={[
                        styles.filterTab,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        activeFilter === item && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => applyFilter(item as MaintenanceStatus)}
                >
                    <Text style={[
                        styles.filterTabText,
                        { color: colors.textSecondary },
                        activeFilter === item && { color: '#FFF' }
                    ]}>
                        {item === 'all' ? 'all' : getStatusLabel(item)}
                    </Text>
                </TouchableOpacity>
            )}
        />
    );

    const renderRequest = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.requestCard, { backgroundColor: colors.card, borderLeftColor: getStatusColor(item.status) }]}
            activeOpacity={0.7}
        >
            <View style={styles.requestHeader}>
                <Text style={[styles.requestId, { color: colors.textSecondary }]}>#MT-{String(item.id).padStart(3, '0')}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {getStatusLabel(item.status)}
                    </Text>
                </View>
            </View>

            <Text style={[styles.requestTitle, { color: colors.text }]} numberOfLines={1}>{item.description}</Text>

            <View style={styles.requestFooter}>
                <View style={styles.footerLeft}>
                    <View style={styles.footerInfo}>
                        <Ionicons name="home-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>2 Bed Flat, Lekki</Text>
                    </View>
                    <View style={styles.footerInfo}>
                        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                            {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </View>

            <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[styles.categoryText, { color: colors.primary }]}>{item.category.charAt(0).toUpperCase() + item.category.slice(1)}</Text>
            </View>
        </TouchableOpacity>
    );

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
                        {renderSummary()}
                        {renderFilters()}
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} />
                        ) : (
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No maintenance requests found</Text>
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
        paddingBottom: 10,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    newBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    newBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    summaryCard: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 15,
        paddingVertical: 20,
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
        fontWeight: '700',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
    },
    summaryDivider: {
        width: 1,
        height: 24,
    },
    filterList: {
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 15,
        gap: 10,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    filterTabText: {
        fontSize: 13,
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 100,
    },
    requestCard: {
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderRadius: 20,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    requestId: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    requestTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    requestFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 12,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '600',
    },
    emptyContainer: {
        marginTop: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 35,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
        borderTopWidth: 1,
    },
    submitBtn: {
        height: 56,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default MaintenanceScreen;
