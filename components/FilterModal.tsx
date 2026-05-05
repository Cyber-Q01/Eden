import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    TextInput
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import RangeSlider from './RangeSlider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: any) => void;
}

const PROPERTY_TYPES = ['Self Contain', '1 Bedroom', '2 Bedroom', '3 Bedroom', 'Duplex', 'Bungalow'];
const AMENITIES = [
    { label: 'water', icon: 'water-outline' },
    { label: 'Shield', icon: 'shield-outline' },
    { label: 'Parking', icon: 'car-outline' },
    { label: 'Internet', icon: 'wifi-outline' },
    { label: 'Generator', icon: 'flash-outline' },
    { label: 'Tiled', icon: 'grid-outline' },
    { label: 'Kitchen', icon: 'restaurant-outline' },
    { label: 'Balcony', icon: 'home-outline' },
];

const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose, onApply }) => {
    const { colors, isDark } = useTheme();
    const [propertyType, setPropertyType] = useState('Self Contain');
    const [minPrice, setMinPrice] = useState(50000);
    const [maxPrice, setMaxPrice] = useState(150000);
    const [location, setLocation] = useState('yaba, Lagos');
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

    const toggleAmenity = (label: string) => {
        setSelectedAmenities(prev =>
            prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label]
        );
    };

    const handleReset = () => {
        setPropertyType('Self Contain');
        setMinPrice(50000);
        setMaxPrice(150000);
        setLocation('yaba, Lagos');
        setSelectedAmenities([]);
    };

    // Theme-aware secondary colors
    const secondaryBg = isDark ? colors.card : '#F8FAFC';
    const amenityBg = isDark ? colors.border + '40' : '#EEF2FF';
    const inputBg = isDark ? colors.card : '#FFFFFF';
    const sectionTitleColor = isDark ? colors.primary : '#1D4ED8';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            <View style={[styles.sheet, { backgroundColor: colors.background }]}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
                
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Filter Properties</Text>
                    <TouchableOpacity onPress={handleReset}>
                        <Text style={styles.resetText}>Reset all</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    {/* Property Type */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Property Type</Text>
                        <View style={styles.chipContainer}>
                            {PROPERTY_TYPES.map((type) => {
                                const isSelected = propertyType === type;
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.chip,
                                            isSelected 
                                                ? { backgroundColor: colors.primary } 
                                                : { backgroundColor: secondaryBg, borderWidth: 1, borderColor: colors.border }
                                        ]}
                                        onPress={() => setPropertyType(type)}
                                    >
                                        <Text style={[styles.chipText, isSelected ? { color: '#FFFFFF' } : { color: colors.textSecondary }]}>
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Price Range */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Price Range(per year)</Text>
                        <View style={styles.priceRow}>
                            <View style={styles.priceInputContainer}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Min</Text>
                                <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: inputBg }]}>
                                    <Text style={[styles.priceSymbol, { color: colors.text }]}>N</Text>
                                    <TextInput
                                        style={[styles.priceInput, { color: colors.text }]}
                                        value={minPrice.toLocaleString()}
                                        onChangeText={(val) => setMinPrice(Number(val.replace(/[^0-9]/g, '')))}
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>
                            </View>
                            <View style={styles.priceInputContainer}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Max</Text>
                                <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: inputBg }]}>
                                    <Text style={[styles.priceSymbol, { color: colors.text }]}>N</Text>
                                    <TextInput
                                        style={[styles.priceInput, { color: colors.text }]}
                                        value={maxPrice.toLocaleString()}
                                        onChangeText={(val) => setMaxPrice(Number(val.replace(/[^0-9]/g, '')))}
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>
                            </View>
                        </View>
                        
                        {/* Functional Range Slider */}
                        <View style={styles.sliderContainer}>
                            <RangeSlider 
                                min={10000}
                                max={1000000}
                                step={5000}
                                initialLow={minPrice}
                                initialHigh={maxPrice}
                                onValueChanged={(low, high) => {
                                    setMinPrice(low);
                                    setMaxPrice(high);
                                }}
                            />
                        </View>
                    </View>

                    {/* Location */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
                        <View style={[styles.locationInput, { borderColor: colors.border, backgroundColor: inputBg }]}>
                            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.locationText, { color: colors.text }]}
                                value={location}
                                onChangeText={setLocation}
                                placeholder="Enter location"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                    </View>

                    {/* Amenities */}
                    <View style={styles.section}>
                        <View style={styles.amenitiesGrid}>
                            {AMENITIES.map((item) => {
                                const isSelected = selectedAmenities.includes(item.label);
                                return (
                                    <TouchableOpacity
                                        key={item.label}
                                        style={[
                                            styles.amenityChip,
                                            { backgroundColor: isSelected ? colors.primary + '20' : amenityBg }
                                        ]}
                                        onPress={() => toggleAmenity(item.label)}
                                    >
                                        <Ionicons name={item.icon as any} size={14} color={isSelected ? colors.primary : colors.textSecondary} />
                                        <Text style={[styles.amenityText, { color: isSelected ? colors.primary : colors.textSecondary }]}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                    <TouchableOpacity 
                        style={[styles.applyButton, { backgroundColor: colors.primary }]}
                        onPress={() => onApply({ propertyType, minPrice, maxPrice, location, selectedAmenities })}
                    >
                        <Text style={styles.applyButtonText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.8,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 12,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
    },
    resetText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        width: '100%',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    priceInputContainer: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 14,
        marginBottom: 8,
    },
    inputBox: {
        height: 48,
        borderWidth: 1,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    priceSymbol: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: 4,
    },
    priceInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    sliderContainer: {
        height: 40,
        justifyContent: 'center',
        marginTop: 10,
    },
    sliderTrack: {
        height: 4,
        borderRadius: 2,
    },
    sliderActiveTrack: {
        height: 4,
        position: 'absolute',
    },
    sliderThumb: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        position: 'absolute',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    locationInput: {
        height: 48,
        borderWidth: 1,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        gap: 8,
    },
    locationText: {
        flex: 1,
        fontSize: 14,
    },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
    },
    amenityChip: {
        width: '23%',
        height: 38,
        borderRadius: 19,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    amenityText: {
        fontSize: 10,
        fontWeight: '500',
    },
    footer: {
        padding: 20,
        paddingBottom: 34,
        borderTopWidth: 1,
    },
    applyButton: {
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default FilterModal;
