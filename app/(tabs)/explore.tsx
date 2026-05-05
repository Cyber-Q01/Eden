import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import PropertyCard from '../../components/PropertyCard';
import ScreenWrapper from '../../components/ScreenWrapper';
import SearchBar from '../../components/SearchBar';
import SectionHeader from '../../components/SectionHeader';
import RetryOverlay from '../../components/RetryOverlay';
import FilterModal from '../../components/FilterModal';
import { useTheme } from '../../context/ThemeContext';
import { useProperties } from '../../hooks/useProperties';

const { width } = Dimensions.get('window');

const ExploreScreen = () => {
    const { colors } = useTheme();
    const router = useRouter();
    const { properties, loading: loadingProperties, error: propertiesError, refetch: refetchProperties } = useProperties();
    const [isFilterVisible, setIsFilterVisible] = React.useState(false);

    const homeTypes = ['1 Bedroom', '2 Bedroom', 'Studio', 'Self-contain', 'Duplex', 'Bungalow'];
    const locations = [
        { name: 'Lagos', homes: '120+ Homes', image: require('../../assets/images/Homes/home1.png') },
        { name: 'Calabar', homes: '120+ Homes', image: require('../../assets/images/Homes/home2.png') }
    ];

    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.title, { color: colors.text }]}>Explore</Text>

                {/* Search Bar */}
                <SearchBar
                    placeholder="Search by location, price, or type"
                    showFilter={true}
                    style={{ paddingHorizontal: 20 }}
                    onFilterPress={() => setIsFilterVisible(true)}
                />

                {/* Home Types Section */}
                <View style={styles.section}>
                    <SectionHeader title="Home Types" style={{ paddingHorizontal: 20 }} />
                    <View style={styles.grid}>
                        {homeTypes.map((type, index) => (
                            <View key={index} style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.gridItemText, { color: colors.text }]}>{type}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Popular Locations Section */}
                <View style={styles.section}>
                    <SectionHeader title="Popular Locations" style={{ paddingHorizontal: 20 }} />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.locationsContainer}
                    >
                        {locations.map((loc, index) => (
                            <View key={index} style={[styles.locationCard, { backgroundColor: colors.card }]}>
                                <Image source={loc.image} style={styles.locationImage} />
                                <View style={[styles.locationOverlay, { backgroundColor: colors.card + 'E6' }]}>
                                    <Text style={[styles.locationName, { color: colors.text }]}>{loc.name}</Text>
                                    <Text style={[styles.locationHomes, { color: colors.textSecondary }]}>{loc.homes}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Top Picks Section */}
                <View style={styles.section}>
                    <SectionHeader title="Top Picks for you" style={{ paddingHorizontal: 20 }} />
                    {loadingProperties ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                    ) : propertiesError ? (
                        <RetryOverlay message="Couldn't load properties." onRetry={refetchProperties} />
                    ) : (
                        properties.length > 0 ? (
                            <View style={styles.grid}>
                                {properties.map(property => (
                                    <PropertyCard
                                        key={property.id}
                                        image={property.images?.[0] || require('../../assets/images/Homes/home3.png')}
                                        title={property.title}
                                        price={`₦${Number(property.price).toLocaleString()}`}
                                        location={property.location}
                                        containerStyle={styles.pickCardGrid}
                                        onPress={() => router.push(`/property/${property.id}`)}
                                    />
                                ))}
                            </View>
                        ) : (
                            <Text style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary }}>No properties found.</Text>
                        )
                    )}
                </View>

                <FilterModal 
                    visible={isFilterVisible} 
                    onClose={() => setIsFilterVisible(false)}
                    onApply={(filters) => {
                        console.log('Filters applied:', filters);
                        setIsFilterVisible(false);
                    }}
                />
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#333',
        textAlign: 'center',
        marginVertical: 20,
    },
    section: {
        marginBottom: 30,
    },
    grid: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
    },
    gridItem: {
        width: (width - 64) / 3,
        aspectRatio: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'stretch',
        paddingHorizontal: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    gridItemText: {
        fontSize: 13,
        color: '#333',
        fontWeight: '600',
        textAlign: 'center',
    },
    locationsContainer: {
        paddingHorizontal: 20,
        gap: 16,
    },
    locationCard: {
        width: width * 0.45,
        height: 120,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#F0F0F0',
    },
    locationImage: {
        width: '100%',
        height: '100%',
    },
    locationOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
    },
    locationName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    locationHomes: {
        fontSize: 12,
        color: '#666',
    },
    pickCardGrid: {
        width: (width - 52) / 2,
        marginBottom: 16,
    },
    pickCard: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
});

export default ExploreScreen;
