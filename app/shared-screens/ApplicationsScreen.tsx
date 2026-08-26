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
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7', icon: 'time-outline' },
  accepted: { label: 'Accepted', color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle-outline' },
  declined: { label: 'Declined', color: '#ef4444', bg: '#fee2e2', icon: 'close-circle-outline' },
};

const ApplicationsScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
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
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
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
              ₦{Number(item.property?.price ?? 0).toLocaleString()}/yr
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            {/* Status badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Ionicons name={statusCfg.icon as any} size={12} color={statusCfg.color} />
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.border} />
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

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
              <View style={[styles.renterAvatar, { backgroundColor: colors.primary + '20', overflow: 'hidden' }]}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={[styles.renterInitial, { color: colors.primary }]}>
                    {isRenter
                      ? (item.property as any)?.owner?.first_name?.[0]?.toUpperCase()
                      : item.renter?.first_name?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                )}
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

        {/* Status Message */}
        <View style={[styles.acceptedNote, { backgroundColor: colors.background, marginTop: 0 }]}>
          <Text style={[styles.acceptedNoteText, { color: colors.textSecondary, fontSize: 12 }]}>
            Tap to view details and take actions
          </Text>
          <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Applications</Text>
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
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  countBadge: { width: 40, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 14, fontWeight: '700' },
  listContent: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  propertyImage: { width: 56, height: 56, borderRadius: 10 },
  propertyImagePlaceholder: {
    width: 56, height: 56, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  propertyTitle: { fontSize: 14, fontWeight: '700' },
  propertyLocation: { fontSize: 12, marginTop: 2 },
  propertyPrice: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  renterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  renterAvatar: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  renterInitial: { fontSize: 16, fontWeight: '700' },
  renterName: { fontSize: 14, fontWeight: '600' },
  renterEmail: { fontSize: 12 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11 },
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
  acceptedNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, margin: 14, marginTop: 0, borderRadius: 10,
  },
  acceptedNoteText: { fontSize: 13, fontWeight: '500', flex: 1 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', maxWidth: 260 },
  signedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10,
  },
});

export default ApplicationsScreen;
