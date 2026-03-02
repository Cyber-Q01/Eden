import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';

const { width } = Dimensions.get('window');

const PropertyDetailScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    // Mock data based on ID or defaults
    const property = {
        title: '2 Bedroom Apartment',
        location: 'Lekki Phase 1, Lagos',
        price: 'N350,000/year',
        images: [
            require('../../assets/images/Homes/home1.png'),
            require('../../assets/images/Homes/home2.png'),
            require('../../assets/images/Homes/home3.png'),
        ],
        details: [
            { icon: 'bed-outline', label: '2 Beds' },
            { icon: 'water-outline', label: '2 baths' },
            { icon: 'home-outline', label: 'furnished' },
            { icon: 'flash-outline', label: 'light' },
        ]
    };

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Image Section */}
                <View style={styles.imageContainer}>
                    <Image source={property.images[0]} style={styles.mainImage} />
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.favoriteButton}>
                        <Ionicons name="heart" size={24} color="#FF4D4D" />
                    </TouchableOpacity>

                    {/* Dots indicator */}
                    <View style={styles.dotsContainer}>
                        <View style={[styles.dot, styles.activeDot]} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.infoContainer}>
                    <Text style={styles.title}>{property.title}</Text>
                    <Text style={styles.location}>{property.location}</Text>

                    <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>Verified</Text>
                    </View>

                    {/* Price & Book Card */}
                    <View style={styles.priceCard}>
                        <Text style={styles.price}>{property.price}</Text>
                        <TouchableOpacity
                            style={styles.bookButton}
                            onPress={() => router.push('/payment/method')}
                        >
                            <Text style={styles.bookButtonText}>Book Now</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Features Grid */}
                    <View style={styles.featuresGrid}>
                        {property.details.map((item, index) => (
                            <View key={index} style={styles.featureItem}>
                                <Ionicons name={item.icon as any} size={24} color="#407BFF" />
                                <Text style={styles.featureLabel}>{item.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Property Gallery Section */}
                    <View style={styles.galleryContainer}>
                        <Text style={styles.sectionTitle}>Property Gallery</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.galleryScroll}
                        >
                            {property.images.map((img, index) => (
                                <View key={index} style={styles.galleryImageWrapper}>
                                    <Image source={img} style={styles.galleryImage} />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 40,
    },
    imageContainer: {
        width: width,
        height: 350,
        position: 'relative',
    },
    mainImage: {
        width: '100%',
        height: '100%',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoriteButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    activeDot: {
        backgroundColor: '#407BFF',
        width: 12,
    },
    infoContainer: {
        paddingTop: 30,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#333',
        marginBottom: 8,
    },
    location: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
    },
    verifiedBadge: {
        backgroundColor: '#E6F9F0',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 30,
    },
    verifiedText: {
        color: '#00C853',
        fontSize: 16,
        fontWeight: '700',
    },
    priceCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
        marginBottom: 30,
    },
    price: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0047AB',
        marginBottom: 20,
    },
    bookButton: {
        backgroundColor: '#2563EB',
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        width: '100%',
    },
    featureItem: {
        width: (width - 64) / 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    featureLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    galleryContainer: {
        width: '100%',
        marginTop: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    galleryScroll: {
        gap: 12,
        paddingRight: 20, // Add some padding at the end of scroll
    },
    galleryImageWrapper: {
        width: 140,
        height: 100,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
});

export default PropertyDetailScreen;
