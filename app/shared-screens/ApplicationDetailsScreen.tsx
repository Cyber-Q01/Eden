import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useApplicationDetails, useLandlordApplications } from '../../hooks/useApplications';
import { supabase } from '../../lib/supabase';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7', icon: 'time-outline' },
  accepted: { label: 'Accepted', color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle-outline' },
  declined: { label: 'Declined', color: '#ef4444', bg: '#fee2e2', icon: 'close-circle-outline' },
};

const ApplicationDetailsScreen = () => {
  const { application_id } = useLocalSearchParams<{ application_id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { user, role } = useAuth();
  const { showError, showSuccess } = useToast();

  const { application, loading, refetch } = useApplicationDetails(application_id);
  const { respondToApplication, responding } = useLandlordApplications();

  const [agreementInfo, setAgreementInfo] = useState<{
    rental_id: string;
    rental_status: string;
    status: string;
    fully_signed: boolean;
  } | null>(null);
  const [fetchingAgreement, setFetchingAgreement] = useState(false);

  const fetchAgreementStatus = useCallback(async () => {
    if (!application || application.status !== 'accepted') return;

    setFetchingAgreement(true);
    try {
      // Get rental
      const { data: rental } = await supabase
        .from('rentals')
        .select('id, status')
        .eq('application_id', application.id)
        .single();

      if (rental) {
        // Get agreement
        const { data: agreement } = await supabase
          .from('tenancy_agreements')
          .select('status, owner_signed_at, renter_signed_at')
          .eq('rental_id', rental.id)
          .single();

        setAgreementInfo({
          rental_id: rental.id,
          rental_status: rental.status,
          status: agreement?.status ?? 'none',
          fully_signed: agreement?.status === 'fully_signed' || (!!agreement?.owner_signed_at && !!agreement?.renter_signed_at)
        });
      }
    } catch (error) {
      console.log('Agreement status error:', error);
    } finally {
      setFetchingAgreement(false);
    }
  }, [application]);

  useEffect(() => {
    fetchAgreementStatus();
  }, [application, fetchAgreementStatus]);

  const handleLandlordRespond = async (action: 'accept' | 'decline') => {
    if (!application) return;

    const label = action === 'accept' ? 'Accept' : 'Decline';
    Alert.alert(
      `${label} Application`,
      `Are you sure you want to ${action} this application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: action === 'decline' ? 'destructive' : 'default',
          onPress: async () => {
            const result = await respondToApplication(application.id, action);
            if (!result.error) {
              refetch();
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenWrapper style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenWrapper>
    );
  }

  if (!application) {
    return (
      <ScreenWrapper style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.text }]}>Application not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backLink, { marginTop: 16 }]}
        >
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </ScreenWrapper>
    );
  }

  const isRenter = role === 'TENANT';
  const statusCfg = STATUS_CONFIG[application.status];
  const propertyImage = application.property?.images?.[0];
  const otherParty = isRenter ? application.owner : application.renter;

  return (
    <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Application Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Status Section */}
        <View style={[styles.statusSection, { backgroundColor: statusCfg.bg + '40', borderColor: statusCfg.color + '30' }]}>
          <View style={[styles.statusIconContainer, { backgroundColor: statusCfg.color }]}>
            <Ionicons name={statusCfg.icon as any} size={24} color="#fff" />
          </View>
          <View>
            <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
            <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
              {application.status === 'pending'
                ? (isRenter ? 'Waiting for landlord review' : 'Review this application')
                : application.status === 'accepted'
                  ? 'Application approved'
                  : 'Application declined'}
            </Text>
          </View>
        </View>

        {/* Property Preview */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Property</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.propertyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {propertyImage ? (
            <Image source={{ uri: propertyImage }} style={styles.propertyImage} />
          ) : (
            <View style={[styles.propertyImagePlaceholder, { backgroundColor: colors.border }]}>
              <Ionicons name="home-outline" size={24} color={colors.textSecondary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>
              {application.property?.title}
            </Text>
            <Text style={[styles.propertyLocation, { color: colors.textSecondary }]} numberOfLines={1}>
              {application.property?.location}
            </Text>
            <Text style={[styles.propertyPrice, { color: colors.primary }]}>
              ₦{Number(application.property?.price ?? 0).toLocaleString()}/yr
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Contact Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isRenter ? 'Landlord Details' : 'Applicant Details'}
        </Text>
        <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            {otherParty?.profile_photo ? (
              <Image source={{ uri: otherParty.profile_photo }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                {otherParty?.first_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactName, { color: colors.text }]}>
              {otherParty?.first_name} {otherParty?.last_name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.contactEmail, { color: colors.textSecondary }]}>
                {otherParty?.email}
              </Text>
              {otherParty?.phone_number && (
                <>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textSecondary }} />
                  <Text style={[styles.contactEmail, { color: colors.textSecondary }]}>
                    {otherParty.phone_number}
                  </Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity style={[styles.chatBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Application Details */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Application Info</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <View>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Move-in Date</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(application.move_in_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.messageContainer}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Message</Text>
            <Text style={[styles.messageText, { color: colors.text }]}>
              {application.message}
            </Text>
          </View>
        </View>

        {/* Agreement Status if Accepted */}
        {application.status === 'accepted' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Agreement Status</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.agreementStatusRow}>
                <Ionicons
                  name={agreementInfo?.fully_signed ? "checkmark-circle" : "time-outline"}
                  size={20}
                  color={agreementInfo?.fully_signed ? "#10b981" : "#f59e0b"}
                />
                <Text style={[styles.agreementStatusText, { color: colors.text }]}>
                  {fetchingAgreement ? 'Checking status...' :
                    !agreementInfo ? 'Agreement not yet generated' :
                      agreementInfo.fully_signed ? 'Agreement fully signed' : 'Agreement partially signed'}
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {!isRenter && application.status === 'pending' && (
          <View style={styles.landlordActions}>
            <TouchableOpacity
              style={[styles.declineBtn, { borderColor: colors.border }]}
              onPress={() => handleLandlordRespond('decline')}
              disabled={responding}
            >
              <Text style={[styles.declineText, { color: colors.text }]}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleLandlordRespond('accept')}
              disabled={responding}
            >
              {responding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.acceptText}>Accept Application</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {application.status === 'accepted' && (
          <View style={styles.acceptedActions}>
            <TouchableOpacity
              style={[styles.fullWidthBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
              onPress={() => router.push({
                pathname: '/shared-screens/AgreementScreen',
                params: { application_id: application.id }
              })}
            >
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              <Text style={[styles.fullWidthBtnText, { color: colors.primary }]}>View Tenancy Agreement</Text>
            </TouchableOpacity>

            {isRenter && agreementInfo?.fully_signed && (
              <TouchableOpacity
                style={[
                  styles.fullWidthBtn,
                  {
                    backgroundColor: agreementInfo.rental_status === 'awaiting_payment' ? colors.primary : colors.border,
                    marginTop: 12
                  }
                ]}
                disabled={agreementInfo.rental_status !== 'awaiting_payment'}
                onPress={() => router.push({
                  pathname: '/shared-screens/RentPaymentScreen',
                  params: { rental_id: agreementInfo.rental_id }
                })}
              >
                <Text style={[styles.fullWidthBtnText, { color: agreementInfo.rental_status === 'awaiting_payment' ? '#fff' : colors.textSecondary }]}>
                  {agreementInfo.rental_status === 'awaiting_payment' ? 'Proceed to Payment' : 'You have paid for this property'}
                </Text>
                {agreementInfo.rental_status === 'awaiting_payment' && (
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scrollContent: { padding: 20 },
  statusSection: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24,
  },
  statusIconContainer: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  statusLabel: { fontSize: 18, fontWeight: '800' },
  statusDesc: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  propertyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 14, borderWidth: 1, marginBottom: 24,
  },
  propertyImage: { width: 64, height: 64, borderRadius: 10 },
  propertyImagePlaceholder: {
    width: 64, height: 64, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  propertyTitle: { fontSize: 15, fontWeight: '700' },
  propertyLocation: { fontSize: 13, marginTop: 2 },
  propertyPrice: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  contactCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 14, borderWidth: 1, marginBottom: 24,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 18, fontWeight: '700' },
  contactName: { fontSize: 15, fontWeight: '600' },
  contactEmail: { fontSize: 13 },
  chatBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, fontWeight: '500', marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  messageContainer: {},
  messageText: { fontSize: 14, lineHeight: 22 },
  agreementStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agreementStatusText: { fontSize: 14, fontWeight: '500' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 36, borderTopWidth: StyleSheet.hairlineWidth,
  },
  landlordActions: { flexDirection: 'row', gap: 12 },
  declineBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  declineText: { fontSize: 15, fontWeight: '600' },
  acceptBtn: { flex: 2, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  acceptText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  acceptedActions: {},
  fullWidthBtn: {
    height: 52, borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  fullWidthBtnText: { fontSize: 15, fontWeight: '700' },
  errorText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  backLink: { padding: 8 },
});

export default ApplicationDetailsScreen;
