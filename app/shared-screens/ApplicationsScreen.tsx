import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert, FlatList, Image,
  RefreshControl,
  StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Application, useLandlordApplications, useMyApplications } from '../../hooks/useApplications';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#f59e0b' },
  accepted: { label: 'Accepted', color: '#10b981' },
  declined: { label: 'Declined', color: '#ef4444' },
};

const ApplicationsScreen = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user, role } = useAuth();

  // Determine which hook to use based on user role
  const ownerHook = useLandlordApplications();
  const renterHook = useMyApplications();

  const isRenter = role === 'TENANT';
  const { applications, loading, refetch } = isRenter ? renterHook : ownerHook;
  const { respondToApplication, responding } = ownerHook;
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Refetch when screen is focused
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

  const handleRespond = (application: Application, action: 'accept' | 'decline') => {
    const label = action === 'accept' ? 'Accept' : 'Decline';
    const renterName = `${application.renter?.first_name} ${application.renter?.last_name}`;

    Alert.alert(
      `${label} Application`,
      `Are you sure you want to ${action} ${renterName}'s application for ${application.property?.title}?`,
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

  const renderApplication = ({ item }: { item: Application }) => {
    const statusCfg = STATUS_CONFIG[item.status];
    const isResponding = respondingId === item.id;
    const propertyImage = item.property?.images?.[0];

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push({
          pathname: '/shared-screens/ApplicationDetailsScreen',
          params: {
            application_id: item.id,
            id: item.id,
            applicationData: JSON.stringify(item),
          }
        })}
        style={[styles.card, { backgroundColor: colors.card }]}
      >
        {/* Property info */}
        <View style={styles.cardHeader}>
          {propertyImage ? (
            <Image source={{ uri: propertyImage }} style={styles.propertyImage} />
          ) : (
            <View style={[styles.propertyImagePlaceholder, { backgroundColor: colors.border }]}>
              <Ionicons name="home-outline" size={20} color={colors.textSecondary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>
              {item.property?.title ?? 'Property'}
            </Text>
            <Text style={[styles.propertyLocation, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.property?.location}
            </Text>
            <Text style={[styles.propertyPrice, { color: colors.primary }]}>
              ₦{Number(item.property?.price ?? 0).toLocaleString()}/year
            </Text>
          </View>
          <View style={styles.cardRight}>
            {/* Status badge (outlined pill) */}
            <View style={[styles.statusBadge, { backgroundColor: colors.card, borderColor: statusCfg.color }]}>
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#475569' : '#CBD5E1'} />
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: isDark ? colors.border : '#E2E8F0' }]} />

        {/* Renter/Landlord info */}
        <View style={styles.renterRow}>
          {(() => {
            let photoUrl = isRenter
              ? ((item.property as any)?.owner?.profile_photo || (item.property as any)?.owner?.avatar_url)
              : (item.renter?.profile_photo || item.renter?.avatar_url);
            if (!photoUrl && !isRenter && item.message) {
              try {
                const parsed = JSON.parse(item.message);
                if (parsed?.__eden_v === 1 && parsed?.verification) {
                  photoUrl = parsed.verification.selfie_url || parsed.verification.full_photo_url;
                }
              } catch {}
            }
            return (
              <View style={[styles.renterAvatar, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} />
                ) : null}
              </View>
            );
          })()}
          <View style={{ flex: 1 }}>
            <Text style={[styles.renterName, { color: colors.text }]}>
              {isRenter ? 'View Details to see Landlord' : `${item.renter?.first_name} ${item.renter?.last_name}`}
            </Text>
            <Text style={[styles.renterEmail, { color: colors.textSecondary }]}>
              {isRenter ? item.property?.location : item.renter?.email}
            </Text>
          </View>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {new Date(item.move_in_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        {/* Action CTA */}
        <View style={styles.ctaButton}>
          <Text style={styles.ctaButtonText} numberOfLines={1}>Tap to view Details and take action</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Applications</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>
            {applications.filter(a => a.status === 'pending').length}
          </Text>
        </View>
      </View>

      <FlatList
        data={applications}
        keyExtractor={item => item.id}
        renderItem={renderApplication}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Applications Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Applications from interested renters will appear here.
              </Text>
            </View>
          ) : null
        }
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  countBadge: { width: 40, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 14, fontWeight: '700' },
  listContent: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cardRight: { alignItems: 'flex-end', gap: 12 },
  propertyImage: { width: 56, height: 56, borderRadius: 12 },
  propertyImagePlaceholder: {
    width: 56, height: 56, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  propertyTitle: { fontSize: 15, fontWeight: '700' },
  propertyLocation: { fontSize: 12, marginTop: 2 },
  propertyPrice: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, marginHorizontal: 14 },
  renterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  renterAvatar: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  renterName: { fontSize: 15, fontWeight: '700' },
  renterEmail: { fontSize: 12, marginTop: 2 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: 14, marginTop: 0, height: 48, borderRadius: 14,
    backgroundColor: '#F2A65E', paddingHorizontal: 16,
  },
  ctaButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', flex: 1 },
  messageBox: {
    marginHorizontal: 14, marginBottom: 14, padding: 12,
    borderRadius: 10, borderWidth: 1,
  },
  messageText: { fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, padding: 14, paddingTop: 0 },
  declineBtn: {
    flex: 1, height: 44, borderRadius: 10, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  declineBtnText: { fontSize: 14, fontWeight: '600' },
  acceptBtn: { flex: 2, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', maxWidth: 260 },
  signedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10,
  },
});

export default ApplicationsScreen;
