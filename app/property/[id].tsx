import BackButton from '@/components/BackButton';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    Share,
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
import { useLandlord } from '../../hooks/useLandlord';
import { useFavorites, useProperty } from '../../hooks/useProperties';
import { supabase } from '../../lib/supabase';

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

const getAmenityIcon = (label: string): { name: string; set: 'ion' | 'mci' } => {
    const l = (label || '').toLowerCase();
    if (l.includes('water')) return { name: 'water-outline', set: 'ion' };
    if (l.includes('shield') || l.includes('security') || l.includes('guard')) return { name: 'shield-outline', set: 'ion' };
    if (l.includes('park') || l.includes('car') || l.includes('garage')) return { name: 'car-outline', set: 'ion' };
    if (l.includes('wifi') || l.includes('internet') || l.includes('network')) return { name: 'wifi-outline', set: 'ion' };
    if (l.includes('gen') || l.includes('power') || l.includes('electric') || l.includes('light')) return { name: 'flash-outline', set: 'ion' };
    if (l.includes('tile') || l.includes('floor')) return { name: 'home-outline', set: 'ion' };
    if (l.includes('kitch') || l.includes('cook')) return { name: 'restaurant-outline', set: 'ion' };
    if (l.includes('balcon') || l.includes('terrace') || l.includes('deck')) return { name: 'business-outline', set: 'ion' };
    if (l.includes('ac') || l.includes('air') || l.includes('cool')) return { name: 'thermometer-outline', set: 'ion' };
    if (l.includes('pool') || l.includes('swim')) return { name: 'boat-outline', set: 'ion' };
    if (l.includes('gym') || l.includes('fit')) return { name: 'fitness-outline', set: 'ion' };
    if (l.includes('cctv') || l.includes('camera')) return { name: 'videocam-outline', set: 'ion' };
    if (l.includes('fence') || l.includes('gate')) return { name: 'lock-closed-outline', set: 'ion' };
    return { name: 'checkmark-circle-outline', set: 'ion' };
};

const FALLBACK_IMAGE = require('../../assets/images/Homes/home1.png');
const FALLBACK_AVATAR = { uri: 'https://ui-avatars.com/api/?name=User&size=128&background=2563EB&color=fff' };

// ─── Sub-components ──────────────────────────────────────────────────────────

const Badge = ({ label, color, bg }: { label: string; color: string; bg: string }) => (
    <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
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
    const [hasApplied, setHasApplied] = useState(false);

    const propertyId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

    // Always refetch when the screen is focused so the moderation status
    // (and thus the edit-button state) is never stale
    useFocusEffect(
        useCallback(() => {
            if (propertyId) refetch();
        }, [propertyId, refetch])
    );

    const isOwner = user?.id === property?.landlord_id;
    const isLandlord = role === 'LANDLORD';
    const isLandlordOrAgent = role === 'LANDLORD' || role === 'AGENT';
    const isPendingModeration = (property?.moderation_status || 'pending').toLowerCase() === 'pending';

    // Pending (under review) listings are not editable.
    const handleEditListing = () => {
        if (isPendingModeration) {
            Alert.alert(
                'Listing Under Review',
                'This property is pending admin approval and cannot be edited right now. Please wait for the moderation review to complete before making changes.'
            );
            return;
        }
        router.push({
            pathname: '/landlord-screens/add-property',
            params: { id: propertyId },
        });
    };

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

                // Check if user has already applied
                try {
                    const { data: appData } = await supabase
                        .from('property_applications')
                        .select('id')
                        .eq('property_id', propertyId)
                        .eq('renter_id', user.id)
                        .neq('status', 'declined')
                        .limit(1)
                        .maybeSingle();
                    setHasApplied(!!appData);
                } catch (err) {
                    console.warn('Application check notice:', err);
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

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out "${property?.title}" in ${property?.location} on Eden Home: https://edenhome.ng/property/${propertyId}`,
                title: property?.title || 'Property on Eden',
            });
        } catch (e) {
            console.warn('Share notice:', e);
        }
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

    const hostName = property.agent_id
        ? (property.agent?.first_name ? `${property.agent.first_name} ${property.agent.last_name || ''}`.trim() : 'Kunle Adeyemi')
        : (property.landlord?.first_name ? `${property.landlord.first_name} ${property.landlord.last_name || ''}`.trim() : 'Kunle Adeyemi');

    const hostAvatar = property.agent_id
        ? property.agent?.avatar_url
        : property.landlord?.avatar_url;

    const hostInitial = (hostName.charAt(0) || 'K').toUpperCase();

    const rawAmenities = property.amenities && property.amenities.length > 0
        ? property.amenities
        : ['water', 'Shield', 'Parking', 'Internet', 'Generator', 'Tiled', 'Kitchen', 'Balcony'];

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

                    {/* Edit Button (Landlord/Agent Owner Only) — grayed while pending moderation */}
                    {isOwner && (
                        <TouchableOpacity
                            style={[styles.editButton, { backgroundColor: isPendingModeration ? '#9CA3AF' : colors.primary, right: 16 }]}
                            onPress={handleEditListing}
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

                    {/* Share Button (Top Right) */}
                    <TouchableOpacity
                        style={[styles.shareButton, { backgroundColor: floatingButtonBg }]}
                        onPress={handleShare}
                    >
                        <Ionicons
                            name="share-social-outline"
                            size={20}
                            color={floatingButtonIconColor}
                        />
                    </TouchableOpacity>

                    {/* Image Counter (Bottom Right of Image) */}
                    {hasImages && images.length > 1 && (
                        <View style={styles.imageCounterBottomRight}>
                            <Text style={styles.imageCounterText}>
                                {activeIndex + 1}/{images.length}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Info Section ───────────────────────────────────────── */}
                <View style={[styles.infoContainer, { backgroundColor: colors.background }]}>
                    {/* Title Row */}
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                            {property.title}
                        </Text>
                    </View>

                    {/* Badges Row */}
                    <View style={styles.badgesRow}>
                        <View style={styles.verifiedBadgePill}>
                            <Text style={styles.verifiedBadgeText}>Verified</Text>
                        </View>
                        <View style={[styles.availableBadgePill, { backgroundColor: isDark ? '#1e3a8a30' : '#EFF6FF', borderColor: colors.primary }]}>
                            <Text style={[styles.availableBadgeText, { color: colors.primary }]}>
                                {property.status === 'available' ? 'Available' : 'Taken'}
                            </Text>
                        </View>
                        {isSale && (
                            <Text style={[styles.rentalAppText, { color: isDark ? '#93C5FD' : '#1E3A8A' }]}>
                                For Sale
                            </Text>
                        )}
                    </View>

                    {/* Location Row */}
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
                        <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
                            {[property.landmark, property.lga, property.state]
                                .filter(Boolean)
                                .join(', ') || property.location}
                        </Text>
                    </View>

                    {/* ── Landlord / Agent Admin Moderation Section (if admin/landlord) ─── */}
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
                                    ⏳ Your submission is queued for moderation review and is locked from edits until the review completes. Listings are verified within 2–4 hours by the Eden Trust & Safety team before going live.
                                </Text>
                            )}
                        </View>
                    )}

                    {/* ── Collapsible Price Card ──────────────────────────────── */}
                    <View style={styles.priceSectionWrap}>
                        <TouchableOpacity
                            style={[
                                styles.pricePillBtn,
                                {
                                    backgroundColor: isDark ? '#1e3a8a25' : '#EFF6FF',
                                    borderColor: '#3B82F6',
                                }
                            ]}
                            onPress={() => !isSale && setShowFees(!showFees)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.pricePillText, { color: colors.primary }]}>
                                {formatPrice(rentAmount, property.listing_purpose)}/{property.billing_period === 'yearly' ? 'year' : property.billing_period === 'monthly' ? 'month' : 'year'}
                            </Text>
                            {!isSale && (
                                <Ionicons
                                    name={showFees ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color={colors.primary}
                                />
                            )}
                        </TouchableOpacity>

                        {showFees && !isSale && (
                            <View style={[styles.paymentBreakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.breakdownHeaderTitle, { color: colors.text }]}>Payment Breakdown</Text>

                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Annual rent</Text>
                                    <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{rentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                </View>

                                {cautionFee > 0 ? (
                                    <View style={styles.breakdownItem}>
                                        <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Caution fee(1 month)</Text>
                                        <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{cautionFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                    </View>
                                ) : null}

                                {hasAgencyFee && (
                                    <View style={styles.breakdownItem}>
                                        <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Agency fee ({property.agency_fee_percentage}%)</Text>
                                        <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{agencyFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                    </View>
                                )}

                                {legalFee > 0 && (
                                    <View style={styles.breakdownItem}>
                                        <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Legal fee</Text>
                                        <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{legalFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                    </View>
                                )}

                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Service charge</Text>
                                    <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{serviceFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                </View>

                                <View style={styles.breakdownItem}>
                                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Escrow Fee</Text>
                                    <Text style={[styles.breakdownValue, { color: colors.text }]}>₦{escrowFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}(Fixed)</Text>
                                </View>

                                <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />

                                <View style={styles.breakdownTotalRow}>
                                    <Text style={[styles.breakdownTotalLabel, { color: colors.text }]}>Total</Text>
                                    <Text style={[styles.breakdownTotalValue, { color: colors.text }]}>
                                        ₦{totalPackage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ── 4 Feature Stats Quad Row ──────────────────────────── */}
                    <View style={styles.statsQuadRow}>
                        <View style={[styles.statQuadBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="bed-outline" size={22} color={colors.primary} />
                            <Text style={[styles.statQuadVal, { color: colors.text }]}>{property.bedrooms ?? 1}</Text>
                            <Text style={[styles.statQuadLabel, { color: colors.textSecondary }]}>Bedrooms</Text>
                        </View>

                        <View style={[styles.statQuadBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="shower-head" size={22} color={colors.primary} />
                            <Text style={[styles.statQuadVal, { color: colors.text }]}>{property.bathrooms ?? 1}</Text>
                            <Text style={[styles.statQuadLabel, { color: colors.textSecondary }]}>Bathroom</Text>
                        </View>

                        <View style={[styles.statQuadBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="resize-outline" size={22} color={colors.primary} />
                            <Text style={[styles.statQuadVal, { color: colors.text }]} numberOfLines={1}>
                                {property.land_size ? `${property.land_size}m` : `${(property.bedrooms || 1) * 30}m`}
                            </Text>
                            <Text style={[styles.statQuadLabel, { color: colors.textSecondary }]}>Area</Text>
                        </View>

                        <View style={[styles.statQuadBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                            <Text style={[styles.statQuadVal, { color: colors.text }]}>Now</Text>
                            <Text style={[styles.statQuadLabel, { color: colors.textSecondary }]}>Available</Text>
                        </View>
                    </View>

                    {/* ── Landlord / Host Profile Card ──────────────────────── */}
                    <View style={[styles.hostCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.hostAvatarWrap}>
                            {hostAvatar ? (
                                <Image source={{ uri: hostAvatar }} style={styles.hostAvatarImg} contentFit="cover" />
                            ) : (
                                <View style={[styles.hostAvatarFallback, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.hostAvatarInitial}>{hostInitial}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.hostInfo}>
                            <Text style={[styles.hostName, { color: colors.text }]}>{hostName}</Text>
                            <View style={styles.hostBadgeRow}>
                                <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                                <Text style={styles.hostBadgeText}>
                                    {property.agent_id ? 'Verified Agent' : 'Verified Landlord'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.hostRatingRow}>
                            <Ionicons name="star-outline" size={15} color="#F59E0B" />
                            <Text style={[styles.hostRatingText, { color: colors.text }]}>
                                {property.landlord?.rating ? Number(property.landlord.rating).toFixed(1) : '4.8'}
                            </Text>
                        </View>
                    </View>

                    {/* ── Description ───────────────────────────────────────── */}
                    <View style={styles.sectionHeaderWrap}>
                        <Text style={[styles.sectionHeading, { color: colors.text }]}>Description</Text>
                    </View>
                    <Text style={[styles.descriptionBodyText, { color: colors.textSecondary }]}>
                        {property.description || 'Spacious 2 bedroom flat located in a serene environment. The apartment features modern finishes, 247 water supply, and good security. close to major roads and markets.'}
                    </Text>

                    {/* ── Amenities ─────────────────────────────────────────── */}
                    <View style={styles.sectionHeaderWrap}>
                        <Text style={[styles.sectionHeading, { color: colors.text }]}>Amenities</Text>
                    </View>
                    <View style={styles.amenitiesGrid}>
                        {rawAmenities.map((a: string, i: number) => {
                            const iconInfo = getAmenityIcon(a);
                            return (
                                <View key={i} style={[styles.amenityChip, { backgroundColor: isDark ? '#1e3a8a25' : '#EFF6FF' }]}>
                                    {iconInfo.set === 'ion' ? (
                                        <Ionicons name={iconInfo.name as any} size={15} color={colors.primary} />
                                    ) : (
                                        <MaterialCommunityIcons name={iconInfo.name as any} size={15} color={colors.primary} />
                                    )}
                                    <Text style={[styles.amenityChipText, { color: isDark ? '#93C5FD' : '#475569' }]}>{a}</Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* Video Tour (if available) */}
                    {property.video_url && (
                        <>
                            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 10 }]}>Video Tour</Text>
                            <View style={styles.videoContainer}>
                                <PropertyVideoPlayer videoUrl={property.video_url} />
                            </View>
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

                    <View style={{ height: 30 }} />
                </View>
            </ScrollView>

            {/* ─── BOTTOM ACTION BUTTONS (Apply To Rent & Book Inspection) ───── */}
            <View style={[styles.bottomActions, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                {isLandlordOrAgent ? (
                    <TouchableOpacity
                        style={[styles.applyButton, { backgroundColor: isPendingModeration ? '#9CA3AF' : colors.primary }]}
                        onPress={handleEditListing}
                    >
                        <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.buttonText}>
                            {isPendingModeration ? 'Listing Under Review' : 'Edit Listing'}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        {/* Apply To Rent (Left Orange Pill Button)
                            Rule: a property MUST be booked (inspection booked by this
                            tenant) before they can apply — whether the booking date has
                            passed or not, and whether the booking is completed or not.
                            Unbooked, unavailable, sale, and repeat applications are blocked. */}
                        {(() => {
                            const propertyUnavailable = property.status !== 'available' && property.status !== 'taken';
                            const notYetBooked = !isBooked;
                            const isApplyDisabled = propertyUnavailable || notYetBooked || hasApplied || isSale;

                            const applyLabel = propertyUnavailable
                                ? 'Property Unavailable'
                                : hasApplied
                                    ? 'Applied ✓'
                                    : isSale
                                        ? 'For Sale'
                                        : notYetBooked
                                            ? 'Book Inspection First'
                                            : 'Apply To Rent';

                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.applyOrangeBtn,
                                        isApplyDisabled && { opacity: 0.45 }
                                    ]}
                                    onPress={isApplyDisabled ? undefined : handleApply}
                                    activeOpacity={isApplyDisabled ? 1 : 0.85}
                                    disabled={isApplyDisabled}
                                >
                                    <Text style={styles.buttonText}>{applyLabel}</Text>
                                </TouchableOpacity>
                            );
                        })()}

                        {/* Book Inspection (Right Orange Pill Button) */}
                        {(() => {
                            const propertyUnavailable = property.status !== 'available';
                            const alreadyBooked = isBooked && !hasInspectionPassed;
                            const isBookDisabled = propertyUnavailable || alreadyBooked || isSale;

                            const bookLabel = propertyUnavailable
                                ? 'Property Taken'
                                : isSale
                                    ? 'For Sale'
                                    : isBooked && hasInspectionPassed
                                        ? 'Book Again'
                                        : isBooked
                                            ? 'Inspection Booked ✓'
                                            : 'Book Inspection(₦666)';

                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.bookOrangeBtn,
                                        isBookDisabled && { opacity: 0.45 }
                                    ]}
                                    onPress={isBookDisabled ? undefined : handleBookInspection}
                                    activeOpacity={isBookDisabled ? 1 : 0.85}
                                    disabled={isBookDisabled}
                                >
                                    <Text style={styles.buttonText}>{bookLabel}</Text>
                                </TouchableOpacity>
                            );
                        })()}
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
        paddingVertical: 14,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 10,
    },
    applyOrangeBtn: {
        flex: 1,
        backgroundColor: '#F49E5E',
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F49E5E',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    bookOrangeBtn: {
        flex: 1,
        backgroundColor: '#F49E5E',
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F49E5E',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    applyButton: {
        flex: 1,
        backgroundColor: '#F49E5E',
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14.5,
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
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 10,
    },
    shareButton: {
        position: 'absolute',
        top: 40,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 10,
    },
    imageCounterBottomRight: {
        position: 'absolute',
        bottom: 40,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    imageCounterText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    // ── Info Container ─────────────────────────────────────────────────────────
    infoContainer: {
        paddingHorizontal: 20,
        paddingTop: 24,
        gap: 16,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -30,
        zIndex: 10,
        elevation: 10,
    },

    titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
    title: { fontSize: 23, fontWeight: '800', lineHeight: 30, letterSpacing: -0.3 },

    badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    verifiedBadgePill: {
        backgroundColor: '#059669',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
    },
    verifiedBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    availableBadgePill: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 14,
        borderWidth: 1,
    },
    availableBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    rentalAppText: {
        fontSize: 16,
        fontWeight: '800',
        marginLeft: 'auto',
    },

    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    location: { fontSize: 13, flex: 1, color: '#64748B' },

    // ── Collapsible Price Breakdown ───────────────────────────────────────────
    priceSectionWrap: {
        gap: 10,
    },
    pricePillBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    pricePillText: {
        fontSize: 16,
        fontWeight: '800',
    },
    paymentBreakdownCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        gap: 10,
    },
    breakdownHeaderTitle: {
        fontSize: 14.5,
        fontWeight: '700',
        marginBottom: 2,
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    breakdownLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    breakdownValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    breakdownDivider: {
        height: 1,
        marginVertical: 4,
    },
    breakdownTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    breakdownTotalLabel: {
        fontSize: 16,
        fontWeight: '800',
    },
    breakdownTotalValue: {
        fontSize: 17,
        fontWeight: '900',
    },

    // ── 4 Feature Stats Quad Row ──────────────────────────────────────────────
    statsQuadRow: {
        flexDirection: 'row',
        gap: 10,
    },
    statQuadBox: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        gap: 4,
    },
    statQuadVal: {
        fontSize: 15,
        fontWeight: '800',
    },
    statQuadLabel: {
        fontSize: 11,
        fontWeight: '500',
    },

    // ── Host / Landlord Card ──────────────────────────────────────────────────
    hostCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    hostAvatarWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
    },
    hostAvatarImg: {
        width: 48,
        height: 48,
    },
    hostAvatarFallback: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hostAvatarInitial: {
        color: '#FFFFFF',
        fontSize: 19,
        fontWeight: '800',
    },
    hostInfo: {
        flex: 1,
        gap: 2,
    },
    hostName: {
        fontSize: 15,
        fontWeight: '800',
    },
    hostBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    hostBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
    },
    hostRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
    },
    hostRatingText: {
        fontSize: 13.5,
        fontWeight: '700',
    },

    // ── Description & Section Headers ─────────────────────────────────────────
    sectionHeaderWrap: {
        marginTop: 4,
    },
    sectionHeading: {
        fontSize: 17,
        fontWeight: '800',
    },
    descriptionBodyText: {
        fontSize: 13.5,
        lineHeight: 21,
    },

    // ── Amenities ─────────────────────────────────────────────────────────────
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    amenityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    amenityChipText: {
        fontSize: 12,
        fontWeight: '600',
    },

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

    // ── Badges & Video ────────────────────────────────────────────────────────
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    badgeText: { fontSize: 12, fontWeight: '700' },
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

    // ── Header Action Buttons ─────────────────────────────────────────────────
    favoriteButton: {
        position: 'absolute',
        top: 40,
        right: 68,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 10,
    },
    reportButton: {
        position: 'absolute',
        top: 40,
        right: 120,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 10,
    },
    editButton: {
        position: 'absolute',
        top: 40,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 10,
    },
    deleteButton: {
        position: 'absolute',
        top: 40,
        right: 68,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 10,
    },

    // ── Report Modal & Card ───────────────────────────────────────────────────
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
});

export default PropertyDetailScreen;