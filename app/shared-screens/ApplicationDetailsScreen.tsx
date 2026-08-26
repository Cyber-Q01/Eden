import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useApplicationDetails, useLandlordApplications, Application } from '../../hooks/useApplications';
import { supabase } from '../../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────
interface EdenPayload {
  __eden_v: number;
  applicant: {
    name: string;
    email: string;
    phone: string;
    occupation: string;
    monthly_income: string;
    lease_duration: string;
  };
  verification: {
    selfie_url: string;
    full_photo_url: string;
  };
  documents: {
    valid_id_url: string | null;
    income_url: string | null;
    reference_url: string | null;
  };
  cover_letter: string;
}

// ─── Parse message ────────────────────────────────────────────────────────────
const parseMessage = (raw: string | EdenPayload | null | undefined): { payload: EdenPayload | null; plainText: string } => {
  try {
    const obj: any = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (obj && obj.__eden_v === 1) return { payload: obj as EdenPayload, plainText: '' };
  } catch { }
  return { payload: null, plainText: typeof raw === 'string' ? raw : '' };
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#F59E0B', bgLight: '#FEF3C7', bgDark: '#451A03', icon: 'time-outline' },
  accepted: { label: 'Accepted', color: '#10B981', bgLight: '#D1FAE5', bgDark: '#064E3B', icon: 'checkmark-circle-outline' },
  declined: { label: 'Declined', color: '#EF4444', bgLight: '#FEE2E2', bgDark: '#450A0A', icon: 'close-circle-outline' },
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
const ApplicationDetailsScreen = () => {
  const params = useLocalSearchParams<{ id?: string; application_id?: string; applicationData?: string }>();
  const targetAppId = params.application_id || params.id || null;
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { role } = useAuth();
  const { showError } = useToast();

  let initialAppData: Application | null = null;
  if (params.applicationData) {
    try {
      initialAppData = JSON.parse(params.applicationData);
    } catch {}
  }

  const { application, loading, refetch } = useApplicationDetails(targetAppId, initialAppData);
  const { respondToApplication, responding } = useLandlordApplications();

  const [rentalInfo, setRentalInfo] = useState<{
    id: string; status: string; confirmation_deadline: string | null; amount: number;
  } | null>(null);
  const [fetchingRental, setFetchingRental] = useState(false);

  // ── In-app photo viewer ───────────────────────────────────────────────────
  const [photoViewer, setPhotoViewer] = useState<{ url: string; label: string } | null>(null);

  // ── Celebration modal (shown once on first accepted load for tenant) ────────
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationChecked = useRef(false);

  const fetchRentalStatus = useCallback(async () => {
    if (!application || application.status !== 'accepted') return;
    setFetchingRental(true);
    try {
      // The rental record is created when the landlord accepts — the tenant
      // pays directly against it (no agreement step)
      const { data: rental } = await supabase
        .from('rentals')
        .select('id, status, confirmation_deadline, amount')
        .eq('application_id', application.id)
        .maybeSingle();
      if (rental) {
        setRentalInfo({
          id: rental.id,
          status: rental.status,
          confirmation_deadline: rental.confirmation_deadline ?? null,
          amount: Number(rental.amount || 0),
        });
      }
    } catch (e) {
      console.log('Rental status error:', e);
    } finally {
      setFetchingRental(false);
    }
  }, [application]);

  useEffect(() => {
    fetchRentalStatus();
  }, [application, fetchRentalStatus]);

  // Show celebration once for tenant when status is accepted
  useEffect(() => {
    if (!application || application.status !== 'accepted' || role !== 'TENANT') return;
    if (celebrationChecked.current) return;
    celebrationChecked.current = true;
    const key = `has_seen_accepted_${application.id}`;
    AsyncStorage.getItem(key).then(seen => {
      if (!seen) setShowCelebration(true);
    });
  }, [application?.id, application?.status, role]);

  const dismissCelebration = async () => {
    setShowCelebration(false);
    if (application) {
      await AsyncStorage.setItem(`has_seen_accepted_${application.id}`, 'true');
    }
  };

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
            if (!result.error) refetch();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenWrapper style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[{ color: colors.textSecondary, marginTop: 12, fontSize: 14 }]}>Loading application…</Text>
      </ScreenWrapper>
    );
  }

  if (!application) {
    return (
      <ScreenWrapper style={styles.centered}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.card }]}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
        </View>
        <Text style={[styles.errorText, { color: colors.text }]}>Application not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </ScreenWrapper>
    );
  }

  const isRenter = role === 'TENANT';
  const statusCfg = STATUS_CONFIG[application.status];
  const propertyImage = application.property?.images?.[0];
  const otherParty = isRenter ? application.owner : application.renter;
  // PostgREST returns user_biodata as [] (no row) or an object — normalize to object
  const otherBio: any = Array.isArray((otherParty as any)?.user_biodata)
    ? (otherParty as any)?.user_biodata[0]
    : (otherParty as any)?.user_biodata;
  const { payload, plainText } = parseMessage((application as any).message ?? '');

  // Tenant image: users.profile_photo may be empty — the profile photo is
  // actually stored on the user_biodata table (biodata/profile setup flow).
  const tenantPhoto =
    otherParty?.profile_photo ||
    otherBio?.profile_photo ||
    otherParty?.avatar_url ||
    payload?.verification?.selfie_url ||
    payload?.verification?.full_photo_url ||
    null;

  // Formatted data fields
  const applicantName = otherParty ? `${otherParty.first_name} ${otherParty.last_name}` : 'Akin Oladele';
  const memberSinceYear = (otherParty as any)?.created_at
    ? new Date((otherParty as any).created_at).getFullYear()
    : '2026';
  const appliedDateStr = application.created_at
    ? new Date(application.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '24 Apr 2026';

  const phoneVal = otherParty?.phone_number || otherBio?.phone_number || payload?.applicant.phone || '08012345678';
  const emailVal = otherParty?.email || payload?.applicant.email || 'akin@example.com';
  const occupationVal = payload?.applicant.occupation || 'UI/UX Designer';
  const incomeVal = payload?.applicant.monthly_income
    ? `₦${Number(payload.applicant.monthly_income).toLocaleString()}`
    : '₦350,000';
  const moveInDateStr = application.move_in_date
    ? new Date(application.move_in_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '1 May 2026';

  const viewDoc = (label: string, url: string | null) => {
    if (url) {
      router.push({
        pathname: '/shared-screens/WebViewScreen',
        params: { url, title: label }
      });
    }
  };

  return (
    <>
      <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <BackButton />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Application Review</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* 1. Applicant Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.profileHeaderRow}>
              {/* Avatar block */}
              <View style={styles.avatarWrapper}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                  {tenantPhoto ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={{ width: '100%', height: '100%' }}
                      onPress={() => setPhotoViewer({ url: tenantPhoto, label: applicantName })}
                    >
                      <Image
                        source={{ uri: tenantPhoto }}
                        style={styles.avatarImage}
                        contentFit="cover"
                      />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="person" size={36} color={colors.primary} />
                  )}
                </View>
                <View style={[styles.verifiedBadge, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
              </View>

              {/* Text details */}
              <View style={styles.profileTextWrapper}>
                <Text style={[styles.profileName, { color: colors.text }]}>{applicantName}</Text>

                {/* Badges row */}
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, styles.tenantBadge, { borderColor: colors.primary + '30', backgroundColor: isDark ? '#1E3A8A40' : '#EFF6FF' }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>{isRenter ? 'Landlord' : 'Tenant'}</Text>
                  </View>
                  <View style={[styles.badge, styles.kycBadge, { borderColor: '#10B98130', backgroundColor: isDark ? '#064E3B40' : '#ECFDF5' }]}>
                    <Text style={[styles.badgeText, { color: '#10B981' }]}>KYC verified</Text>
                  </View>
                </View>

                {/* Subtext info */}
                <Text style={[styles.profileSubtext, { color: colors.textSecondary }]}>
                  Member since {memberSinceYear === '2026' ? 'Jan 2026' : `Jan ${memberSinceYear}`}
                </Text>

                {/* Rating row — only shown to tenant viewing the landlord's profile */}
                {isRenter && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#FBBF24" />
                    <Text style={[styles.ratingText, { color: colors.text }]}> 4.8</Text>
                    <Text style={[styles.reviewsText, { color: colors.textSecondary }]}> (3 reviews)</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* 2. Application Status Banner */}
          <View style={[styles.statusCard, {
            backgroundColor: isDark ? statusCfg.bgDark : statusCfg.bgLight,
            borderColor: statusCfg.color + '30'
          }]}>
            <View style={[styles.statusIconWrap, { backgroundColor: statusCfg.color }]}>
              <Ionicons name={statusCfg.icon as any} size={18} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: statusCfg.color }]}>Status: {statusCfg.label}</Text>
              <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
                {application.status === 'pending'
                  ? (isRenter ? 'Awaiting feedback from landlord' : 'Please review and accept or reject')
                  : application.status === 'accepted'
                    ? 'This application has been accepted'
                    : 'This application has been declined'}
              </Text>
            </View>
          </View>

          {/* 3. Applied Property Card */}
          <View style={[styles.propertyCard, {
            backgroundColor: isDark ? '#17255420' : '#EFF6FF80',
            borderColor: isDark ? '#1E3A8B40' : '#BFDBFE'
          }]}>
            <View style={[styles.homeIconContainer, { backgroundColor: isDark ? '#1E40AF40' : '#DBEAFE' }]}>
              <Ionicons name="home-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.propertyInfo}>
              <Text style={[styles.appliedForLabel, { color: colors.textSecondary }]}>Applied for</Text>
              <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>
                {application.property?.title || '2 Bedroom Flat, Lekki Phase 1'}
              </Text>
              <View style={styles.propertyPriceRow}>
                <Text style={[styles.propertyPrice, { color: colors.primary }]}>
                  ₦{Number(application.property?.price ?? 450000).toLocaleString()}/yr
                </Text>
                <Text style={[styles.appliedDate, { color: colors.textSecondary }]}>
                  • Applied {appliedDateStr}
                </Text>
              </View>
            </View>
          </View>

          {/* 4. Application Details Grid */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardHeader, { color: colors.text }]}>Application Details</Text>

            <View style={styles.gridContainer}>
              <View style={styles.gridRow}>
                <View style={styles.gridLabelRow}>
                  <Ionicons name="call-outline" size={16} color={colors.primary} />
                  <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Phone</Text>
                </View>
                <Text style={[styles.gridValue, { color: colors.text }]}>{phoneVal}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.gridRow}>
                <View style={styles.gridLabelRow}>
                  <Ionicons name="mail-outline" size={16} color={colors.primary} />
                  <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Email</Text>
                </View>
                <Text style={[styles.gridValue, { color: colors.text }]} numberOfLines={1}>{emailVal}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.gridRow}>
                <View style={styles.gridLabelRow}>
                  <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
                  <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Occupation</Text>
                </View>
                <Text style={[styles.gridValue, { color: colors.text }]}>{occupationVal}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.gridRow}>
                <View style={styles.gridLabelRow}>
                  <Ionicons name="cash-outline" size={16} color={colors.primary} />
                  <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Monthly Income</Text>
                </View>
                <Text style={[styles.gridValue, { color: colors.text }]}>{incomeVal}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.gridRow}>
                <View style={styles.gridLabelRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Move-In-Date</Text>
                </View>
                <Text style={[styles.gridValue, { color: colors.text }]}>{moveInDateStr}</Text>
              </View>
            </View>
          </View>

          {/* 5. Application Messages / Cover Letter */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardHeader, { color: colors.text }]}>Application Messages</Text>
            <Text style={[styles.messageText, { color: colors.text }]}>
              {payload ? payload.cover_letter : plainText || 'No custom message provided.'}
            </Text>
          </View>

          {/* 6. Submitted Documents */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardHeader, { color: colors.text }]}>Submitted Documents</Text>

            <View style={styles.docList}>
              {/* Proof of Income */}
              <View style={styles.docRow}>
                <View style={styles.docLeft}>
                  <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                  <Text style={[styles.docName, { color: colors.text }]}>Proof of Income</Text>
                </View>
                {payload?.documents.income_url ? (
                  <TouchableOpacity
                    style={[styles.viewDocBtn, { backgroundColor: colors.primary + '15' }]}
                    onPress={() => viewDoc('Proof of Income', payload.documents.income_url)}
                  >
                    <Text style={[styles.viewDocBtnText, { color: colors.primary }]}>View</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.docStatusUnuploaded, { color: colors.textSecondary }]}>Not Uploaded</Text>
                )}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Valid ID */}
              <View style={styles.docRow}>
                <View style={styles.docLeft}>
                  <Ionicons name="card-outline" size={18} color={colors.primary} />
                  <Text style={[styles.docName, { color: colors.text }]}>Valid ID (NIN/DL)</Text>
                </View>
                {payload?.documents.valid_id_url ? (
                  <TouchableOpacity
                    style={[styles.viewDocBtn, { backgroundColor: colors.primary + '15' }]}
                    onPress={() => viewDoc('Valid ID', payload.documents.valid_id_url)}
                  >
                    <Text style={[styles.viewDocBtnText, { color: colors.primary }]}>View</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.docStatusUnuploaded, { color: colors.textSecondary }]}>Not Uploaded</Text>
                )}
              </View>

              {payload?.documents.reference_url && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  {/* Reference Letter */}
                  <View style={styles.docRow}>
                    <View style={styles.docLeft}>
                      <Ionicons name="mail-unread-outline" size={18} color={colors.primary} />
                      <Text style={[styles.docName, { color: colors.text }]}>Reference Letter</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.viewDocBtn, { backgroundColor: colors.primary + '15' }]}
                      onPress={() => viewDoc('Reference Letter', payload.documents.reference_url)}
                    >
                      <Text style={[styles.viewDocBtnText, { color: colors.primary }]}>View</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* 7. Application Photos */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardHeader, { color: colors.text }]}>Application Photos</Text>

            <View style={styles.photoGrid}>
              {/* Selfie Photo */}
              <View style={styles.photoGridItem}>
                {payload?.verification.selfie_url ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.photoBox, { borderColor: colors.primary + '40' }]}
                    onPress={() => setPhotoViewer({ url: payload.verification.selfie_url, label: 'Selfie' })}
                  >
                    <Image source={{ uri: payload.verification.selfie_url }} style={styles.photoImage} contentFit="cover" />
                    <View style={styles.photoOverlayLabel}>
                      <Text style={styles.photoOverlayText}>Selfie</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.photoBoxEmpty, { backgroundColor: isDark ? '#1E3A8A10' : '#EFF6FF80', borderColor: colors.primary + '40' }]}>
                    <Ionicons name="camera-outline" size={20} color={colors.primary} />
                    <Text style={[styles.photoBoxText, { color: colors.text }]}>Selfie</Text>
                  </View>
                )}
              </View>

              {/* Full Photo */}
              <View style={styles.photoGridItem}>
                {payload?.verification.full_photo_url ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.photoBox, { borderColor: colors.primary + '40' }]}
                    onPress={() => setPhotoViewer({ url: payload.verification.full_photo_url, label: 'Full Photo' })}
                  >
                    <Image source={{ uri: payload.verification.full_photo_url }} style={styles.photoImage} contentFit="cover" />
                    <View style={styles.photoOverlayLabel}>
                      <Text style={styles.photoOverlayText}>Full Photo</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.photoBoxEmpty, { backgroundColor: isDark ? '#1E3A8A10' : '#EFF6FF80', borderColor: colors.primary + '40' }]}>
                    <Ionicons name="person-outline" size={20} color={colors.primary} />
                    <Text style={[styles.photoBoxText, { color: colors.text }]}>Full Photo</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Payment / escrow status if accepted */}
          {application.status === 'accepted' && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardHeader, { color: colors.text }]}>Payment Status</Text>
              <View style={styles.agreementInfoRow}>
                <View style={[styles.agreementIconCircle, { backgroundColor: rentalInfo && rentalInfo.status !== 'awaiting_payment' ? '#10B98115' : '#F59E0B15' }]}>
                  <Ionicons
                    name={rentalInfo && rentalInfo.status !== 'awaiting_payment' ? "shield-checkmark" : "time-outline"}
                    size={20}
                    color={rentalInfo && rentalInfo.status !== 'awaiting_payment' ? "#10B981" : "#F59E0B"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.agreementTitle, { color: colors.text }]}>
                    {fetchingRental ? 'Checking...'
                      : !rentalInfo ? 'Setting up payment...'
                        : rentalInfo.status === 'awaiting_payment' ? 'Awaiting payment'
                          : rentalInfo.status === 'awaiting_confirmation' ? 'Paid — funds in escrow'
                            : rentalInfo.status === 'released' ? 'Escrow released ✓'
                              : `Status: ${rentalInfo.status}`}
                  </Text>
                  <Text style={[styles.agreementSub, { color: colors.textSecondary }]}>
                    {!rentalInfo
                      ? 'Your payment is being prepared'
                      : rentalInfo.status === 'awaiting_payment'
                        ? isRenter ? 'You can pay directly — no agreement needed' : 'Waiting for the tenant to pay'
                          : rentalInfo.status === 'awaiting_confirmation'
                            ? 'Funds are protected in escrow until released'
                              : rentalInfo.status === 'released'
                                ? 'Funds have been released to the landlord'
                                  : ''}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: application.status === 'accepted' ? 140 : (!isRenter && application.status === 'pending' ? 100 : 32) }} />
        </ScrollView>

        {/* ── Floating Action Footer (always fixed) ── */}
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {!isRenter && application.status === 'pending' && (
            <View style={styles.landlordActions}>
              <TouchableOpacity
                style={[styles.declineBtn, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2', borderColor: 'transparent' }]}
                onPress={() => handleLandlordRespond('decline')}
                disabled={responding}
              >
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                <Text style={[styles.declineText, { color: '#EF4444' }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleLandlordRespond('accept')}
                disabled={responding}
              >
                {responding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.acceptText}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {application.status === 'accepted' && (
            <View style={styles.acceptedActions}>
              {isRenter ? (
                <>
                  {/* Direct payment — no agreement step */}
                  {rentalInfo?.status === 'awaiting_payment' && (
                    <TouchableOpacity
                      style={[styles.fullWidthBtn, { backgroundColor: colors.primary, borderColor: 'transparent' }]}
                      onPress={() => router.push({
                        pathname: '/shared-screens/RentPaymentScreen',
                        params: { rental_id: rentalInfo.id }
                      })}
                    >
                      <Ionicons name="card-outline" size={18} color="#fff" />
                      <Text style={[styles.fullWidthBtnText, { color: '#fff' }]}>Proceed to Payment</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" style={{ position: 'absolute', right: 16 }} />
                    </TouchableOpacity>
                  )}

                  {/* Paid — release the escrow */}
                  {rentalInfo?.status === 'awaiting_confirmation' && (
                    <TouchableOpacity
                      style={[styles.fullWidthBtn, { backgroundColor: '#10B981', borderColor: 'transparent' }]}
                      onPress={() => router.push({
                        pathname: '/shared-screens/RentalConfirmationScreen',
                        params: {
                          rental_id: rentalInfo.id,
                          confirmation_deadline: rentalInfo.confirmation_deadline || '',
                          property_title: application.property?.title || 'Property',
                          amount: String(rentalInfo.amount || 0),
                        }
                      })}
                    >
                      <Ionicons name="lock-open-outline" size={18} color="#fff" />
                      <Text style={[styles.fullWidthBtnText, { color: '#fff' }]}>Release escrow</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" style={{ position: 'absolute', right: 16 }} />
                    </TouchableOpacity>
                  )}

                  {rentalInfo?.status === 'released' && (
                    <View style={[styles.fullWidthBtn, { backgroundColor: colors.border, opacity: 0.75 }]}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.textSecondary} />
                      <Text style={[styles.fullWidthBtnText, { color: colors.textSecondary }]}>Escrow Released</Text>
                    </View>
                  )}

                  {(!fetchingRental && !rentalInfo) && (
                    <View style={[styles.fullWidthBtn, { backgroundColor: colors.border }]}>
                      <ActivityIndicator size="small" color={colors.textSecondary} />
                      <Text style={[styles.fullWidthBtnText, { color: colors.textSecondary }]}>Setting up payment...</Text>
                    </View>
                  )}
                </>
              ) : (
                // Landlord: payment status (no action needed)
                <View style={[styles.fullWidthBtn, { backgroundColor: colors.primary + '15', borderColor: 'transparent' }]}>
                  <Ionicons
                    name={rentalInfo && rentalInfo.status !== 'awaiting_payment' ? "checkmark-circle-outline" : "card-outline"}
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={[styles.fullWidthBtnText, { color: colors.primary }]}>
                    {fetchingRental || !rentalInfo
                      ? 'Setting up payment'
                      : rentalInfo.status === 'awaiting_payment' ? 'Awaiting tenant payment'
                        : rentalInfo.status === 'awaiting_confirmation' ? 'Paid — funds in escrow'
                          : rentalInfo.status === 'released' ? 'Escrow released ✓'
                            : `Status: ${rentalInfo.status}`}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScreenWrapper>

      {/* ── Application Accepted Celebration Modal (tenant, shown once) ── */}
      <Modal
        visible={showCelebration}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={dismissCelebration}
      >
        <View style={[celebStyles.overlay, { backgroundColor: isDark ? '#0D1117' : '#F0F4FF' }]}>
          {/* Header */}
          <View style={[celebStyles.header, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <View style={{ width: 40 }} />
            <Text style={[celebStyles.headerTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>Application Status</Text>
            <TouchableOpacity onPress={dismissCelebration} style={celebStyles.closeBtn}>
              <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={celebStyles.scrollContent}
          >
            {/* Hero checkmark */}
            <View style={celebStyles.heroContainer}>
              <View style={celebStyles.heroRing}>
                <View style={celebStyles.heroCircle}>
                  <Ionicons name="checkmark" size={44} color="#fff" />
                </View>
              </View>
              {/* Decorative dots */}
              <View style={[celebStyles.dot, { top: 10, left: 30, backgroundColor: '#F59E0B' }]} />
              <View style={[celebStyles.dot, { top: 0, right: 40, backgroundColor: '#3B82F6', width: 10, height: 10 }]} />
              <View style={[celebStyles.dot, { top: 50, left: 10, backgroundColor: '#10B981', width: 12, height: 12 }]} />
              <View style={[celebStyles.dot, { top: 35, right: 20, backgroundColor: '#EF4444', width: 8, height: 8 }]} />
              <View style={[celebStyles.dot, { bottom: 10, left: 50, backgroundColor: '#F59E0B', width: 8, height: 8 }]} />
              <View style={[celebStyles.dot, { bottom: 5, right: 60, backgroundColor: '#3B82F6', width: 11, height: 11 }]} />
            </View>

            {/* Title */}
            <View style={celebStyles.titleBlock}>
              <Text style={[celebStyles.title, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>Application Accepted</Text>
              <Text style={[celebStyles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Congratulations! {applicantName} has accepted your application{application?.property?.title ? ` for ${application.property.title}` : ''}.
              </Text>
            </View>

            {/* Property mini-card */}
            <View style={[celebStyles.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <View style={celebStyles.propertyRow}>
                {propertyImage ? (
                  <Image source={{ uri: propertyImage }} style={celebStyles.propertyImg} contentFit="cover" />
                ) : (
                  <View style={[celebStyles.propertyImgPlaceholder, { backgroundColor: isDark ? '#334155' : '#EFF6FF' }]}>
                    <Ionicons name="home-outline" size={22} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[celebStyles.propertyTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]} numberOfLines={2}>
                    {application?.property?.title || 'Your Property'}
                  </Text>
                  {application?.property?.location ? (
                    <View style={celebStyles.locationRow}>
                      <Ionicons name="location-outline" size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                      <Text style={[celebStyles.locationText, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                        {application.property.location}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[celebStyles.propertyPrice, { color: colors.primary }]}>
                    ₦{Number(application?.property?.price ?? 0).toLocaleString()}/year
                  </Text>
                </View>
              </View>
            </View>

            {/* Landlord card */}
            <View style={[celebStyles.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <Text style={[celebStyles.cardSectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Your Landlord</Text>
              <View style={[celebStyles.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
              <View style={celebStyles.landlordRow}>
                <View style={[celebStyles.landlordAvatar, { backgroundColor: isDark ? '#1E3A8A40' : '#EFF6FF' }]}>
                  {otherParty?.profile_photo || otherBio?.profile_photo || otherParty?.avatar_url ? (
                    <Image
                      source={{ uri: otherParty?.profile_photo || otherBio?.profile_photo || otherParty?.avatar_url }}
                      style={celebStyles.landlordAvatarImg}
                      contentFit="cover"
                    />
                  ) : (
                    <Ionicons name="person" size={28} color={colors.primary} />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[celebStyles.landlordName, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>{applicantName}</Text>
                  <View style={celebStyles.verifiedRow}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={[celebStyles.verifiedText, { color: '#10B981' }]}>Verified Landlord</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Application info card */}
            <View style={[celebStyles.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <Text style={[celebStyles.cardSectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Application Info</Text>
              <View style={[celebStyles.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
              <View style={celebStyles.infoRow}>
                <View style={[celebStyles.infoIconCircle, { backgroundColor: isDark ? '#1E3A8A20' : '#EFF6FF' }]}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[celebStyles.infoLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Move-In Date</Text>
                  <Text style={[celebStyles.infoValue, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>{moveInDateStr}</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Fixed footer */}
          <View style={[celebStyles.footer, { backgroundColor: isDark ? '#0D1117' : '#F0F4FF', borderTopColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <TouchableOpacity
              style={[celebStyles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={async () => {
                await dismissCelebration();
                if (rentalInfo?.status === 'awaiting_payment') {
                  router.push({
                    pathname: '/shared-screens/RentPaymentScreen',
                    params: { rental_id: rentalInfo.id }
                  });
                }
              }}
            >
              <Ionicons name="card-outline" size={18} color="#fff" />
              <Text style={celebStyles.primaryBtnText}>Proceed to Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={celebStyles.secondaryBtn} onPress={dismissCelebration}>
              <Text style={[celebStyles.secondaryBtnText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Got it, I'll check later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Full-screen in-app photo viewer modal ── */}
      <Modal
        visible={!!photoViewer}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPhotoViewer(null)}
      >
        <View style={styles.photoModalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPhotoViewer(null)} />

          <View style={styles.photoModalHeader}>
            <Text style={styles.photoModalLabel}>{photoViewer?.label}</Text>
            <TouchableOpacity onPress={() => setPhotoViewer(null)} style={styles.photoModalClose}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.photoModalImageWrap}>
            {photoViewer && (
              <Image source={{ uri: photoViewer.url }} style={styles.photoModalImage} contentFit="contain" />
            )}
          </View>
          <Text style={styles.photoModalHint}>Tap outside to close</Text>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, gap: 16 },
  errorText: { fontSize: 16, fontWeight: '600' },

  // Applicant profile card
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  profileTextWrapper: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  tenantBadge: {},
  kycBadge: {},
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  profileSubtext: {
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewsText: {
    fontSize: 12,
  },

  // Status banner
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusDesc: {
    fontSize: 12,
    marginTop: 1,
  },

  // Applied property card
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  homeIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  appliedForLabel: {
    fontSize: 11,
  },
  propertyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginVertical: 1,
  },
  propertyPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  propertyPrice: {
    fontSize: 13,
    fontWeight: '800',
  },
  appliedDate: {
    fontSize: 12,
  },

  // Detail Cards
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  gridContainer: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  gridLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
  },

  // Documents
  docList: {
    gap: 12,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docName: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewDocBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  viewDocBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  docStatusUnuploaded: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Photos Grid
  photoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  photoGridItem: {
    flex: 1,
  },
  photoBox: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlayLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  photoOverlayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  photoBoxEmpty: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  photoBoxText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },

  // Agreement
  agreementInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agreementIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agreementTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  agreementSub: {
    fontSize: 12,
  },

  // Footer Actions
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  landlordActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  declineText: {
    fontSize: 15,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  acceptText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  acceptedActions: {},
  fullWidthBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  fullWidthBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Full-screen photo viewer modal
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'space-between',
    paddingTop: (StatusBar.currentHeight ?? 44) + 8,
    paddingBottom: 32,
  },
  photoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  photoModalLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  photoModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImageWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
  },
  photoModalHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});

// ─── Celebration Modal Styles ─────────────────────────────────────────────────
const celebStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingTop: StatusBar.currentHeight ?? 44,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },

  // Hero
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
    marginBottom: 8,
  },
  heroRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  // Title block
  titleBlock: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Cards
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },

  // Property row
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyImg: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  propertyImgPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    flex: 1,
  },
  propertyPrice: {
    fontSize: 14,
    fontWeight: '800',
  },

  // Landlord card
  landlordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  landlordAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  landlordAvatarImg: {
    width: '100%',
    height: '100%',
  },
  landlordName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Info card
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Footer
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ApplicationDetailsScreen;

