import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    NativeSyntheticEvent,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useFavorites, useProperty } from '../../hooks/useProperties';
import { useCredits } from '../../hooks/useCredits';

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

const getCleanUrl = (url: string) => {
    if (!url || !url.startsWith('http')) return url;
    if (url.includes('supabase.co/storage/v1/object/public/')) {
        const parts = url.split('/');
        const fileName = parts[parts.length - 1];
        const bucketName = url.includes('property-images') ? 'property-images' : 'request-images';
        const projectRef = process.env.EXPO_PROJECT_REF;
        return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucketName}/${fileName}`;
    }
    return url;
};

const PropertyDetailScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();

    const { property, loading, error, refetch } = useProperty(id);
    const { addFavorite, removeFavorite, favorites } = useFavorites();

    const [activeIndex, setActiveIndex] = useState(0);
    const [showFees, setShowFees] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const { credits, loading: creditsLoading, checkUnlocked, unlockProperty, fetchCredits } = useCredits();
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [unlocking, setUnlocking] = useState(false);

    const propertyId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

    useEffect(() => {
        if (propertyId) {
            checkUnlocked(propertyId).then(setIsUnlocked);
        }
    }, [propertyId]);

    const isFavorited = favorites.some((f: any) => f.property_id === id || f.id === id);

    const handleFavorite = async () => {
        if (typeof id !== 'string') return;
        isFavorited ? await removeFavorite(id) : await addFavorite(id);
    };

    const handleUnlock = async () => {
        if (isUnlocked) {
            // Already unlocked — go to details screen
            router.push({ pathname: '/shared-screens/UnlockedPropertyScreen', params: { id: propertyId } });
            return;
        }

        setUnlocking(true);
        const result = await unlockProperty(propertyId);
        setUnlocking(false);

        if (result.error === 'insufficient_credits') {
            // Navigate to top-up
            router.push('/shared-screens/TopUpCreditsScreen');
            return;
        }

        if (result.unlocked) {
            setIsUnlocked(true);
            router.push({ pathname: '/shared-screens/UnlockedPropertyScreen', params: { id: propertyId } });
        }
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
                    <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={refetch}>
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

    const statusColor = property.status === 'available' ? '#00C853' : '#EF4444';
    const statusBg = property.status === 'available' ? '#E6F9F0' : '#FEE2E2';

    // Calculate Breakdown
    const rentAmount = property.price || 0;
    const agencyFee = (rentAmount * (property.agency_fee_percentage || 0)) / 100;
    const cautionFee = property.caution_fee || 0;
    const legalFee = property.legal_fee || 0;
    const totalPackage = rentAmount + agencyFee + cautionFee + legalFee;

    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
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
                            renderItem={({ item, index }) => (
                                <Image
                                    key={index}
                                    source={{
                                        uri: getCleanUrl(item),
                                        headers: {
                                        }
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
                    <BackButton />

                    {/* Favourite Button */}
                    <TouchableOpacity style={[styles.favoriteButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]} onPress={handleFavorite}>
                        <Ionicons
                            name={isFavorited ? 'heart' : 'heart-outline'}
                            size={22}
                            color={isFavorited ? '#EF4444' : '#333'}
                        />
                    </TouchableOpacity>

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
                <View style={styles.infoContainer}>
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
                            label={property.listing_purpose === 'sale' ? 'For Sale' : 'For Rent'}
                            color={colors.primary}
                            bg={colors.primary + '15'}
                        />
                        <Badge
                            label={property.type ?? 'Property'}
                            color="#7C3AED"
                            bg="#F5F3FF"
                        />
                    </View>

                    {/* Price Card */}
                    <View style={[styles.priceCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
                        <View style={{ flex: 1 }}>
                            <TouchableOpacity
                                style={styles.priceHeader}
                                onPress={() => setShowFees(!showFees)}
                                activeOpacity={0.7}
                            >
                                <View>
                                    <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                                        {property.listing_purpose === 'rent' ? 'Total Package' : 'Price'}
                                    </Text>
                                    <Text style={[styles.price, { color: colors.primary }]}>
                                        {formatPrice(
                                            property.listing_purpose === 'rent' ? totalPackage : property.price,
                                            property.listing_purpose
                                        )}
                                    </Text>
                                </View>
                                {property.listing_purpose === 'rent' && (
                                    <Ionicons
                                        name={showFees ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color={colors.textSecondary}
                                        style={{ marginLeft: 8, marginTop: 15 }}
                                    />
                                )}
                            </TouchableOpacity>

                            {showFees && property.listing_purpose === 'rent' && (
                                <View style={styles.feeBreakdown}>
                                    <View style={styles.feeItem}>
                                        <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Rent</Text>
                                        <Text style={[styles.feeValue, { color: colors.text }]}>₦{rentAmount.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.feeItem}>
                                        <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Agency Fee ({property.agency_fee_percentage}%)</Text>
                                        <Text style={[styles.feeValue, { color: colors.text }]}>₦{agencyFee.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.feeItem}>
                                        <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Caution Fee</Text>
                                        <Text style={[styles.feeValue, { color: colors.text }]}>₦{cautionFee.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.feeItem}>
                                        <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Legal Fee</Text>
                                        <Text style={[styles.feeValue, { color: colors.text }]}>₦{legalFee.toLocaleString()}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                    </View>

                    {/* Features Grid */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Features</Text>
                    <View style={styles.featuresGrid}>
                        {features.map((f, i) => (
                            <FeatureChip
                                key={i}
                                icon={f.icon}
                                label={f.label}
                                iconSet={f.iconSet as any}
                                colors={colors}
                            />
                        ))}
                    </View>

                    {/* Description */}
                    {property.description ? (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                            <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{property.description}</Text>
                            </View>
                        </>
                    ) : null}

                    {/* Amenities */}
                    {property.amenities?.length > 0 && (
                        <>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities</Text>
                            <View style={styles.amenitiesGrid}>
                                {property.amenities.map((a: string, i: number) => (
                                    <AmenityTag key={i} label={a} colors={colors} />
                                ))}
                            </View>
                        </>
                    )}

                    {/* Unlock / View Landlord Details */}
                    <View style={[styles.unlockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.unlockIconWrap}>
                            <Ionicons
                                name={isUnlocked ? 'lock-open-outline' : 'lock-closed-outline'}
                                size={28}
                                color={isUnlocked ? '#00C853' : colors.primary}
                            />
                        </View>
                        <Text style={[styles.unlockTitle, { color: colors.text }]}>
                            {isUnlocked ? 'Landlord Details Unlocked' : 'Unlock Landlord Details'}
                        </Text>
                        <Text style={[styles.unlockSubtitle, { color: colors.textSecondary }]}>
                            {isUnlocked
                                ? 'Tap below to view landlord contact info, message them, or apply.'
                                : 'Spend 1 credit (₦666) to view the landlord\'s contact details, message them, and apply for this property.'}
                        </Text>

                        <TouchableOpacity
                            style={[
                                styles.unlockButton,
                                { backgroundColor: isUnlocked ? '#00C853' : colors.primary },
                            ]}
                            onPress={handleUnlock}
                            disabled={unlocking}
                            activeOpacity={0.85}
                        >
                            {unlocking ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons
                                        name={isUnlocked ? 'eye-outline' : 'lock-open-outline'}
                                        size={18}
                                        color="#fff"
                                    />
                                    <Text style={styles.unlockButtonText}>
                                        {isUnlocked ? 'View Landlord Details' : 'Unlock for ₦666'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {!isUnlocked && (
                            <Text style={[styles.unlockCreditsNote, { color: colors.textSecondary }]}>
                                {creditsLoading ? '...' : `${credits} credit${credits !== 1 ? 's' : ''} remaining`}
                            </Text>
                        )}
                    </View>

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
                        {property.billing_period && property.listing_purpose !== 'sale' && (
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
        </ScreenWrapper>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    scrollContent: { paddingBottom: 60 },

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
    imageContainer: { width, height: 360, position: 'relative', backgroundColor: '#F1F5F9' },
    mainImage: { width, height: 360 },
    backButton: {
        position: 'absolute',
        top: 20,
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
        top: 20,
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
    imageCounter: {
        position: 'absolute',
        top: 20,
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
        paddingTop: 24, gap: 20, borderTopEndRadius: 20, borderTopStartRadius: 20
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