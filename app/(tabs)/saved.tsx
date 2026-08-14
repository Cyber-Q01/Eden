import PropertyCard from '@/components/PropertyCard';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RetryOverlay from '../../components/RetryOverlay';
import ScreenWrapper from '../../components/ScreenWrapper';
import SearchBar from '../../components/SearchBar';
import { useTheme } from '../../context/ThemeContext';
import { useFavorites } from '../../hooks/useProperties';

const SavedScreen = () => {
    const { colors } = useTheme();
    const router = useRouter();
    const { favorites, loading, error, removeFavorite, refetch } = useFavorites();
    const [sortBy, setSortBy] = React.useState<'newest' | 'price-asc' | 'price-desc'>('newest');
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredAndSortedFavorites = React.useMemo(() => {
        if (!favorites) return [];
        let result = [...favorites];

        // Search filtering
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item => 
                item.title.toLowerCase().includes(query) || 
                item.location.toLowerCase().includes(query)
            );
        }

        // Sorting
        return result.sort((a, b) => {
            if (sortBy === 'price-asc') return Number(a.price) - Number(b.price);
            if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
            return 0;
        });
    }, [favorites, sortBy, searchQuery]);

    const handleSortPress = () => {
        const options = [
            { text: 'Newest First', value: 'newest' },
            { text: 'Price: Low to High', value: 'price-asc' },
            { text: 'Price: High to Low', value: 'price-desc' },
        ];

        Alert.alert(
            'Sort Properties',
            'Choose how you want to see your saved properties',
            options.map(opt => ({
                text: opt.text,
                onPress: () => setSortBy(opt.value as any)
            })),
            { cancelable: true }
        );
    };

    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <SearchBar
                    placeholder="Search saved properties"
                    style={{ width: '100%', paddingHorizontal: 20 }}
                    showFilter={false}
                    onSearch={(text) => setSearchQuery(text)}
                />
                <TouchableOpacity
                    style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}
                    onPress={handleSortPress}
                >
                    <Text style={[styles.filterText, { color: colors.textSecondary }]}>
                        {sortBy === 'newest' ? 'Newest First' : sortBy === 'price-asc' ? 'Price: Low-High' : 'Price: High-Low'}
                    </Text>
                    <Ionicons name="options-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                ) : error ? (
                    <RetryOverlay message="Couldn't load favorites." onRetry={refetch} />
                ) : filteredAndSortedFavorites.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40 }}>
                        {searchQuery ? 'No matches found.' : 'You have no saved properties.'}
                    </Text>
                ) : (
                    filteredAndSortedFavorites.map((item) => {
                        if (!item) return null;
                        return (
                            <PropertyCard
                                key={item.id}
                                image={item.images}
                                title={item.title}
                                price={`₦${Number(item.price).toLocaleString()}`}
                                location={item.location}
                                variant="horizontal"
                                containerStyle={{ marginBottom: 0 }} // Gap is handled by scrollContent
                                isFavorite={true}
                                onFavoritePress={() => removeFavorite(item.id)}
                                onPress={() => router.push(`/property/${item.id}`)}
                            />
                        )
                    })
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
    },
    filterText: {
        fontSize: 14,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 20,
    },
});

export default SavedScreen;
