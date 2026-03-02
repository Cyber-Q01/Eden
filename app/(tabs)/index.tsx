import SearchBar from '@/components/SearchBar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PropertyCard from '../../components/PropertyCard';
import ScreenWrapper from '../../components/ScreenWrapper';
import SectionHeader from '../../components/SectionHeader';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const HERO_BANNERS = [
    { id: '1', color: '#407BFF', title: 'Find your dream home' },
    { id: '2', color: '#0047AB', title: 'Verified properties only' },
    { id: '3', color: '#66B2FF', title: 'Schedule tours easily' },
    { id: '4', color: '#1E3C72', title: 'Secure payments flow' },
];

const HomeScreen = () => {
    const { colors } = useTheme();
    const router = useRouter();
    const categories = ['1 Bedroom', 'Duplex', '2 Bedroom', 'Studio', 'Bungalow'];
    const recommendations = [
        {
            id: '1',
            image: require('../../assets/images/Homes/home1.png'),
            title: '2 Bedroom Apartment',
            price: 'N350,000/year',
            location: 'Lekki Phase 1',
        },
        {
            id: '2',
            image: require('../../assets/images/Homes/home2.png'),
            title: '2 Bedroom Apartment',
            price: 'N350,000/year',
            location: 'Lekki Phase 1',
        }
    ];

    const [activeBanner, setActiveBanner] = useState(0);
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            const nextIndex = (activeBanner + 1) % HERO_BANNERS.length;
            setActiveBanner(nextIndex);
            scrollRef.current?.scrollTo({
                x: nextIndex * (width - 40),
                animated: true,
            });
        }, 3000);

        return () => clearInterval(timer);
    }, [activeBanner]);

    return (
        <ScreenWrapper style={{ backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.welcomeText, { color: colors.primary }]}>Hi, John</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.iconButton}>
                            <Ionicons name="notifications-outline" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Image
                            source={{ uri: 'https://i.pravatar.cc/100' }}
                            style={styles.avatar}
                        />
                    </View>
                </View>

                {/* Search Section */}
                <SearchBar
                    placeholder="Search by location, price, or type"
                    style={{ paddingHorizontal: 20 }}
                />

                {/* Categories Section */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                >
                    {categories.map((cat, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.categoryItem,
                                { backgroundColor: colors.card },
                                index === 0 && [styles.activeCategory, { backgroundColor: colors.primary + '1A', borderColor: colors.primary }]
                            ]}
                        >
                            <Text style={[
                                styles.categoryText,
                                { color: colors.primary },
                                index === 0 && styles.activeCategoryText
                            ]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Hero Banner Carousel */}
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
                        {HERO_BANNERS.map((banner) => (
                            <View
                                key={banner.id}
                                style={[styles.heroBanner, { backgroundColor: banner.color }]}
                            >
                                <View style={styles.heroGradient}>
                                    <Text style={styles.bannerTitle}>{banner.title}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Pagination Dots */}
                    <View style={styles.pagination}>
                        {HERO_BANNERS.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    activeBanner === index && styles.activeDot
                                ]}
                            />
                        ))}
                    </View>
                </View>

                {/* Recommended Section */}
                <SectionHeader title="Recommended for You" style={styles.sectionHeader} />

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recommendationsContainer}
                >
                    {recommendations.map((item) => (
                        <PropertyCard
                            key={item.id}
                            image={item.image}
                            title={item.title}
                            price={item.price}
                            location={item.location}
                            onPress={() => router.push(`/property/${item.id}`)}
                            onFavoritePress={() => { }}
                            containerStyle={styles.recommendationCard}
                        />
                    ))}
                </ScrollView>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        marginBottom: 20,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0047AB',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        padding: 4,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    categoriesContainer: {
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    categoryItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#F5F8FF',
    },
    activeCategory: {
        backgroundColor: '#E6EEFF',
        borderWidth: 1,
        borderColor: '#0047AB',
    },
    categoryText: {
        fontSize: 14,
        color: '#0047AB',
        fontWeight: '500',
    },
    activeCategoryText: {
        fontWeight: '700',
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
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        paddingLeft: 30,
    },
    bannerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        width: '60%',
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
    },
    recommendationsContainer: {
        paddingHorizontal: 20,
        gap: 16,
    },
    recommendationCard: {
        marginBottom: 20,
    },
});

export default HomeScreen;
