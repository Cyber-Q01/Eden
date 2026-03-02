import PropertyCard from '@/components/PropertyCard';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';

const SavedScreen = () => {
    const { colors } = useTheme();
    const savedItems = [
        { id: '1', image: require('../../assets/images/Homes/home1.png'), title: '2 Bedroom Apartment', price: 'N350,000/year', location: 'Lekki Phase 1' },
        { id: '2', image: require('../../assets/images/Homes/home2.png'), title: '2 Bedroom Apartment', price: 'N350,000/year', location: 'Lekki Phase 1' },
        { id: '3', image: require('../../assets/images/Homes/home3.png'), title: '2 Bedroom Apartment', price: 'N350,000/year', location: 'Lekki Phase 1' },
        { id: '4', image: require('../../assets/images/Homes/home1.png'), title: '2 Bedroom Apartment', price: 'N350,000/year', location: 'Lekki Phase 1' },
    ];

    return (
        <ScreenWrapper style={{ backgroundColor: colors.background }}>
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.filterText, { color: colors.textSecondary }]}>Sort by Filter</Text>
                    <Ionicons name="options-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {savedItems.map((item) => (
                    <PropertyCard
                        key={item.id}
                        image={item.image}
                        title={item.title}
                        price={item.price}
                        location={item.location}
                        variant="horizontal"
                        containerStyle={{ marginBottom: 0 }} // Gap is handled by scrollContent
                        onRemovePress={() => { }}
                        onPress={() => { }}
                    />
                ))}
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
