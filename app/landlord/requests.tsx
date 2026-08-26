import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Application, useLandlordApplications } from '../../hooks/useApplications';

const STATUS_CONFIG = {
    pending: { label: 'Pending Review', color: '#F59E0B', bg: '#FEF3C7', icon: 'time-outline' as const },
    accepted: { label: 'Approved', color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle-outline' as const },
    declined: { label: 'Declined', color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle-outline' as const },
};

// Profile photo lives on user_biodata (users table has no photo column);
// PostgREST returns user_biodata as [] when the user has no biodata row.
const getUserPhoto = (u: any): string | null => {
    if (!u) return null;
    const bio = Array.isArray(u.user_biodata) ? u.user_biodata[0] : u.user_biodata;
    return u.profile_photo || bio?.profile_photo || u.avatar_url || null;
};

export default function LandlordRentRequestsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const { applications, loading, refetch, respondToApplication } = useLandlordApplications();
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all');
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refetch();
      }
    }, [user])
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (activeFilter === 'all') return true;
      return app.status === activeFilter;
    });
  }, [applications, activeFilter]);

  const handleRespond = (application: Application, action: 'accept' | 'decline') => {
    const label = action === 'accept' ? 'Accept' : 'Decline';
    const renterName = `${application.renter?.first_name || 'Applicant'} ${application.renter?.last_name || ''}`.trim();

    Alert.alert(
      `${label} Rental Application`,
      `Are you sure you want to ${action} ${renterName}'s application for "${application.property?.title || 'this property'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: action === 'decline' ? 'destructive' : 'default',
          onPress: async () => {
            setRespondingId(application.id);
            await respondToApplication(application.id, action);
            setRespondingId(null);
          },
        },
      ]
    );
  };

  const renderApplicationCard = ({ item }: { item: Application }) => {
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const isResponding = respondingId === item.id;
    const propertyImage = item.property?.images?.[0];
    const renterFullName = `${item.renter?.first_name || 'Applicant'} ${item.renter?.last_name || ''}`.trim();

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: '/shared-screens/ApplicationDetailsScreen',
            params: {
              id: item.id,
              application_id: item.id,
              applicationData: JSON.stringify(item),
            },
          })
        }
      >
        <View style={styles.cardTopRow}>
          <Image
            source={propertyImage ? { uri: propertyImage } : require('../../assets/images/Homes/home1.png')}
            style={styles.propertyThumb}
          />
          <View style={styles.cardHeaderInfo}>
            <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>
              {item.property?.title || 'Property Application'}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.property?.location || 'Lagos, Nigeria'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.color + '40' }]}>
              <Ionicons name={statusCfg.icon} size={12} color={statusCfg.color} />
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>
        </View>

        {/* Tenant Details Snippet */}
        <View style={[styles.renterSnippet, { backgroundColor: isDark ? '#0c1844' : '#F8FAFC', borderColor: colors.border }]}>
          <View style={[styles.renterAvatarWrap, { overflow: 'hidden' }]}>
            {getUserPhoto(item.renter) ? (
              <Image
                source={{ uri: getUserPhoto(item.renter) as string }}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <Ionicons name="person" size={16} color={colors.primary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.renterName, { color: colors.text }]}>{renterFullName}</Text>
            <Text style={[styles.renterSub, { color: colors.textSecondary }]}>
              {item.renter?.email || 'Verified Eden Renter'}
            </Text>
          </View>
          {item.move_in_date && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>Move-in Date</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                {new Date(item.move_in_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          )}
        </View>

        {/* Action Controls */}
        {item.status === 'pending' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.declineBtn, { borderColor: '#EF4444' }]}
              onPress={() => handleRespond(item, 'decline')}
              disabled={isResponding}
            >
              <Text style={[styles.declineText, { color: '#EF4444' }]}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: '#10B981' }]}
              onPress={() => handleRespond(item, 'accept')}
              disabled={isResponding}
            >
              {isResponding ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.acceptText}>Accept Application</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

      </TouchableOpacity>
    );
  };

  const FilterTab = ({ label, count, filterKey }: { label: string; count: number; filterKey: typeof activeFilter }) => {
    const isSelected = activeFilter === filterKey;
    return (
      <TouchableOpacity
        style={[
          styles.tabPill,
          {
            backgroundColor: isSelected ? colors.primary : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
        onPress={() => setActiveFilter(filterKey)}
      >
        <Text style={[styles.tabText, { color: isSelected ? '#FFF' : colors.text }]}>
          {label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const acceptedCount = applications.filter((a) => a.status === 'accepted').length;
  const declinedCount = applications.filter((a) => a.status === 'declined').length;

  return (
    <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Rent Requests</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {applications.length} tenant applications across your properties
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <FilterTab label="All" count={applications.length} filterKey="all" />
        <FilterTab label="Pending" count={pendingCount} filterKey="pending" />
        <FilterTab label="Accepted" count={acceptedCount} filterKey="accepted" />
        <FilterTab label="Declined" count={declinedCount} filterKey="declined" />
      </View>

      {/* List */}
      {loading && applications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredApplications}
          keyExtractor={(item) => item.id}
          renderItem={renderApplicationCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={56} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Rent Requests Found</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {activeFilter === 'all'
                  ? 'Tenant applications submitted for your properties will appear here.'
                  : `No applications matching the "${activeFilter}" filter.`}
              </Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  filterSection: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexWrap: 'wrap',
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 4,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  propertyThumb: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  cardHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  propertyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  renterSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 10,
  },
  renterAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  renterName: {
    fontSize: 13,
    fontWeight: '700',
  },
  renterSub: {
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  declineBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontSize: 13,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 1.5,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  manageText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
});
