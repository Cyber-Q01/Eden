import BackButton from '@/components/BackButton';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useTheme } from '@/context/ThemeContext';
import { useLandlordRentals } from '@/hooks/useLandlordRentals';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const FILTERS = ['All', 'Paid', 'Due Soon', 'Overdue'];

const RentTrackerScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, isLoading, refetch } = useLandlordRentals();
  const [activeFilter, setActiveFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredRentals = data?.rentals.filter(r => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Paid') return r.status === 'confirmed';
    if (activeFilter === 'Due Soon') return r.status === 'confirmed'; // Add logic later
    if (activeFilter === 'Overdue') return false; // Add logic later
    return true;
  }) || [];

  const formatNaira = (amount: number | string | undefined | null): string => {
    if (!amount && amount !== 0) return '₦0.00';
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : Number(amount);
    if (isNaN(num)) return '₦0.00';
    return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateDueDate = (createdAt: string) => {
    if (!createdAt) return 'N/A';
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) return 'N/A';
    date.setFullYear(date.getFullYear() + 1);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const calculateProgress = (createdAt: string) => {
    if (!createdAt) return 0;
    const startDate = new Date(createdAt);
    if (isNaN(startDate.getTime())) return 0;

    const endDate = new Date(startDate);
    endDate.setFullYear(startDate.getFullYear() + 1);

    const now = new Date();
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();

    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    return Math.round(progress);
  };

  const SummaryCard = () => (
    <LinearGradient
      colors={['#1D4ED8', '#1E3A8A']}
      style={styles.summaryCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={styles.summaryContent}>
        <View>
          <Text style={styles.summaryLabel}>Total Generated</Text>
          <Text style={styles.summaryValue}>{formatNaira(data?.totalCollected || 0)}</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.summaryLabel}>Active Tenants</Text>
          <Text style={styles.summaryTenantValue}>{data?.activeTenantsCount || 0}</Text>
        </View>
      </View>

      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Paid to Account</Text>
          <Text style={styles.breakdownValue}>{formatNaira(data?.amountPaid || 0)}</Text>
        </View>
        <View style={styles.breakdownDivider} />
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Pending (In Eden)</Text>
          <Text style={styles.breakdownValue}>{formatNaira(data?.amountPending || 0)}</Text>
        </View>
      </View>

      {/* Decorative Circle */}
      <View style={styles.decorCircle} />
    </LinearGradient>
  );

  const RentCard = ({ item }: { item: any }) => {
    const progress = calculateProgress(item.created_at);

    return (
      <View style={[styles.rentCard, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.tenantInfo}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tenantName, { color: colors.text }]} numberOfLines={1}>
                {item.renter?.first_name || 'Unknown'} {item.renter?.last_name || 'Tenant'}
              </Text>
              <Text style={[styles.propertyInfo, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.property?.title || 'Property'}, {item.property?.location?.split(',')?.[0] || 'Unknown'}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'confirmed' ? '#d1fae5' : '#fee2e2' }]}>
            <Text style={[styles.statusText, { color: item.status === 'confirmed' ? '#059669' : '#b91c1c' }]}>
              {item.status === 'confirmed' ? 'Paid' : 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Rent amount</Text>
            <Text style={[styles.detailValue, { color: colors.primary }]}>{formatNaira(item.amount)}/yr</Text>
          </View>
          <View style={styles.dueInfo}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.dueText, { color: colors.textSecondary }]}>Next: {calculateDueDate(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Lease Progress</Text>
          <Text style={[styles.progressValue, { color: colors.text }]}>{progress}%</Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
          <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>
    );
  };

  const PaymentRow = ({ item }: { item: any }) => (
    <View style={[styles.paymentRow, { backgroundColor: colors.card }]}>
      <View style={styles.paymentIcon}>
        <Ionicons name="checkmark" size={16} color="#059669" />
      </View>
      <View style={styles.paymentInfo}>
        <Text style={[styles.paymentTitle, { color: colors.text }]}>{item.user?.first_name || 'User'} {item.user?.last_name || ''}- {formatNaira(item.amount)}</Text>
        <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
          Paid: {new Date(item.paid_at || item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Text style={[styles.paymentAmount, { color: colors.primary }]}>{formatNaira(item.amount)}</Text>
    </View>
  );

  if (isLoading && !data) {
    return (
      <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
        <View style={styles.header}>
          <BackButton />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Rent Tracker</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Rent Tracker</Text>
        <TouchableOpacity style={styles.filterIconButton}>
          <Ionicons name="funnel-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={filteredRentals}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            <SummaryCard />

            <View style={styles.filtersContainer}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    activeFilter === f && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setActiveFilter(f)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: colors.textSecondary },
                    activeFilter === f && { color: '#FFF' }
                  ]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        renderItem={({ item }) => <RentCard item={item} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No rentals found</Text>
          </View>
        )}
        ListFooterComponent={() => (
          data?.paymentHistory && data.paymentHistory.length > 0 ? (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: colors.text }]}>Payment History</Text>
                <TouchableOpacity>
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
                </TouchableOpacity>
              </View>
              {data.paymentHistory.slice(0, 5).map(item => (
                <PaymentRow key={item.id} item={item} />
              ))}
            </View>
          ) : null
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  filterIconButton: {
    padding: 8,
  },
  listContent: {
    paddingBottom: 40,
  },
  listHeader: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  summaryCard: {
    minHeight: 120,
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    position: 'relative',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#1A3CC8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  summaryLabel: {
    color: '#DBEAFE',
    fontSize: 12,
    marginBottom: 5,
  },
  summaryValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
  },
  summarySub: {
    color: '#DBEAFE',
    fontSize: 12,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryTenantValue: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  breakdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
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
  decorCircle: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  filtersContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  rentCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tenantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1D4ED8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  propertyInfo: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  dueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 10,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  dueText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  historySection: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 14,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  paymentDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#94A3B8',
  },
});

export default RentTrackerScreen;
