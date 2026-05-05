import PropertyCard from '@/components/PropertyCard';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import RetryOverlay from '../../components/RetryOverlay';
import { useFavorites } from '../../hooks/useProperties';
import { useRouter } from 'expo-router';

const SavedScreen = () => {
    const { colors } = useTheme();
    const router = useRouter();
    const { favorites, loading, error, removeFavorite, refetch } = useFavorites();

    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.filterText, { color: colors.textSecondary }]}>Sort by Filter</Text>
                    <Ionicons name="options-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                ) : error ? (
                    <RetryOverlay message="Couldn't load favorites." onRetry={refetch} />
                ) : favorites.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40 }}>You have no saved properties.</Text>
                ) : (
                    favorites.map((item) => {
                        if (!item) return null;
                        return (
                            <PropertyCard
                                key={item.id}
                                image={item.images?.[0] ? { uri: item.images[0] } : require('../../assets/images/Homes/home1.png')}
                                title={item.title}
                                price={`₦${item.price}`}
                                location={item.location}
                                variant="horizontal"
                                containerStyle={{ marginBottom: 0 }} // Gap is handled by scrollContent
                                onRemovePress={() => removeFavorite(item.id)}
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
