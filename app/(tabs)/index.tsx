import SearchBar from '@/components/SearchBar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FilterModal from '../../components/FilterModal';
import PropertyCard from '../../components/PropertyCard';
import RetryOverlay from '../../components/RetryOverlay';
import ScreenWrapper from '../../components/ScreenWrapper';
import SectionHeader from '../../components/SectionHeader';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../hooks/useNotifications';
import { useProfile } from '../../hooks/useProfile';
import { useFavorites, useProperties } from '../../hooks/useProperties';
import { useAdvertisements, MobileAdvertisement } from '../../hooks/useAdvertisements';

const { width } = Dimensions.get('window');

const HERO_BANNERS = [
    { id: '1', color: '#407BFF', title: 'Find your dream home', subtitle: 'Browse thousands of verified properties' },
    { id: '2', color: '#0047AB', title: 'Verified properties only', subtitle: 'Inspected & 100% scam free' },
    { id: '3', color: '#00C853', title: 'Schedule tours easily', subtitle: 'Book physical & virtual tours' },
    { id: '4', color: '#1E3C72', title: 'Secure escrow payments', subtitle: 'Funds protected until you confirm' },
    { id: '5', color: '#7C3AED', title: 'Zero hidden fees', subtitle: 'Transparent pricing & direct contact' },
    { id: '6', color: '#DB2777', title: 'Fast application approval', subtitle: 'Apply online in under 2 minutes' },
    { id: '7', color: '#D97706', title: 'Find verified artisans', subtitle: 'Plumbers, electricians & repair services' },
    { id: '8', color: '#059669', title: 'Escrow-protected payments', subtitle: 'Funds released when you confirm' },
];

const HomeScreen = () => {
    const { colors } = useTheme();
    const router = useRouter();
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        type: '',
        propertyTypes: [] as string[],
        location: '',
        minPrice: undefined as number | undefined,
        maxPrice: undefined as number | undefined,
    });

    const { properties, loading: propertiesLoading, error: propertiesError, refetch: refetchProperties } = useProperties(filters);
    const { favorites, addFavorite, removeFavorite } = useFavorites();
    const { profile, loading: profileLoading } = useProfile();
    const { unreadCount } = useNotifications();
    const { banners, handleBannerPress } = useAdvertisements();

    // Quick filter categories mapping display labels to actual property type values
    const categories = [
        { label: 'All', values: [] as string[] },
        { label: 'Self Contain', values: ['Self Contain', 'Room and Parlour Self Contain'] },
        { label: '1 Bedroom', values: ['1 Bedroom Flat', 'Mini Flat'] },
        { label: '2 Bedroom', values: ['2 Bedroom Flat'] },
        { label: '3 Bedroom', values: ['3 Bedroom Flat'] },
        { label: 'Duplex', values: ['Detached Duplex', 'Semi-Detached Duplex', 'Terrace Duplex'] },
        { label: 'Studio', values: ['Studio Apartment'] },
        { label: 'Shared', values: ['Shared apartments'] },
    ];

    const isFavorite = (id: string) => favorites.some(f => f.id === id);

    const handleToggleFavorite = async (propertyId: string) => {
        if (isFavorite(propertyId)) {
            await removeFavorite(propertyId);
        } else {
            await addFavorite(propertyId);
        }
    };

    // Greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    // Grab top 4 newest properties as 'recommendations' / 'featured'
    const recommendations = properties.slice(0, 4);

    const [activeBanner, setActiveBanner] = useState(0);
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (banners.length <= 1) return;
        const timer = setInterval(() => {
            const nextIndex = (activeBanner + 1) % banners.length;
            setActiveBanner(nextIndex);
            scrollRef.current?.scrollTo({
                x: nextIndex * (width - 40),
                animated: true,
            });
        }, 4000);

        return () => clearInterval(timer);
    }, [activeBanner, banners.length]);

    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {profile?.profile_photo ? (
                            <Image
                                source={{ uri: profile.profile_photo }}
                                style={styles.avatar}
                            />
                        ) : (
                            <Image
                                source={require('../../assets/icon/profiles/profile1.png')}
                                style={styles.avatar}
                            />
                        )}
                        <View style={styles.headerTextContainer}>
                            <Text style={[styles.welcomeText, { color: colors.text }]}>
                                {getGreeting()}, {profile?.first_name || 'John'}
                            </Text>
                            <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
                                Find your perfect home today
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push('/shared-screens/NotificationsScreen')}
                    >
                        <Ionicons name="notifications-outline" size={24} color={colors.text} />
                        {unreadCount > 0 && <View style={[styles.notificationDot, { borderColor: colors.background }]} />}
                    </TouchableOpacity>
                </View>

                {/* Hero Banner Carousel - Live Advertisements & Promos */}
                <View style={styles.heroContainer}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                            setActiveBanner(index);
                        }}
                        style={styles.carousel}
                    >
                        {banners.map((banner) => (
                            <TouchableOpacity
                                key={banner.id}
                                activeOpacity={0.9}
                                onPress={() => handleBannerPress(banner)}
                                style={[styles.heroBanner, { backgroundColor: banner.color || '#1D4ED8' }]}
                            >
                                {banner.mediaUrl && (
                                    <Image
                                        source={{ uri: banner.mediaUrl }}
                                        style={StyleSheet.absoluteFillObject}
                                        resizeMode="cover"
                                    />
                                )}
                                <View style={styles.heroGradient}>
                                    <View style={styles.bannerTagRow}>
                                        <View style={styles.bannerCategoryTag}>
                                            <Ionicons
                                                name={banner.targetType === 'mobile_app' ? 'phone-portrait' : 'globe-outline'}
                                                size={11}
                                                color="#FFF"
                                            />
                                            <Text style={styles.bannerCategoryTagText}>
                                                {banner.targetType === 'mobile_app' ? 'Mobile App' : 'Special Offer'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.bannerTitle} numberOfLines={2}>{banner.title}</Text>
                                    {banner.subtitle && (
                                        <Text style={styles.bannerSubtitle} numberOfLines={1}>{banner.subtitle}</Text>
                                    )}

                                    <View style={styles.ctaButtonWrap}>
                                        <View style={styles.ctaButton}>
                                            <Text style={styles.ctaButtonText}>{banner.ctaText || 'Learn More'}</Text>
                                            <Ionicons name="arrow-forward" size={12} color="#1D4ED8" />
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Pagination Dots */}
                    {banners.length > 1 && (
                        <View style={styles.pagination}>
                            {banners.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        activeBanner === index && styles.activeDot
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* Search Section */}
                <SearchBar
                    placeholder="Search by location, price, or type"
                    style={{ paddingHorizontal: 20 }}
                    onFilterPress={() => setIsFilterVisible(true)}
                    onSearch={(text) => setFilters(prev => ({ ...prev, search: text }))}
                />

                {/* Categories Section */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                >
                    {categories.map((cat, index) => {
                        const isAll = cat.values.length === 0;
                        const isSelected = isAll
                            ? filters.propertyTypes.length === 0 && !filters.type
                            : filters.propertyTypes.length > 0 && cat.values.every(v => filters.propertyTypes.includes(v));
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.categoryItem,
                                    isSelected ? styles.activeCategory : [styles.inactiveCategory, { backgroundColor: colors.card, borderColor: colors.border }]
                                ]}
                                onPress={() => setFilters(prev => ({
                                    ...prev,
                                    type: '',
                                    propertyTypes: isAll ? [] : cat.values,
                                }))}
                            >
                                <Text style={[
                                    styles.categoryText,
                                    isSelected ? styles.activeCategoryText : [styles.inactiveCategoryText, { color: colors.textSecondary }]
                                ]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Featured Nearby Section */}
                <SectionHeader
                    title="Featured Nearby"
                    style={styles.sectionHeader}
                />

                <ScrollView
                    horizontal
                    pagingEnabled
                    snapToInterval={width - 24}
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recommendationsContainer}
                >
                    {propertiesLoading ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : propertiesError ? (
                        <RetryOverlay message="Couldn't load recommendations." onRetry={refetchProperties} />
                    ) : (
                        recommendations.map((item) => (
                            <PropertyCard
                                key={item.id}
                                image={item.images}
                                title={item.title}
                                price={`₦${Number(item.price).toLocaleString()}`}
                                location={item.location}
                                onPress={() => router.push(`/property/${item.id}`)}
                                isFavorite={isFavorite(item.id)}
                                onFavoritePress={() => handleToggleFavorite(item.id)}
                                containerStyle={styles.recommendationCard}
                            />
                        ))
                    )}
                </ScrollView>

                {/* Nearby Properties Section */}
                <SectionHeader
                    title="Nearby Properties"
                    style={styles.sectionHeader}
                />

                <View style={styles.nearbyListContainer}>
                    {propertiesLoading ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : propertiesError ? (
                        <RetryOverlay message="Couldn't load nearby properties." onRetry={refetchProperties} />
                    ) : (
                        properties.slice(0, 5).map((item) => (
                            <PropertyCard
                                key={`nearby-${item.id}`}
                                variant="horizontal"
                                image={item.images}
                                title={item.title}
                                price={`₦${Number(item.price).toLocaleString()}`}
                                location={item.location}
                                onPress={() => router.push(`/property/${item.id}`)}
                            />
                        ))
                    )}
                </View>

                <FilterModal
                    visible={isFilterVisible}
                    onClose={() => setIsFilterVisible(false)}
                    onApply={(newFilters) => {
                        setFilters(prev => ({
                            ...prev,
                            type: '', // Clear single type category if modal is used
                            propertyTypes: newFilters.propertyTypes,
                            minPrice: newFilters.minPrice,
                            maxPrice: newFilters.maxPrice,
                            location: newFilters.location,
                        }));
                        setIsFilterVisible(false);
                    }}
                />
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTextContainer: {
        justifyContent: 'center',
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    subtitleText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '400',
        marginTop: 2,
    },
    iconButton: {
        padding: 8,
        position: 'relative',
        borderRadius: 99,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    notificationDot: {
        position: 'absolute',
        top: 6,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    categoriesContainer: {
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 24,
    },
    categoryItem: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inactiveCategory: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
    },
    activeCategory: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '500',
    },
    inactiveCategoryText: {
        color: '#64748B',
    },
    activeCategoryText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    heroContainer: {
        marginHorizontal: 20,
        marginBottom: 30,
        height: 180,
    },
    carousel: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    heroBanner: {
        width: width - 40,
        height: 180,
        borderRadius: 20,
        overflow: 'hidden',
    },
    heroGradient: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    bannerTagRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    bannerCategoryTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    bannerCategoryTagText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    bannerTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#FFFFFF',
        width: '85%',
        lineHeight: 24,
    },
    bannerSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.95)',
        marginTop: 4,
        width: '85%',
    },
    ctaButtonWrap: {
        marginTop: 10,
        flexDirection: 'row',
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    ctaButtonText: {
        color: '#1D4ED8',
        fontSize: 11,
        fontWeight: '700',
    },
    pagination: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 15,
        alignSelf: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    activeDot: {
        backgroundColor: '#FFFFFF',
        width: 20,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 12,
    },
    recommendationsContainer: {
        paddingHorizontal: 20,
        gap: 16,
    },
    recommendationCard: {
        width: width - 40,
        marginBottom: 20,
    },
    nearbyListContainer: {
        paddingHorizontal: 20,
        gap: 4,
        marginBottom: 20,
    },
});

export default HomeScreen;
