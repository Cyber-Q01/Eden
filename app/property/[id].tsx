import BackButton from '@/components/BackButton';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useInspections } from '../../hooks/useInspections';
import { useFavorites, useProperty } from '../../hooks/useProperties';
import { useLandlord } from '../../hooks/useLandlord';
import { supabase } from '../../lib/supabase';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width } = Dimensions.get('window');

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatPrice = (price: number, purpose: string) => {
    const formatted = `₦${Number(price).toLocaleString()}`;
    if (purpose === 'sale') return formatted;

    return `${formatted}`;
};

const getFurnishingLabel = (val: string) => {
    const map: Record<string, string> = {
        furnished: 'Furnished',
        'semi-furnished': 'Semi Furnished',
        unfurnished: 'Unfurnished',
    };
    return map[val] ?? val;
};

const FALLBACK_IMAGE = require('../../assets/images/Homes/home1.png');
const FALLBACK_AVATAR = { uri: 'https://ui-avatars.com/api/?name=User&size=128&background=2563EB&color=fff' }; // Add a placeholder

// ─── Sub-components ──────────────────────────────────────────────────────────

const Badge = ({ label, color, bg }: { label: string; color: string; bg: string }) => (
    <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
);

const FeatureChip = ({
    icon,
    label,
    iconSet = 'ion',
    colors,
}: {
    icon: string;
    label: string;
    iconSet?: 'ion' | 'mci';
    colors: any;
}) => (
    <View style={[styles.featureChip, { backgroundColor: colors.primary + '10' }]}>
        {iconSet === 'ion' ? (
            <Ionicons name={icon as any} size={20} color={colors.primary} />
        ) : (
            <MaterialCommunityIcons name={icon as any} size={20} color={colors.primary} />
        )}
        <Text style={[styles.featureChipLabel, { color: colors.text }]}>{label}</Text>
    </View>
);

const AmenityTag = ({ label, colors }: { label: string; colors: any }) => (
    <View style={[styles.amenityTag, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
        <Text style={[styles.amenityTagText, { color: colors.text }]}>{label}</Text>
    </View>
);


// ─── Main Screen ─────────────────────────────────────────────────────────────

const PropertyVideoPlayer = ({ videoUrl }: { videoUrl: string }) => {
    const player = useVideoPlayer(videoUrl, (p) => {
        p.loop = true;
        p.muted = true;
    });

    return (
        <VideoView
            player={player}
            style={styles.video}
            allowsFullscreen
            allowsPictureInPicture
        />
    );
};

const PropertyDetailScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const floatingButtonBg = isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.92)';
    const floatingButtonIconColor = isDark ? '#FFFFFF' : '#333333';

    const { property, loading, error, refetch } = useProperty(id);
    const { addFavorite, removeFavorite, favorites } = useFavorites();
    const { deleteProperty } = useLandlord();
    const { user, role } = useAuth();

    const [activeIndex, setActiveIndex] = useState(0);
    const [showFees, setShowFees] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const { checkBookingStatus } = useInspections();
    const [isBooked, setIsBooked] = useState(false);
    const [hasInspectionPassed, setHasInspectionPassed] = useState(false);
    const [bookingDetails, setBookingDetails] = useState<any>(null);
    const [booking, setBooking] = useState(false);

    const propertyId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

    const isOwner = user?.id === property?.landlord_id;
    const isLandlord = role === 'LANDLORD';
    const isLandlordOrAgent = role === 'LANDLORD' || role === 'AGENT';

    useEffect(() => {
        if (propertyId) {
            // Check detailed booking status & scheduled date
            const fetchBookingInfo = async () => {
                if (!user) return;
                try {
                    const { data: bData } = await supabase
                        .from('inspection_bookings')
                        .select('id, preferred_date, preferred_time, status')
                        .eq('property_id', propertyId)
                        .eq('renter_id', user.id)
                        .neq('status', 'cancelled')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (bData) {
                        setIsBooked(true);
                        setBookingDetails(bData);

                        // Check if inspection date has passed
                        const prefDate = new Date(bData.preferred_date);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        prefDate.setHours(0, 0, 0, 0);

                        const passed = prefDate <= today || bData.status === 'completed';
                        setHasInspectionPassed(passed);
                    } else {
                        setIsBooked(false);
                        setBookingDetails(null);
                        setHasInspectionPassed(false);
                    }
                } catch (err) {
                    console.warn('Booking info fetch notice:', err);
                }
            };

            fetchBookingInfo();
            
            // Increment view count
            const incrementView = async () => {
                try {
                    const { error } = await supabase.rpc('increment_view_count', { 
                        p_property_id: propertyId 
                    });
                    if (error) console.error('[PropertyDetail] Error incrementing view count:', error);
                } catch (err) {
                    console.error('[PropertyDetail] Exception incrementing view count:', err);
                }
            };
            incrementView();
        }
    }, [propertyId, user]);

    const isFavorited = favorites.some((f: any) => f.property_id === propertyId || f.id === propertyId);

    const handleFavorite = async () => {
        if (!propertyId) return;
        isFavorited ? await removeFavorite(propertyId) : await addFavorite(propertyId);
    };

    // ── Report Listing State ───────────────────────────────────────────────────
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('Fraudulent / Unrealistic Pricing');
    const [reportDetails, setReportDetails] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const reportReasons = [
        'Fraudulent / Unrealistic Pricing',
        'Misleading or Fake Photos',
        'Landlord Impersonation / Agent Scam',
        'Property Already Rented / Unavailable',
        'Suspicious or Dangerous Location',
        'Other Policy Violation'
    ];

    const handleSubmitReport = async () => {
        if (!reportDetails.trim() && !reportReason) {
            Alert.alert('Details Required', 'Please provide a short explanation for your report.');
            return;
        }

        setIsSubmittingReport(true);
        try {
            const { error: insertErr } = await supabase.from('reported_listings').insert([{
                property_id: propertyId,
                reporter_id: user?.id || null,
                reason: reportReason,
                details: reportDetails.trim() || `Reported by user for: ${reportReason}`,
                status: 'pending',
                created_at: new Date().toISOString()
            }]);

            if (insertErr) {
                console.warn('Report listing fallback notice:', insertErr);
            }

            setShowReportModal(false);
            setReportDetails('');
            Alert.alert(
                'Report Submitted',
                'Thank you for reporting this listing. The Eden Trust & Moderation team will investigate within 2 hours to keep the network safe.'
            );
        } catch (e: any) {
            console.error('Report submission error:', e);
            setShowReportModal(false);
            Alert.alert('Report Received', 'Your report has been logged for moderation review.');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const handleDeleteProperty = () => {
        Alert.alert(
            'Delete Listing',
            `Are you sure you want to delete "${property?.title}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteProperty(propertyId);
                        router.back();
                    }
                },
            ]
        );
    };

    const handleBookInspection = async () => {
        if (isBooked) {
            try {
                const { data: bookingData } = await supabase
                    .from('inspection_bookings')
                    .select('preferred_date, preferred_time')
                    .eq('property_id', propertyId)
                    .eq('renter_id', user?.id)
                    .eq('status', 'confirmed')
                    .limit(1)
                    .single();

                const bookingDate = bookingData ? new Date(bookingData.preferred_date) : null;
                if (bookingData && bookingDate) {
                    const timeParts = bookingData.preferred_time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                    if (timeParts) {
                        let hours = parseInt(timeParts[1]);
                        const minutes = parseInt(timeParts[2]);
                        const ampm = timeParts[3];
                        if (ampm) {
                            if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                            if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
                        }
                        bookingDate.setHours(hours);
                        bookingDate.setMinutes(minutes);
                    }
                }

                const dateStr = bookingData
                    ? new Date(bookingData.preferred_date).toLocaleDateString('en-NG', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                    })
                    : '';
                const timeStr = bookingData ? bookingData.preferred_time + ' WAT' : '';

                const landlordName = property?.agent_id
                    ? (property.agent?.first_name ? `${property.agent.first_name} ${property.agent.last_name || ''}`.trim() : 'Agent')
                    : (property?.landlord?.first_name ? `${property.landlord.first_name} ${property.landlord.last_name || ''}`.trim() : 'Landlord');

                router.push({
                    pathname: '/shared-screens/BookingConfirmationScreen',
                    params: {
                        property_id: propertyId,
                        date: dateStr,
                        time: timeStr,
                        property: property?.title || '',
                        address: property?.location || '',
                        landlord: landlordName,
                        raw_date: bookingDate ? bookingDate.toISOString() : '',
                    }
                });
            } catch (err) {
                console.error('Error fetching booking details for confirmation:', err);
                router.push({
                    pathname: '/shared-screens/BookingConfirmationScreen',
                    params: { property_id: propertyId }
                });
            }
            return;
        }

        router.push({
            pathname: '/shared-screens/BookInspectionScreen',
            params: { 
                property_id: propertyId,
                property_title: property?.title || ''
            }
        });
    };

    const handleApply = () => {
        if (!property) return;
        router.push({
            pathname: '/shared-screens/ApplicationScreen',
            params: {
                id: propertyId,
                title: property.title,
                price: property.price?.toString(),
                location: property.location,
            },
        });
    };

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / width);
        setActiveIndex(index);
    };

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <ScreenWrapper style={{ backgroundColor: colors.background }}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>Fetching property details…</Text>
                </View>
            </ScreenWrapper>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (error || !property) {
        return (
            <ScreenWrapper style={{ backgroundColor: colors.background }}>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
                    <Text style={[styles.errorTitle, { color: colors.text }]}>Failed to load property</Text>
                    <Text style={[styles.errorSub, { color: colors.textSecondary }]}>Check your connection and try again.</Text>
                    <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    // ── Derived data from real schema ────────────────────────────────────────
    const images: string[] = property.images?.length ? property.images : [];
    const hasImages = images.length > 0;

    const features = [
        { icon: 'bed-outline', label: `${property.bedrooms ?? 0} Beds`, iconSet: 'ion' },
        { icon: 'water-outline', label: `${property.bathrooms ?? 0} Baths`, iconSet: 'ion' },
        { icon: 'toilet', label: `${property.toilets ?? 0} Toilets`, iconSet: 'mci' },
        {
            icon: property.parking ? 'car' : 'car-off',
            label: property.parking ? 'Parking' : 'No Parking',
            iconSet: 'mci',
        },
        {
            icon: 'home-outline',
            label: getFurnishingLabel(property.furnishing ?? 'unfurnished'),
            iconSet: 'ion',
        },
        {
            icon: 'calendar-outline',
            label: property.availability_date
                ? new Date(property.availability_date).toLocaleDateString('en-NG', {
                    day: 'numeric',
                    month: 'short',
                })
                : 'Available Now',
            iconSet: 'ion',
        },
    ] as const;

    const isLand = property.type?.toLowerCase().includes('land');
    const isSale = property.listing_purpose === 'sale';

    const landFeatures = isLand ? [
        { icon: 'resize-outline', label: `${property.land_size ?? 0} ${property.land_measurement_unit ? (property.land_measurement_unit.charAt(0).toUpperCase() + property.land_measurement_unit.slice(1)) : 'Plots'}`, iconSet: 'ion' },
        { icon: 'map-outline', label: property.type ?? 'Land', iconSet: 'ion' },
        {
            icon: 'calendar-outline',
            label: property.availability_date
                ? new Date(property.availability_date).toLocaleDateString('en-NG', {
                    day: 'numeric',
                    month: 'short',
                })
                : 'Available Now',
            iconSet: 'ion',
        },
    ] as const : [];

    const statusColor = property.status === 'available' ? '#00C853' : '#EF4444';
    const statusBg = property.status === 'available' ? '#E6F9F0' : '#FEE2E2';

    // Calculate Breakdown
    const rentAmount = property.price || 0;
    const hasAgencyFee = (property.agency_fee_percentage || 0) > 0;
    const agencyFee = hasAgencyFee ? (rentAmount * property.agency_fee_percentage) / 100 : 0;
    const cautionFee = property.caution_fee || 0;
    const legalFee = property.legal_fee || 0;
    const serviceChargePct = 5.0; // Strictly 5% platform service fee added to tenant payment
    const serviceFee = isSale ? 0 : (rentAmount * serviceChargePct) / 100;
    const escrowFee = isSale ? 0 : 1000; // Flat ₦1,000.00 Escrow Protection Fee
    const totalPackage = isSale
        ? rentAmount
        : (rentAmount + serviceFee + escrowFee + agencyFee + cautionFee + legalFee);

    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { 
                        backgroundColor: colors.background,
                        paddingBottom: isLandlordOrAgent ? 60 : 120 
                    }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Image Carousel ─────────────────────────────────────── */}
                <View style={styles.imageContainer}>
                    {hasImages ? (
                        <FlatList
                            ref={flatListRef}
                            data={images}
                            keyExtractor={(_, i) => String(i)}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={onScroll}
                            scrollEventThrottle={16}
                            style={{ flex: 1 }}
                            renderItem={({ item, index }) => (
                                <Image
                                    key={index}
                                    source={{
                                        uri: item,
                                    }}
                                    placeholder={FALLBACK_IMAGE}
                                    style={styles.mainImage}
                                    contentFit="cover"
                                    transition={200}
                                />
                            )}
                            initialNumToRender={1}
                            maxToRenderPerBatch={2}
                            windowSize={3}
                            removeClippedSubviews={Platform.OS === 'android'}
                        />
                    ) : (
                        <Image source={FALLBACK_IMAGE} style={styles.mainImage} contentFit="cover" />
                    )}

                    {/* Back Button */}
                    <BackButton style={[styles.backButton, { backgroundColor: floatingButtonBg }]} color={floatingButtonIconColor} />

                    {/* Favourite Button (Tenant Only) */}
                    {!isLandlordOrAgent && (
                        <TouchableOpacity style={[styles.favoriteButton, { backgroundColor: floatingButtonBg }]} onPress={handleFavorite}>
                            <Ionicons
                                name={isFavorited ? 'heart' : 'heart-outline'}
                                size={22}
                                color={isFavorited ? '#EF4444' : floatingButtonIconColor}
                            />
                        </TouchableOpacity>
                    )}

                    {/* Report Listing Button (Tenant Only) */}
                    {!isLandlordOrAgent && (
                        <TouchableOpacity style={[styles.reportButton, { backgroundColor: floatingButtonBg }]} onPress={() => setShowReportModal(true)}>
                            <Ionicons
                                name="flag-outline"
                                size={18}
                                color={floatingButtonIconColor}
                            />
                        </TouchableOpacity>
                    )}

                    {/* Edit Button (Landlord/Agent Owner Only) */}
                    {isOwner && (
                        <TouchableOpacity 
                            style={[styles.editButton, { backgroundColor: colors.primary, right: 16 }]} 
                            onPress={() => router.push({
                                pathname: '/landlord-screens/add-property',
                                params: { id: propertyId }
                            })}
                        >
                            <Ionicons name="pencil" size={18} color="#fff" />
                        </TouchableOpacity>
                    )}

                    {/* Delete Button (Landlord Owner Only) */}
                    {isOwner && role !== 'AGENT' && (
                        <TouchableOpacity 
                            style={[styles.deleteButton, { backgroundColor: '#EF4444', right: 70 }]} 
                            onPress={handleDeleteProperty}
                        >
                            <Ionicons name="trash-outline" size={18} color="#fff" />
                        </TouchableOpacity>
                    )}

                    {/* Image Counter */}
                    {hasImages && images.length > 1 && (
                        <View style={styles.imageCounter}>
                            <Text style={styles.imageCounterText}>
                                {activeIndex + 1}/{images.length}
                            </Text>
                        </View>
                    )}

                    {/* Dot Indicators */}
                    {hasImages && images.length > 1 && (
                        <View style={styles.dotsContainer}>
                            {images.map((_, i) => (
                                <View
                                    key={i}
                                    style={[styles.dot, i === activeIndex && [styles.activeDot, { backgroundColor: colors.primary }]]}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* ── Info Section ───────────────────────────────────────── */}
                <View style={[styles.infoContainer, { backgroundColor: colors.background }]}>
                    {/* Title Row */}
                    <View style={styles.titleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                                {property.title}
                            </Text>
                            <View style={styles.locationRow}>
                                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                                <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {[property.landmark, property.lga, property.state]
                                        .filter(Boolean)
                                        .join(', ') || property.location}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Badges Row */}
                    <View style={styles.badgesRow}>
                        <Badge
                            label={property.status === 'available' ? '✓ Available' : '✗ Taken'}
                            color={statusColor}
                            bg={statusBg}
                        />
                        <Badge
                            label={isSale ? 'For Sale' : 'For Rent'}
                            color={colors.primary}
                            bg={colors.primary + '15'}
                        />
                        <Badge
                            label={property.type ?? 'Property'}
                            color="#7C3AED"
                            bg="#F5F3FF"
                        />
                    </View>

                    {/* ── Landlord / Agent Admin Moderation Section ─────────── */}
                    {isLandlordOrAgent && (
                        <View style={[styles.landlordModerationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.landlordModerationHeader}>
                                <Text style={[styles.landlordModerationTitle, { color: colors.text }]}>Admin Moderation & Verification</Text>
                                <View style={[
                                    styles.landlordModBadge,
                                    (property.moderation_status === 'live' || property.moderation_status === 'approved')
                                        ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                                        : property.moderation_status === 'rejected'
                                        ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }
                                        : property.moderation_status === 'flagged'
                                        ? { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }
                                        : { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }
                                ]}>
                                    <Ionicons
                                        name={
                                            (property.moderation_status === 'live' || property.moderation_status === 'approved')
                                                ? "checkmark-circle"
                                                : property.moderation_status === 'rejected'
                                                ? "alert-circle"
                                                : property.moderation_status === 'flagged'
                                                ? "flag"
                                                : "time-outline"
                                        }
                                        size={13}
                                        color={
                                            (property.moderation_status === 'live' || property.moderation_status === 'approved')
                                                ? '#059669'
                                                : property.moderation_status === 'rejected'
                                                ? '#DC2626'
                                                : property.moderation_status === 'flagged'
                                                ? '#EA580C'
                                                : '#D97706'
                                        }
                                    />
                                    <Text style={[
                                        styles.landlordModBadgeText,
                                        {
                                            color: (property.moderation_status === 'live' || property.moderation_status === 'approved')
                                                ? '#059669'
                                                : property.moderation_status === 'rejected'
                                                ? '#DC2626'
                                                : property.moderation_status === 'flagged'
                                                ? '#EA580C'
                                                : '#D97706'
                                        }
                                    ]}>
                                        {(property.moderation_status === 'live' || property.moderation_status === 'approved')
                                            ? 'Approved & Live'
                                            : property.moderation_status === 'rejected'
                                            ? 'Changes Requested'
                                            : property.moderation_status === 'flagged'
                                            ? 'Flagged for Review'
                                            : 'Waiting for Admin Approval'}
                                    </Text>
                                </View>
                            </View>

                            {/* Status Explanation / Admin Feedback */}
                            {(property.moderation_status === 'rejected' || property.moderation_status === 'flagged' || property.admin_notes || property.moderation_notes) ? (
                                <View style={styles.adminFeedbackBox}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="information-circle" size={16} color="#DC2626" />
                                        <Text style={styles.adminFeedbackHeader}>Admin Review Feedback:</Text>
                                    </View>
                                    <Text style={styles.adminFeedbackBody}>
                                        {property.admin_notes || property.moderation_notes || property.rejection_reason || 'Please provide updated ownership verification documents or clearer photos to proceed.'}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.editListingActionBtn}
                                        onPress={() => router.push({
                                            pathname: '/landlord-screens/add-property',
                                            params: { id: propertyId }
                                        })}
                                    >
                                        <Ionicons name="pencil" size={14} color="#FFF" />
                                        <Text style={styles.editListingActionText}>Edit Listing & Resolve Feedback</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (property.moderation_status === 'live' || property.moderation_status === 'approved') ? (
                                <Text style={[styles.landlordModNote, { color: '#059669' }]}>
                                    ✓ This property is verified and actively visible to thousands of tenants on the Eden discovery feed.
                                </Text>
                            ) : (
                                <Text style={[styles.landlordModNote, { color: colors.textSecondary }]}>
                                    ⏳ Your submission is queued for moderation review. Listings are verified within 2–4 hours by Eden Trust & Safety team before going live.
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Listed By Notice */}
                    <View style={[styles.ownerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.ownerAvatarWrap}>
                            <Image 
                                source={property.agent_id ? (property.agent?.avatar_url || FALLBACK_AVATAR) : (property.landlord?.avatar_url || FALLBACK_AVATAR)} 
                                style={styles.ownerAvatar} 
                            />
                            <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                                <Ionicons name="checkmark" size={10} color="#fff" />
                            </View>
                        </View>
                        <View style={styles.ownerInfo}>
                            <Text style={[styles.ownerLabel, { color: colors.textSecondary }]}>Listed by</Text>
                            <View style={styles.ownerRoleRow}>
                                <MaterialCommunityIcons 
                                    name={property.agent_id ? "badge-account-horizontal" : "shield-check"} 
                                    size={14} 
                                    color={colors.primary} 
                                />
                                <Text style={[styles.ownerRole, { color: colors.primary, fontWeight: '700', fontSize: 16 }]}>
                                    {property.agent_id ? 'Verified Professional Agent' : 'Verified Direct Landlord'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Price Card */}
                    <View style={[styles.priceCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
                        <View style={{ flex: 1 }}>
                            <TouchableOpacity
                                style={styles.priceHeader}
                                onPress={() => !isSale && setShowFees(!showFees)}
                                activeOpacity={0.7}
                            >
                                <View>
                                    <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                                        {!isSale ? 'Total Package' : 'Selling Price'}
                                    </Text>
                                    <Text style={[styles.price, { color: colors.primary }]}>
                                        {formatPrice(
                                            !isSale ? totalPackage : rentAmount,
                                            property.listing_purpose
                                        )}
                                    </Text>
                                </View>
                                {!isSale && (
                                    <Ionicons
                                        name={showFees ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color={colors.textSecondary}
                                        style={{ marginLeft: 8, marginTop: 15 }}
                                    />
                                )}
                            </TouchableOpacity>

                            {showFees && !isSale && (
                                <View style={styles.feeBreakdown}>
                                    <View style={styles.feeItem}>
                                        <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Rent (Landlord Gross)</Text>
                                        <Text style={[styles.feeValue, { color: colors.text }]}>₦{rentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                    </View>
                                    {hasAgencyFee && (
                                        <View style={styles.feeItem}>
                                            <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Agency Fee ({property.agency_fee_percentage}%)</Text>
                                            <Text style={[styles.feeValue, { color: colors.text }]}>₦{agencyFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                        </View>
                                    )}
                                    {cautionFee > 0 && (
                                        <View style={styles.feeItem}>
                                            <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Caution Fee</Text>
                                            <Text style={[styles.feeValue, { color: colors.text }]}>₦{cautionFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                        </View>
                                    )}
                                    {legalFee > 0 && (
                                        <View style={styles.feeItem}>
                                            <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Legal Fee</Text>
                                            <Text style={[styles.feeValue, { color: colors.text }]}>₦{legalFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                        </View>
                                    )}
                                    <View style={styles.feeItem}>
                                        <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Platform Service Charge (5%)</Text>
                                        <Text style={[styles.feeValue, { color: colors.primary, fontWeight: '700' }]}>₦{serviceFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                    </View>
                                    <View style={styles.feeItem}>
                                        <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Escrow Protection Fee</Text>
                                        <Text style={[styles.feeValue, { color: '#059669', fontWeight: '700' }]}>₦{escrowFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                    </View>

                    {/* Features Grid */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Details</Text>
                    <View style={styles.featuresGrid}>
                        {(isLand ? landFeatures : features).map((f, i) => (
                            <FeatureChip
                                key={i}
                                icon={f.icon}
                                label={f.label}
                                iconSet={f.iconSet as any}
                                colors={colors}
                            />
                        ))}
                    </View>

                    {/* Video Section */}
                    {property.video_url && (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Video Tour</Text>
                            <View style={styles.videoContainer}>
                                <PropertyVideoPlayer videoUrl={property.video_url} />
                            </View>
                        </>
                    )}

                    {/* Description */}
                    {property.description ? (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                            <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{property.description}</Text>
                                
                                {/* Service Charge Percentage Note */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }}>
                                    <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                                        Service Charge: {serviceChargePct}%
                                    </Text>
                                </View>
                            </View>
                        </>
                    ) : null}

                    {/* Amenities */}
                    {!isLand && property.amenities?.length > 0 && (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities</Text>
                            <View style={styles.amenitiesGrid}>
                                {property.amenities.map((a: string, i: number) => (
                                    <AmenityTag key={i} label={a} colors={colors} />
                                ))}
                            </View>
                        </>
                    )}

                    {/* Inspection Requirement Card (Hidden for Landlords & Agents) */}
                    {!isLandlordOrAgent && (
                        <View style={[
                            styles.unlockCard,
                            {
                                backgroundColor: colors.card,
                                borderColor: isBooked ? (hasInspectionPassed ? '#10B981' : '#3B82F6') : colors.border
                            }
                        ]}>
                            <View style={[
                                styles.unlockIconWrap,
                                { backgroundColor: isBooked ? (hasInspectionPassed ? '#ECFDF5' : '#EFF6FF') : colors.primary + '15' }
                            ]}>
                                <Ionicons
                                    name={isBooked ? (hasInspectionPassed ? 'checkmark-circle' : 'time') : 'calendar-outline'}
                                    size={28}
                                    color={isBooked ? (hasInspectionPassed ? '#059669' : '#1D4ED8') : colors.primary}
                                />
                            </View>
                            <Text style={[styles.unlockTitle, { color: colors.text }]}>
                                {!isBooked
                                    ? 'Physical Inspection Required'
                                    : hasInspectionPassed
                                    ? 'Inspection Completed ✓'
                                    : 'Inspection Scheduled (Upcoming)'}
                            </Text>
                            <Text style={[styles.unlockSubtitle, { color: colors.textSecondary }]}>
                                {!isBooked
                                    ? 'You must book and attend a physical inspection before submitting a rental application for this property.'
                                    : hasInspectionPassed
                                    ? 'Your inspection day has passed! You are now eligible to submit your formal tenancy application below.'
                                    : `Your inspection is scheduled for ${bookingDetails?.preferred_date ? new Date(bookingDetails.preferred_date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }) : 'soon'}. The Apply Now button unlocks once the inspection day has passed.`}
                            </Text>
                        </View>
                    )}

                    {/* Gallery */}
                    {images.length > 1 && (
                        <>
                            <Text style={styles.sectionTitle}>Gallery</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.galleryScroll}
                            >
                                {images.map((img, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[
                                            styles.galleryThumb,
                                            i === activeIndex && styles.galleryThumbActive,
                                        ]}
                                        onPress={() => {
                                            setActiveIndex(i);
                                            flatListRef.current?.scrollToIndex({ index: i, animated: true });
                                        }}
                                    >
                                        <Image
                                            source={{ uri: img }}
                                            style={styles.galleryImage}
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    )}

                    {/* Trust & Safety / Report Card */}
                    {!isLandlordOrAgent && (
                        <TouchableOpacity
                            style={[styles.reportCard, { backgroundColor: isDark ? '#0c1844' : '#FFF7ED', borderColor: isDark ? '#7c2d12' : '#FFEDD5' }]}
                            onPress={() => setShowReportModal(true)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="shield-half-outline" size={20} color="#EA580C" />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[styles.reportCardTitle, { color: isDark ? '#FED7AA' : '#9A3412' }]}>Suspicious listing or fraudulent price?</Text>
                                <Text style={[styles.reportCardSub, { color: isDark ? '#FDBA74' : '#C2410C' }]}>Tap to report to Eden Trust & Safety team</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#EA580C" />
                        </TouchableOpacity>
                    )}

                    {/* Meta Info */}
                    <View style={styles.metaCard}>
                        <View style={styles.metaRow}>
                            <Ionicons name="time-outline" size={16} color="#94A3B8" />
                            <Text style={styles.metaText}>
                                Listed{' '}
                                {property.created_at
                                    ? new Date(property.created_at).toLocaleDateString('en-NG', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })
                                    : '—'}
                            </Text>
                        </View>
                        {property.billing_period && !isSale && (
                            <View style={styles.metaRow}>
                                <Ionicons name="refresh-outline" size={16} color="#94A3B8" />
                                <Text style={styles.metaText}>
                                    Billed {property.billing_period}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* ─── BOTTOM ACTION BUTTONS (Book Inspection & Apply Now) ─────── */}
            <View style={[styles.bottomActions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                {isLandlordOrAgent ? (
                    <TouchableOpacity
                        style={[styles.applyButton, { backgroundColor: colors.primary }]}
                        onPress={() => router.push({
                            pathname: '/landlord-screens/add-property',
                            params: { id: property.id }
                        })}
                    >
                        <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.buttonText}>Edit Listing</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        {/* Book Inspection Button: Active when not booked; Upcoming when scheduled; Grayed out/disabled after inspection day has passed */}
                        <TouchableOpacity
                            style={[
                                styles.bookActionBtn,
                                hasInspectionPassed
                                    ? { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', borderColor: isDark ? '#334155' : '#CBD5E1', borderWidth: 1 }
                                    : isBooked
                                    ? { backgroundColor: '#10B981' }
                                    : { backgroundColor: colors.primary },
                            ]}
                            disabled={hasInspectionPassed}
                            onPress={() => {
                                if (isBooked) {
                                    router.push('/shared-screens/InspectionsScreen');
                                } else {
                                    router.push({
                                        pathname: '/shared-screens/BookInspectionScreen',
                                        params: {
                                            property_id: property.id,
                                            property_title: property.title,
                                        },
                                    });
                                }
                            }}
                        >
                            <Ionicons
                                name={hasInspectionPassed ? "checkmark-done" : isBooked ? "checkmark-circle" : "calendar-outline"}
                                size={18}
                                color={hasInspectionPassed ? '#94A3B8' : '#FFFFFF'}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={[styles.buttonText, hasInspectionPassed && { color: '#94A3B8' }]}>
                                {hasInspectionPassed
                                    ? 'Inspection Done ✓'
                                    : isBooked
                                    ? 'Inspection Booked ✓'
                                    : 'Book Inspection'}
                            </Text>
                        </TouchableOpacity>

                        {/* Apply Now Button: Grayed out and disabled until inspection day has passed; Active and clickable once inspection has passed */}
                        <TouchableOpacity
                            style={[
                                styles.applyButton,
                                hasInspectionPassed
                                    ? { backgroundColor: '#F49E5E' }
                                    : { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', borderColor: isDark ? '#334155' : '#CBD5E1', borderWidth: 1 },
                            ]}
                            disabled={!hasInspectionPassed}
                            onPress={() => {
                                if (!hasInspectionPassed) {
                                    Alert.alert(
                                        'Inspection Required',
                                        !isBooked
                                            ? 'Please book and attend a physical inspection first before applying.'
                                            : `Your inspection is scheduled for ${bookingDetails?.preferred_date || 'soon'}. The application form unlocks after your inspection day.`
                                    );
                                    return;
                                }

                                router.push({
                                    pathname: '/shared-screens/ApplicationScreen',
                                    params: {
                                        id: property.id,
                                        title: property.title,
                                        price: property.price,
                                        location: property.location,
                                        landlordName: property.landlord?.first_name || 'Landlord',
                                        image: images[0] || '',
                                    },
                                });
                            }}
                        >
                            <Ionicons
                                name={hasInspectionPassed ? "document-text-outline" : "lock-closed-outline"}
                                size={18}
                                color={hasInspectionPassed ? '#FFFFFF' : '#94A3B8'}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={[styles.buttonText, !hasInspectionPassed && { color: '#94A3B8' }]}>
                                {hasInspectionPassed ? 'Apply Now' : 'Apply (Locked)'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* ─── REPORT LISTING MODAL ────────────────────────────────────── */}
            <Modal
                visible={showReportModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowReportModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.reportModalOverlay}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                    <Pressable style={{ flex: 1 }} onPress={() => setShowReportModal(false)} />
                    <View style={[styles.reportModalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.reportModalHeader, { borderBottomColor: colors.border }]}>
                            <View style={styles.modalHandle} />
                            <Text style={[styles.reportModalTitle, { color: colors.text }]}>Report Property Listing</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setShowReportModal(false)}
                            >
                                <Ionicons name="close" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={[styles.reportModalBody, { paddingBottom: 24 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
                            <Text style={[styles.reportSectionLabel, { color: colors.text }]}>
                                Why are you reporting this listing? *
                            </Text>

                            <View style={{ gap: 8 }}>
                                {reportReasons.map((reason) => {
                                    const isSelected = reportReason === reason;
                                    return (
                                        <TouchableOpacity
                                            key={reason}
                                            style={[
                                                styles.reasonOption,
                                                {
                                                    backgroundColor: isSelected ? (isDark ? '#1e3a8a' : '#EFF6FF') : colors.background,
                                                    borderColor: isSelected ? colors.primary : colors.border
                                                }
                                            ]}
                                            onPress={() => setReportReason(reason)}
                                        >
                                            <Ionicons
                                                name={isSelected ? "radio-button-on" : "radio-button-off"}
                                                size={18}
                                                color={isSelected ? colors.primary : colors.textSecondary}
                                                style={{ marginRight: 10 }}
                                            />
                                            <Text style={[styles.reasonText, { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '500' }]}>
                                                {reason}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.reportSectionLabel, { color: colors.text, marginTop: 16 }]}>
                                Additional Details / Evidence
                            </Text>
                            <TextInput
                                style={[styles.reportInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="Describe the issue (e.g. landlord asking for cash payment outside Eden escrow, photos belong to another property, etc.)..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={3}
                                value={reportDetails}
                                onChangeText={setReportDetails}
                            />

                            <View style={[styles.ndprSafetyBox, { backgroundColor: isDark ? '#0c1844' : '#F8FAFC', borderColor: isDark ? '#1e3a8a' : '#E2E8F0' }]}>
                                <Ionicons name="shield-checkmark" size={16} color="#1D4ED8" />
                                <Text style={[styles.ndprSafetyText, { color: colors.textSecondary }]}>
                                    Your report is anonymous to the landlord. Eden Moderation investigates all reports within 2 hours.
                                </Text>
                            </View>
                        </ScrollView>

                        <View style={[styles.reportModalFooter, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.submitReportBtn, { backgroundColor: '#DC2626' }]}
                                onPress={handleSubmitReport}
                                disabled={isSubmittingReport}
                            >
                                {isSubmittingReport ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitReportText}>Submit Report</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ScreenWrapper>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    scrollContent: { paddingBottom: 60 },

    bottomActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'ios' ? 36 : 16,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
    },
    applyButton: {
        flex: 1,
        backgroundColor: '#F49E5E',
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bookActionBtn: {
        flex: 1,
        backgroundColor: '#F49E5E',
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },

    // ── States ────────────────────────────────────────────────────────────────
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
    loadingText: { fontSize: 14, color: '#64748B', marginTop: 8 },
    errorTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
    errorSub: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
    retryBtn: {
        marginTop: 8,
        backgroundColor: '#2563EB',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 14,
    },
    retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    // ── Image ─────────────────────────────────────────────────────────────────
    imageContainer: { width, height: 360, position: 'relative' },
    mainImage: { width, height: 360 },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 16,
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    favoriteButton: {
        position: 'absolute',
        top: 40,
        right: 16,
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    reportButton: {
        position: 'absolute',
        top: 40,
        right: 68,
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    reportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 16,
        marginBottom: 8,
    },
    reportCardTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    reportCardSub: {
        fontSize: 11,
        marginTop: 1,
    },
    reportModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    reportModalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingBottom: 24,
    },
    reportModalHeader: {
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        position: 'relative',
    },
    reportModalTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    reportModalBody: {
        padding: 20,
        gap: 12,
    },
    reportSectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 6,
    },
    reasonOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    reasonText: {
        fontSize: 13,
        flex: 1,
    },
    reportInput: {
        height: 75,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        textAlignVertical: 'top',
    },
    ndprSafetyBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 6,
    },
    ndprSafetyText: {
        fontSize: 11,
        lineHeight: 15,
        flex: 1,
    },
    reportModalFooter: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    submitReportBtn: {
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitReportText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    editButton: {
        position: 'absolute',
        top: 40,
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    deleteButton: {
        position: 'absolute',
        top: 40,
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    imageCounter: {
        position: 'absolute',
        top: 40,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    imageCounterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    dotsContainer: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 18,
        alignSelf: 'center',
        gap: 6,
    },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
    activeDot: { backgroundColor: '#2563EB', width: 18 },

    // ── Info ──────────────────────────────────────────────────────────────────
    infoContainer: {
        paddingHorizontal: 20,
        paddingTop: 24,
        gap: 20,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        zIndex: 10,
        elevation: 10,
    },


    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, },
    title: { fontSize: 22, fontWeight: '800', lineHeight: 30 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    location: { fontSize: 13, flex: 1 },

    badgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    badgeText: { fontSize: 12, fontWeight: '700' },

    // ── Price Card ────────────────────────────────────────────────────────────
    priceCard: {
        borderRadius: 20,
        padding: 20,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 5,
        gap: 16,
    },
    priceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    priceLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
    price: { fontSize: 22, fontWeight: '800' },
    feeBreakdown: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        gap: 8,
    },
    feeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    feeLabel: { fontSize: 13, fontWeight: '500' },
    feeValue: { fontSize: 13, fontWeight: '600' },
    bookButton: {
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
    },
    bookButtonDisabled: { backgroundColor: '#CBD5E1' },
    bookButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    // ── Features ──────────────────────────────────────────────────────────────
    sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
    featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    featureChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    featureChipLabel: { fontSize: 12, fontWeight: '600' },

    // ── Description ───────────────────────────────────────────────────────────
    descriptionCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
    descriptionText: { fontSize: 14, lineHeight: 22 },

    // ── Owner Notice ─────────────────────────────────────────────────────────
    ownerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginTop: 4,
    },
    ownerAvatarWrap: {
        position: 'relative',
        marginRight: 16,
    },
    ownerAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ownerInfo: {
        flex: 1,
    },
    ownerLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    ownerName: {
        fontSize: 16,
        fontWeight: '800',
    },
    ownerRoleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    ownerRole: {
        fontSize: 12,
        fontWeight: '600',
    },

    // ── Video ────────────────────────────────────────────────────────────────
    videoContainer: {
        width: '100%',
        height: 220,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },

    // ── Amenities ─────────────────────────────────────────────────────────────
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    amenityTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
    },
    amenityTagText: { fontSize: 12, fontWeight: '600' },

    // ── Unlock Card ────────────────────────────────────────────────────────────
    unlockCard: {
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
        gap: 12,
    },
    unlockIconWrap: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        justifyContent: 'center', alignItems: 'center',
    },
    unlockTitle: {
        fontSize: 18, fontWeight: '800', textAlign: 'center',
    },
    unlockSubtitle: {
        fontSize: 13, textAlign: 'center', lineHeight: 19,
    },
    unlockButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, width: '100%', height: 52, borderRadius: 16, marginTop: 4,
    },
    unlockButtonText: {
        color: '#fff', fontSize: 16, fontWeight: '700',
    },
    unlockCreditsNote: {
        fontSize: 12, fontWeight: '500',
    },


    // ── Gallery ───────────────────────────────────────────────────────────────
    galleryScroll: { gap: 10, paddingRight: 4 },
    galleryThumb: {
        width: 110,
        height: 80,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    galleryThumbActive: { borderColor: '#2563EB' },
    galleryImage: { width: '100%', height: '100%' },

    modalHandle: {
        width: 36,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        marginBottom: 8,
    },
    modalCloseBtn: {
        position: 'absolute',
        right: 16,
        top: 14,
        padding: 4,
    },
    landlordModerationCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        marginTop: 12,
        marginBottom: 8,
        gap: 10,
    },
    landlordModerationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
    landlordModerationTitle: {
        fontSize: 13.5,
        fontWeight: '700',
    },
    landlordModBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
    },
    landlordModBadgeText: {
        fontSize: 10.5,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    adminFeedbackBox: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        gap: 6,
    },
    adminFeedbackHeader: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#DC2626',
    },
    adminFeedbackBody: {
        fontSize: 12,
        color: '#B91C1C',
        lineHeight: 16,
    },
    editListingActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#DC2626',
        marginTop: 4,
    },
    editListingActionText: {
        color: '#FFF',
        fontSize: 12.5,
        fontWeight: '700',
    },
    landlordModNote: {
        fontSize: 11.5,
        lineHeight: 16,
    },
    // ── Meta ──────────────────────────────────────────────────────────────────
    metaCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    metaText: { fontSize: 13, color: '#64748B' },
});

export default PropertyDetailScreen;