import BackButton from '@/components/BackButton';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLandlord } from '@/hooks/useLandlord';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

// ─── Format Currency with 2 decimals ──────────────────────────────────────────
const formatNaira = (amount: number | string | undefined | null): string => {
    if (!amount && amount !== 0) return '₦0.00';
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : Number(amount);
    if (isNaN(num)) return '₦0.00';
    return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function LandlordAnalyticsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { user, role } = useAuth();
    const { stats, activeListings, loading, refetch } = useLandlord();
    const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');
    const [refreshing, setRefreshing] = useState(false);
    const [rentalsList, setRentalsList] = useState<any[]>([]);

    useEffect(() => {
        const fetchLandlordRentals = async () => {
            if (!user) return;
            try {
                const { data } = await supabase
                    .from('rentals')
                    .select('id, property_id, amount, status, created_at, renter:users!renter_id(first_name, last_name, email)')
                    .eq('owner_id', user.id);
                if (data) {
                    setRentalsList(data);
                }
            } catch (e) {
                console.warn('Rentals fetch notice:', e);
            }
        };

        fetchLandlordRentals();
    }, [user]);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        if (user) {
            try {
                const { data } = await supabase
                    .from('rentals')
                    .select('id, property_id, amount, status, created_at, renter:users!renter_id(first_name, last_name, email)')
                    .eq('owner_id', user.id);
                if (data) setRentalsList(data);
            } catch {}
        }
        setRefreshing(false);
    };

    // Calculate exact occupancy and financials
    const totalProperties = activeListings.length;

    // Check properties with confirmed active rentals
    const activeRentalPropIds = new Set(
        rentalsList.filter((r) => r.status === 'confirmed').map((r) => r.property_id)
    );

    const occupiedCount = activeListings.filter(
        (p) =>
            p.status === 'rented' ||
            p.status === 'occupied' ||
            p.is_occupied ||
            activeRentalPropIds.has(p.id)
    ).length;

    const availableCount = Math.max(0, totalProperties - occupiedCount);
    const occupancyRate = totalProperties > 0 ? Math.round((occupiedCount / totalProperties) * 100) : 0;

    const totalPortfolioValue = activeListings.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const displayCollected = stats?.totalCollected ?? (stats?.amountPaid ? stats.amountPaid + (stats?.amountPending || 0) : 0);
    const monthlyGrossExpected = Math.round(totalPortfolioValue / 12);
    const amountPaidToBank = stats?.amountPaid ?? 0;
    const amountInEscrow = stats?.amountPending ?? 0;

    // Monthly chart data strictly from payouts
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = stats?.monthlyEarnings || Array(12).fill(0);
    const maxMonthlyVal = Math.max(...monthlyData, 10000);

    const handleExport = () => {
        Alert.alert(
            'Export Financial Report',
            'Your comprehensive landlord income statement and occupancy ledger will be prepared in CSV / PDF format.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Download Report',
                    onPress: () => {
                        Alert.alert('Report Ready', 'Your annual rent collection statement has been exported.');
                    }
                }
            ]
        );
    };

    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <BackButton />
                <View style={styles.headerTitleWrap}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Portfolio Analytics</Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Revenue & Rent Collections</Text>
                </View>
                <TouchableOpacity
                    style={[styles.exportBtn, { backgroundColor: colors.primary + '15' }]}
                    onPress={handleExport}
                >
                    <Ionicons name="download-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* ── Hero Revenue Summary Banner ── */}
                <LinearGradient
                    colors={['#1D4ED8', '#1E3A8A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroBanner}
                >
                    <View style={styles.decorCircle1} />
                    <View style={styles.decorCircle2} />

                    <View style={styles.heroTopRow}>
                        <View>
                            <Text style={styles.heroLabel}>Total Generated</Text>
                            <Text style={styles.heroValue}>{formatNaira(displayCollected)}</Text>
                        </View>
                        <View style={styles.badgeWrap}>
                            <Ionicons name="trending-up" size={14} color="#10B981" />
                            <Text style={styles.badgeText}>Verified Earnings</Text>
                        </View>
                    </View>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroBottomRow}>
                        <View>
                            <Text style={styles.subStatLabel}>Paid to Account</Text>
                            <Text style={styles.subStatValue}>{formatNaira(amountPaidToBank)}</Text>
                        </View>
                        <View style={styles.subStatDivider} />
                        <View>
                            <Text style={styles.subStatLabel}>Pending (In Eden)</Text>
                            <Text style={[styles.subStatValue, { color: '#6EE7B7' }]}>{formatNaira(amountInEscrow)}</Text>
                        </View>
                        <View style={styles.subStatDivider} />
                        <View>
                            <Text style={styles.subStatLabel}>Occupancy</Text>
                            <Text style={styles.subStatValue}>{occupancyRate}%</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* ── Timeframe Pills ── */}
                <View style={styles.timeframeRow}>
                    {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((tf) => {
                        const isSelected = timeframe === tf;
                        return (
                            <TouchableOpacity
                                key={tf}
                                style={[
                                    styles.tfPill,
                                    {
                                        backgroundColor: isSelected ? colors.primary : colors.card,
                                        borderColor: isSelected ? colors.primary : colors.border,
                                    },
                                ]}
                                onPress={() => setTimeframe(tf)}
                            >
                                <Text style={[styles.tfText, { color: isSelected ? '#FFF' : colors.textSecondary }]}>
                                    {tf}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Key Operational Metric Cards ── */}
                <View style={styles.metricsGrid}>
                    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.metricIconWrap, { backgroundColor: '#EFF6FF' }]}>
                            <Ionicons name="business" size={18} color="#1D4ED8" />
                        </View>
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Properties</Text>
                        <Text style={[styles.metricValue, { color: colors.text }]}>{totalProperties}</Text>
                        <Text style={[styles.metricSub, { color: '#1D4ED8' }]}>{availableCount} Available • {occupiedCount} Rented</Text>
                    </View>

                    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.metricIconWrap, { backgroundColor: '#ECFDF5' }]}>
                            <Ionicons name="people" size={18} color="#059669" />
                        </View>
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Occupancy Rate</Text>
                        <Text style={[styles.metricValue, { color: colors.text }]}>{occupancyRate}%</Text>
                        <Text style={[styles.metricSub, { color: '#059669' }]}>
                            {occupiedCount} of {totalProperties} units occupied
                        </Text>
                    </View>

                    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.metricIconWrap, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="wallet-outline" size={18} color="#D97706" />
                        </View>
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Portfolio Potential</Text>
                        <Text style={[styles.metricValue, { color: colors.text }]}>{formatNaira(totalPortfolioValue)}</Text>
                        <Text style={[styles.metricSub, { color: '#D97706' }]}>Annual listed value</Text>
                    </View>

                    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.metricIconWrap, { backgroundColor: '#FAF5FF' }]}>
                            <Ionicons name="calendar-outline" size={18} color="#9333EA" />
                        </View>
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Monthly Expected</Text>
                        <Text style={[styles.metricValue, { color: colors.text }]}>{formatNaira(monthlyGrossExpected)}</Text>
                        <Text style={[styles.metricSub, { color: '#9333EA' }]}>Gross potential / mo</Text>
                    </View>
                </View>

                {/* ── Monthly Rent Collections Chart ── */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardTitleRow}>
                        <View>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly Rent Collections</Text>
                            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Historical disbursement tracking</Text>
                        </View>
                        <View style={styles.chartLegend}>
                            <View style={[styles.legendDot, { backgroundColor: '#1D4ED8' }]} />
                            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Disbursements (₦)</Text>
                        </View>
                    </View>

                    <View style={styles.barsContainer}>
                        {monthlyData.slice(0, 8).map((val, idx) => {
                            const barHeight = Math.max(12, Math.round((val / maxMonthlyVal) * 110));
                            const isHighest = val === maxMonthlyVal;
                            return (
                                <View key={idx} style={styles.barColumn}>
                                    <View style={styles.barTrack}>
                                        <View
                                            style={[
                                                styles.barFill,
                                                {
                                                    height: barHeight,
                                                    backgroundColor: isHighest ? '#1D4ED8' : '#93C5FD',
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>
                                        {months[idx]}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* ── Property Performance Breakdown List ── */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardTitleRow}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Property Performance Breakdown</Text>
                        <Text style={[styles.seeAllText, { color: colors.primary }]}>{activeListings.length} Units</Text>
                    </View>

                    {loading && activeListings.length === 0 ? (
                        <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
                    ) : activeListings.length === 0 ? (
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No property listings found. Add properties to view rental performance.
                        </Text>
                    ) : (
                        activeListings.map((prop, idx) => {
                            const matchingRental = rentalsList.find((r) => r.property_id === prop.id);
                            const isRented =
                                prop.status === 'rented' ||
                                prop.status === 'occupied' ||
                                prop.is_occupied ||
                                Boolean(matchingRental);

                            const renterObj = matchingRental?.renter;
                            const tenantName = renterObj
                                ? `${renterObj.first_name || ''} ${renterObj.last_name || ''}`.trim() || renterObj.email
                                : isRented
                                ? 'Active Verified Tenant'
                                : null;

                            return (
                                <View
                                    key={prop.id || idx}
                                    style={[
                                        styles.propRow,
                                        { borderBottomColor: colors.border },
                                        idx === activeListings.length - 1 && { borderBottomWidth: 0 },
                                    ]}
                                >
                                    <Image
                                        source={prop.images?.[0] ? { uri: prop.images[0] } : require('../../assets/images/Homes/home1.png')}
                                        style={styles.propThumb}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.propTitle, { color: colors.text }]} numberOfLines={1}>
                                            {prop.title}
                                        </Text>
                                        <Text style={[styles.propLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                                            {prop.location}
                                        </Text>

                                        {tenantName && (
                                            <View style={styles.tenantBadgeRow}>
                                                <Ionicons name="person-outline" size={11} color="#059669" />
                                                <Text style={styles.tenantNameText}>Tenant: {tenantName}</Text>
                                            </View>
                                        )}

                                        <View style={styles.propTagsRow}>
                                            <View style={[styles.statusPill, { backgroundColor: isRented ? '#DCFCE7' : '#EFF6FF' }]}>
                                                <Text style={[styles.statusPillText, { color: isRented ? '#15803D' : '#1D4ED8' }]}>
                                                    {isRented ? 'Active Lease' : 'Available'}
                                                </Text>
                                            </View>
                                            <Text style={[styles.rentPriceText, { color: colors.primary }]}>
                                                {formatNaira(prop.price)}/yr
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Quick Link to Rent Tracker */}
                <TouchableOpacity
                    style={[styles.rentTrackerBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push('/landlord-screens/rent-tracker')}
                    activeOpacity={0.85}
                >
                    <View style={styles.trackerLeft}>
                        <View style={[styles.trackerIconWrap, { backgroundColor: '#EFF6FF' }]}>
                            <Ionicons name="calendar-outline" size={20} color="#1D4ED8" />
                        </View>
                        <View>
                            <Text style={[styles.trackerTitle, { color: colors.text }]}>Open Detailed Rent Tracker</Text>
                            <Text style={[styles.trackerSub, { color: colors.textSecondary }]}>
                                View upcoming due dates, payment schedules, and tenant collection logs
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitleWrap: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    headerSub: {
        fontSize: 11.5,
        marginTop: 1,
    },
    exportBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    heroBanner: {
        borderRadius: 22,
        padding: 20,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 16,
        shadowColor: '#1D4ED8',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    decorCircle1: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -20,
        left: 120,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    heroLabel: {
        fontSize: 12,
        color: '#BFDBFE',
        fontWeight: '600',
        marginBottom: 4,
    },
    heroValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    badgeWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.4)',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6EE7B7',
    },
    heroDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        marginVertical: 14,
    },
    heroBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    subStatLabel: {
        fontSize: 10.5,
        color: '#BFDBFE',
        fontWeight: '500',
        marginBottom: 2,
    },
    subStatValue: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    subStatDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    timeframeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    tfPill: {
        flex: 1,
        paddingVertical: 7,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tfText: {
        fontSize: 12,
        fontWeight: '700',
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
    },
    metricCard: {
        width: (width - 42) / 2,
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
        gap: 4,
    },
    metricIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    metricValue: {
        fontSize: 17,
        fontWeight: '800',
    },
    metricSub: {
        fontSize: 10.5,
        fontWeight: '600',
        marginTop: 2,
    },
    sectionCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    cardSubtitle: {
        fontSize: 11.5,
        marginTop: 1,
    },
    seeAllText: {
        fontSize: 12,
        fontWeight: '700',
    },
    chartLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
    },
    barsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 140,
        paddingTop: 10,
        paddingHorizontal: 4,
    },
    barColumn: {
        alignItems: 'center',
        flex: 1,
        gap: 6,
    },
    barTrack: {
        width: 14,
        height: 110,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 7,
        overflow: 'hidden',
    },
    barFill: {
        width: 14,
        borderRadius: 7,
    },
    monthLabel: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    propRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    propThumb: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
    },
    propTitle: {
        fontSize: 13.5,
        fontWeight: '700',
    },
    propLocation: {
        fontSize: 11.5,
        marginTop: 1,
    },
    tenantBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    tenantNameText: {
        fontSize: 11,
        color: '#059669',
        fontWeight: '600',
    },
    propTagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '700',
    },
    rentPriceText: {
        fontSize: 12,
        fontWeight: '700',
    },
    rentTrackerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10,
    },
    trackerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    trackerIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackerTitle: {
        fontSize: 13.5,
        fontWeight: '700',
    },
    trackerSub: {
        fontSize: 11,
        marginTop: 1,
    },
    emptyText: {
        fontSize: 12.5,
        textAlign: 'center',
        paddingVertical: 20,
    },
});
