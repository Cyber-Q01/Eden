import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLandlord } from '../../hooks/useLandlord';
import { useNotifications } from '../../hooks/useNotifications';
import { useProfile } from '../../hooks/useProfile';

const { width } = Dimensions.get('window');

const formatNaira = (amount: number | string | undefined | null): string => {
    if (!amount && amount !== 0) return '₦0.00';
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : Number(amount);
    if (isNaN(num)) return '₦0.00';
    return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const LandlordDashboard = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { role } = useAuth();
    const { stats, activeListings, applications, loading, error, refetch } = useLandlord();
    const { profile } = useProfile();
    const { unreadCount } = useNotifications();

    const totalGenerated = stats?.totalCollected ?? 0;
    const paidToAccount = stats?.amountPaid ?? 0;
    const pendingInEden = stats?.amountPending ?? 0;

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => router.push('/landlord/profile')}>
                    <Image
                        source={profile?.profile_photo ? { uri: profile.profile_photo } : require('../../assets/icon/profiles/profile1.png')}
                        style={[styles.profileImage, { borderColor: colors.card }]}
                    />
                </TouchableOpacity>
                <View style={styles.greetingContainer}>
                    <Text style={[styles.greetingText, { color: colors.text }]}>Good morning, {profile?.first_name || (role === 'AGENT' ? 'Agent' : 'Landlord')}</Text>
                    <Text style={[styles.subGreetingText, { color: colors.textSecondary }]}>Manage {role === 'AGENT' ? 'assigned properties' : 'your properties'}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={[styles.notificationBtn, { borderColor: colors.border }]}
                onPress={() => router.push('/shared-screens/NotificationsScreen')}
            >
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
                {unreadCount > 0 && <View style={[styles.notificationBadge, { borderColor: colors.background }]} />}
            </TouchableOpacity>
        </View>
    );

    const renderEarningsCard = () => {
        const isAgent = role === 'AGENT';
        return (
            <LinearGradient
                colors={['#1D4ED8', '#1E3A8A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.earningsCard}
            >
                <View style={styles.decorCircle1} />
                <View style={styles.decorCircle2} />
                <View style={styles.earningsInfo}>
                    <Text style={styles.earningsLabel}>
                        {isAgent ? 'Total Commissions' : 'Total Generated'}
                    </Text>
                    <Text style={styles.earningsAmount}>
                        {isAgent ? (stats.earnings || '₦0.00') : formatNaira(totalGenerated)}
                    </Text>
                    <Text style={styles.earningsSubtext}>
                        {isAgent 
                            ? `This month • ${stats.activeCount} ${stats.activeCount === 1 ? 'property' : 'properties'}`
                            : `This year • ${stats.activeCount} ${stats.activeCount === 1 ? 'property' : 'properties'}`
                        }
                    </Text>
                </View>
                
                {isAgent ? (
                    <View style={styles.trendContainer}>
                        <Text style={styles.trendText}>
                            +18% vs last month
                        </Text>
                    </View>
                ) : (
                    <View style={styles.breakdownContainer}>
                        <View style={styles.breakdownItem}>
                            <Text style={styles.breakdownLabel}>Paid to Account</Text>
                            <Text style={styles.breakdownValue}>
                                {formatNaira(paidToAccount)}
                            </Text>
                        </View>
                        <View style={styles.breakdownDivider} />
                        <View style={styles.breakdownItem}>
                            <Text style={styles.breakdownLabel}>Pending (In Eden)</Text>
                            <Text style={styles.breakdownValue}>
                                {formatNaira(pendingInEden)}
                            </Text>
                        </View>
                    </View>
                )}
            </LinearGradient>
        );
    };

    const renderStatsRow = () => {
        if (role === 'AGENT') {
            return (
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="home-outline" size={20} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats.activeCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Properties</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="people-outline" size={20} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats.tenantCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tenants</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats.bookingCount || 0}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bookings</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats.pendingRequests}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Applications</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="home-outline" size={20} color={colors.primary} />
                    <Text style={[styles.statValue, { color: colors.text }]}>{stats.activeCount}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Properties</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="people-outline" size={20} color={colors.primary} />
                    <Text style={[styles.statValue, { color: colors.text }]}>{stats.tenantCount}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tenants</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                    <Text style={[styles.statValue, { color: colors.text }]}>{stats.pendingRequests}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Requests</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="star" size={18} color="#F59E0B" />
                    <Text style={[styles.statValue, { color: colors.text }]}>
                        {stats.rating ? Number(stats.rating).toFixed(1) : '0.0'}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rating</Text>
                </View>
            </View>
        );
    };

    const renderEarningsChart = () => {
        if (role === 'AGENT') return null;
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Get last 6 months with their real index
        const last6Months: { label: string; amount: number; monthIndex: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const m = (currentMonth - i + 12) % 12;
            last6Months.push({
                label: monthNames[m],
                monthIndex: m,
                amount: stats.monthlyEarnings?.[m] || 0
            });
        }

        const maxAmount = Math.max(...last6Months.map(m => m.amount), 1);
        const totalEarnings = stats.last6MonthsTotal ?? last6Months.reduce((sum, m) => sum + m.amount, 0);
        const BAR_MAX_HEIGHT = 100;

        const formatAmount = (val: number) => {
            if (val >= 1_000_000) return `₦${(val / 1_000_000).toFixed(1)}M`;
            if (val >= 1_000) return `₦${(val / 1_000).toFixed(0)}K`;
            return `₦${val}`;
        };

        return (
            <View style={[styles.chartSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.chartHeader}>
                    <View>
                        <Text style={[styles.chartTitle, { color: colors.text }]}>Monthly Earnings</Text>
                        <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Last 6 months</Text>
                    </View>
                    <View style={[styles.chartYearBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.chartYear, { color: colors.primary }]}>{currentYear}</Text>
                    </View>
                </View>

                {/* Chart bars area */}
                <View style={styles.chartBarsWrapper}>
                    {last6Months.map((item, index) => {
                        const isCurrentMonth = item.monthIndex === currentMonth;
                        const barHeight = item.amount > 0
                            ? Math.max((item.amount / maxAmount) * BAR_MAX_HEIGHT, 10)
                            : 6;
                        const hasEarning = item.amount > 0;

                        return (
                            <View key={index} style={styles.chartBarColumn}>
                                {/* Amount label above bar */}
                                <Text
                                    style={[
                                        styles.chartBarAmount,
                                        { color: isCurrentMonth ? colors.primary : colors.textSecondary }
                                    ]}
                                    numberOfLines={1}
                                >
                                    {hasEarning ? formatAmount(item.amount) : ''}
                                </Text>

                                {/* The bar itself */}
                                <View
                                    style={[
                                        styles.chartBar,
                                        {
                                            height: barHeight,
                                            backgroundColor: isCurrentMonth
                                                ? colors.primary
                                                : hasEarning
                                                    ? colors.primary + '55'
                                                    : colors.primary + '20',
                                            borderRadius: 6,
                                        }
                                    ]}
                                />

                                {/* Month label */}
                                <Text
                                    style={[
                                        styles.chartBarLabel,
                                        {
                                            color: isCurrentMonth ? colors.primary : colors.textSecondary,
                                            fontWeight: isCurrentMonth ? '700' : '400',
                                        }
                                    ]}
                                >
                                    {item.label}
                                </Text>

                                {/* Current month dot indicator */}
                                {isCurrentMonth && (
                                    <View style={[styles.chartCurrentDot, { backgroundColor: colors.primary }]} />
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Summary row */}
                <View style={[styles.chartSummaryRow, { borderTopColor: colors.border }]}>
                    <View style={styles.chartSummaryItem}>
                        <Text style={[styles.chartSummaryLabel, { color: colors.textSecondary }]}>6-Month Total</Text>
                        <Text style={[styles.chartSummaryValue, { color: colors.text }]}>
                            {formatNaira(stats.last6MonthsTotal ?? totalEarnings)}
                        </Text>
                    </View>
                    <View style={[styles.chartSummaryDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.chartSummaryItem}>
                        <Text style={[styles.chartSummaryLabel, { color: colors.textSecondary }]}>This Month</Text>
                        <Text style={[styles.chartSummaryValue, { color: colors.primary }]}>
                            {formatNaira(stats.thisMonthEarnings ?? stats.monthlyEarnings?.[currentMonth] ?? 0)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderListings = () => (
        <View style={styles.listingsSection}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{role === 'AGENT' ? 'Assigned Properties' : 'My Listings'}</Text>
                <View style={styles.sectionActions}>
                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.primary + '10' }]}
                        onPress={() => router.push('/landlord-screens/add-property')}
                    >
                        <Text style={[styles.addBtnText, { color: colors.primary }]}>+ Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/landlord/listings')}>
                        <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
                    </TouchableOpacity>
                </View>
            </View>
            {loading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                    {activeListings.length === 0 ? (
                        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={{ color: colors.textSecondary }}>No listings yet.</Text>
                        </View>
                    ) : (
                        activeListings.map(item => {
                            const commVal = item.price ? `Comm: ₦${(item.price * 0.015).toLocaleString()}` : undefined;
                            return (
                                <PropertyCard
                                    key={item.id}
                                    image={item.images}
                                    title={item.title}
                                    price={`₦${item.price?.toLocaleString()}/yr`}
                                    location={item.address || 'Lagos, Nigeria'}
                                    isLandlord={true}
                                    status={item.status === 'taken' ? 'Taken' : 'Available'}
                                    views={item.view_count || 0}
                                    commission={role === 'AGENT' ? commVal : undefined}
                                    onPress={() => router.push(`/property/${item.id}`)}
                                    containerStyle={{ marginRight: 16 }}
                                />
                            );
                        })
                    )}
                </ScrollView>
            )}
        </View>
    );

    const renderRequests = () => (
        <View style={styles.requestsSection}>
            <View style={styles.sectionHeader}>
                <View style={styles.requestTitleRow}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Tenant Requests</Text>
                    {applications.length > 0 && (
                        <View style={styles.requestBadge}>
                            <Text style={styles.requestBadgeText}>{applications.length}</Text>
                        </View>
                    )}
                </View>
            </View>
            {applications.length === 0 ? (
                <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
                    <Text style={{ color: colors.textSecondary }}>No pending requests.</Text>
                </View>
            ) : (
                applications.slice(0, 3).map((app) => (
                    <View key={app.id} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 12 }]}>
                        <View style={styles.requestHeader}>
                            <Image
                                source={app.renter?.user_biodata?.profile_photo ? { uri: app.renter.user_biodata.profile_photo } : require('../../assets/icon/profiles/profile1.png')}
                                style={styles.requestAvatar}
                            />
                            <View style={styles.requestInfo}>
                                <Text style={[styles.requestName, { color: colors.text }]}>{app.renter?.first_name} {app.renter?.last_name}</Text>
                                <Text style={[styles.requestSubtext, { color: colors.textSecondary }]}>Applied for {app.property?.title}</Text>
                                <Text style={[styles.requestTime, { color: colors.textSecondary + '80' }]}>{new Date(app.created_at).toLocaleDateString()}</Text>
                            </View>
                        </View>
                        <View style={styles.requestActions}>
                            <TouchableOpacity
                                style={[styles.reviewBtn, { backgroundColor: colors.primary }]}
                                onPress={() => router.push({
                                    pathname: '/shared-screens/ApplicationDetailsScreen',
                                    params: { application_id: app.id }
                                })}
                            >
                                <Text style={styles.reviewBtnText}>Review</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.declineBtn, { backgroundColor: '#EF444415' }]}>
                                <Text style={[styles.declineBtnText, { color: '#EF4444' }]}>Decline</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    return (
        <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {renderHeader()}
                {renderEarningsCard()}
                {renderStatsRow()}
                {renderEarningsChart()}
                {renderListings()}
                {renderRequests()}
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
        paddingTop: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    profileImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
    },
    greetingContainer: {
        justifyContent: 'center',
    },
    greetingText: {
        fontSize: 18,
        fontWeight: '700',
    },
    subGreetingText: {
        fontSize: 12,
        marginTop: -2,
    },
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 1.5,
    },
    earningsCard: {
        borderRadius: 24,
        padding: 24,
        minHeight: 160,
        overflow: 'hidden',
        marginBottom: 24,
        elevation: 10,
        shadowColor: '#1D4ED8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    breakdownContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    breakdownItem: {
        flex: 1,
    },
    breakdownLabel: {
        color: '#DBEAFE',
        fontSize: 10,
        marginBottom: 2,
    },
    breakdownValue: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    breakdownDivider: {
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 16,
    },
    decorCircle1: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -20,
        right: 60,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    earningsInfo: {
        flex: 1,
    },
    earningsLabel: {
        color: '#DBEAFE',
        fontSize: 12,
        marginBottom: 4,
    },
    earningsAmount: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 4,
    },
    earningsSubtext: {
        color: '#DBEAFE',
        fontSize: 12,
    },
    trendContainer: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.4)',
        marginTop: 12,
    },
    trendText: {
        color: '#10B981',
        fontSize: 11,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statCard: {
        width: (width - 70) / 4,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 10,
    },
    chartSection: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        marginBottom: 24,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    chartYear: {
        fontSize: 12,
        fontWeight: '600',
    },
    chartSubtitle: {
        fontSize: 11,
        marginTop: 2,
    },
    chartYearBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    chartBarsWrapper: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 148,
        marginTop: 8,
        marginBottom: 16,
    },
    chartBarColumn: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        flex: 1,
    },
    chartBarAmount: {
        fontSize: 9,
        fontWeight: '600',
        marginBottom: 2,
        textAlign: 'center',
    },
    chartBar: {
        width: 28,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
    },
    chartBarLabel: {
        fontSize: 10,
        marginTop: 2,
    },
    chartCurrentDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 1,
    },
    chartSummaryRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 14,
        marginTop: 4,
    },
    chartSummaryItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    chartSummaryDivider: {
        width: 1,
        marginHorizontal: 8,
    },
    chartSummaryLabel: {
        fontSize: 11,
    },
    chartSummaryValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    listingsSection: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    sectionActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    addBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    seeAllText: {
        fontSize: 12,
        fontWeight: '600',
    },
    horizontalScroll: {
        paddingRight: 20,
        gap: 16,
    },
    listingCard: {
        width: 200,
        borderRadius: 20,
        paddingBottom: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    listingImage: {
        width: '100%',
        height: 120,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    listingBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: '#059669',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 99,
    },
    listingBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '600',
    },
    editListingBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(255,255,255,0.8)',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listingInfo: {
        padding: 12,
        gap: 2,
    },
    listingTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    listingPrice: {
        fontSize: 14,
        fontWeight: '800',
    },
    listingViews: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    viewsText: {
        fontSize: 10,
    },
    emptyCard: {
        width: width - 40,
        height: 100,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    requestsSection: {
        marginBottom: 40,
    },
    requestTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    requestBadge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    requestBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    requestCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
    },
    requestHeader: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    requestAvatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    requestInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    requestName: {
        fontSize: 15,
        fontWeight: '700',
    },
    requestSubtext: {
        fontSize: 12,
    },
    requestTime: {
        fontSize: 11,
        marginTop: 2,
    },
    requestActions: {
        flexDirection: 'row',
        gap: 12,
    },
    reviewBtn: {
        flex: 1,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reviewBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    declineBtn: {
        flex: 1,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    declineBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
});

export default LandlordDashboard;
