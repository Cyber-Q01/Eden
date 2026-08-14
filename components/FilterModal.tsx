import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import RangeSlider from './RangeSlider';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: any) => void;
}

const PROPERTY_TYPE_GROUPS = [
    {
        title: 'Apartments & Flats',
        icon: 'business-outline' as const,
        types: ['Self Contain', 'Room and Parlour Self Contain', 'Mini Flat', '1 Bedroom Flat', '2 Bedroom Flat', '3 Bedroom Flat', '4 Bedroom Flat', 'Studio Apartment', 'Shared apartments', 'Block of Flats'],
    },
    {
        title: 'Houses & Duplexes',
        icon: 'home-outline' as const,
        types: ['Detached Duplex', 'Semi-Detached Duplex', 'Terrace Duplex', 'Terrace House', 'Bungalow', 'Detached House', 'Semi-Detached House', 'Mansion'],
    },
    {
        title: 'Commercial',
        icon: 'storefront-outline' as const,
        types: ['Shop', 'Office Space', 'Co-working Space', 'Warehouse', 'Event Hall', 'Hotel/Guest House', 'Plaza/Complex'],
    },
    {
        title: 'Land',
        icon: 'earth-outline' as const,
        types: ['Residential Land', 'Commercial Land', 'Industrial Land', 'Farm Land'],
    },
];

const AMENITIES = [
    { label: 'Water', icon: 'water-outline' },
    { label: 'Security', icon: 'shield-outline' },
    { label: 'Parking', icon: 'car-outline' },
    { label: 'Internet', icon: 'wifi-outline' },
    { label: 'Generator', icon: 'flash-outline' },
    { label: 'Tiled', icon: 'grid-outline' },
    { label: 'Kitchen', icon: 'restaurant-outline' },
    { label: 'Balcony', icon: 'home-outline' },
];

// Sub-modal for selecting property types
const PropertyTypeModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    selectedTypes: string[];
    onToggle: (type: string) => void;
    onClear: () => void;
}> = ({ visible, onClose, selectedTypes, onToggle, onClear }) => {
    const { colors, isDark } = useTheme();
    const chipBg = isDark ? colors.card : '#F1F5F9';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={ptStyles.overlay}>
                <View style={[ptStyles.container, { backgroundColor: colors.background }]}>
                    {/* Header */}
                    <View style={[ptStyles.header, { borderBottomColor: colors.border }]}>
                        <View style={ptStyles.headerLeft}>
                            <TouchableOpacity onPress={onClose} style={ptStyles.closeBtn}>
                                <Ionicons name="arrow-back" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={[ptStyles.title, { color: colors.text }]}>Property Types</Text>
                        </View>
                        <TouchableOpacity onPress={onClear}>
                            <Text style={ptStyles.clearText}>Clear</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Selected count badge */}
                    {selectedTypes.length > 0 && (
                        <View style={[ptStyles.selectedBadge, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                            <Text style={[ptStyles.selectedText, { color: colors.primary }]}>
                                {selectedTypes.length} type{selectedTypes.length > 1 ? 's' : ''} selected
                            </Text>
                        </View>
                    )}

                    {/* Grouped property types */}
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ptStyles.content}>
                        {PROPERTY_TYPE_GROUPS.map((group) => (
                            <View key={group.title} style={ptStyles.group}>
                                <View style={ptStyles.groupHeader}>
                                    <View style={[ptStyles.groupIconBg, { backgroundColor: colors.primary + '12' }]}>
                                        <Ionicons name={group.icon} size={18} color={colors.primary} />
                                    </View>
                                    <Text style={[ptStyles.groupTitle, { color: colors.text }]}>{group.title}</Text>
                                </View>
                                <View style={ptStyles.chipGrid}>
                                    {group.types.map((type) => {
                                        const isSelected = selectedTypes.includes(type);
                                        return (
                                            <TouchableOpacity
                                                key={type}
                                                style={[
                                                    ptStyles.chip,
                                                    isSelected
                                                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                                                        : { backgroundColor: chipBg, borderColor: colors.border }
                                                ]}
                                                onPress={() => onToggle(type)}
                                                activeOpacity={0.7}
                                            >
                                                {isSelected && (
                                                    <Ionicons name="checkmark-circle" size={14} color="#FFF" style={{ marginRight: 4 }} />
                                                )}
                                                <Text style={[
                                                    ptStyles.chipText,
                                                    { color: isSelected ? '#FFFFFF' : colors.text }
                                                ]}>
                                                    {type}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Done button */}
                    <View style={[ptStyles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                        <TouchableOpacity
                            style={[ptStyles.doneButton, { backgroundColor: colors.primary }]}
                            onPress={onClose}
                        >
                            <Text style={ptStyles.doneButtonText}>
                                Done{selectedTypes.length > 0 ? ` (${selectedTypes.length})` : ''}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose, onApply }) => {
    const { colors, isDark } = useTheme();
    const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
    const [minPrice, setMinPrice] = useState(50000);
    const [maxPrice, setMaxPrice] = useState(40000000);
    const [location, setLocation] = useState('');
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [showPropertyTypeModal, setShowPropertyTypeModal] = useState(false);

    const togglePropertyType = (type: string) => {
        setPropertyTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const toggleAmenity = (label: string) => {
        setSelectedAmenities(prev =>
            prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label]
        );
    };

    const handleReset = () => {
        setPropertyTypes([]);
        setMinPrice(50000);
        setMaxPrice(40000000);
        setLocation('');
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
                    {/* Property Type - Opens sub-modal */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Property Type</Text>
                        <TouchableOpacity
                            style={[styles.propertyTypeButton, { backgroundColor: secondaryBg, borderColor: colors.border }]}
                            onPress={() => setShowPropertyTypeModal(true)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.propertyTypeLeft}>
                                <Ionicons name="home-outline" size={20} color={colors.primary} />
                                <Text style={[styles.propertyTypeText, { color: colors.text }]}>
                                    {propertyTypes.length > 0
                                        ? `${propertyTypes.length} type${propertyTypes.length > 1 ? 's' : ''} selected`
                                        : 'Select property types'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Selected types preview chips */}
                        {propertyTypes.length > 0 && (
                            <View style={styles.selectedPreview}>
                                {propertyTypes.slice(0, 4).map((type) => (
                                    <View key={type} style={[styles.previewChip, { backgroundColor: colors.primary + '15' }]}>
                                        <Text style={[styles.previewChipText, { color: colors.primary }]} numberOfLines={1}>
                                            {type}
                                        </Text>
                                        <TouchableOpacity onPress={() => togglePropertyType(type)}>
                                            <Ionicons name="close-circle" size={14} color={colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {propertyTypes.length > 4 && (
                                    <View style={[styles.previewChip, { backgroundColor: colors.border }]}>
                                        <Text style={[styles.previewChipText, { color: colors.textSecondary }]}>
                                            +{propertyTypes.length - 4} more
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Price Range */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Price Range (per year)</Text>
                        <View style={styles.priceRow}>
                            <View style={styles.priceInputContainer}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Min</Text>
                                <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: inputBg }]}>
                                    <Text style={[styles.priceSymbol, { color: colors.text }]}>₦</Text>
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
                                    <Text style={[styles.priceSymbol, { color: colors.text }]}>₦</Text>
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
                                min={50000}
                                max={40000000}
                                step={500}
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
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities</Text>
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
                        onPress={() => onApply({ propertyTypes, minPrice, maxPrice, location, selectedAmenities })}
                    >
                        <Text style={styles.applyButtonText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Property Type Sub-Modal */}
            <PropertyTypeModal
                visible={showPropertyTypeModal}
                onClose={() => setShowPropertyTypeModal(false)}
                selectedTypes={propertyTypes}
                onToggle={togglePropertyType}
                onClear={() => setPropertyTypes([])}
            />
        </Modal>
    );
};

const ptStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
    },
    container: {
        height: SCREEN_HEIGHT * 0.85,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    closeBtn: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
    },
    clearText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '600',
    },
    selectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        marginHorizontal: 20,
        marginTop: 14,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    selectedText: {
        fontSize: 13,
        fontWeight: '600',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 100,
    },
    group: {
        marginBottom: 28,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    groupIconBg: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 22,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 34,
        borderTopWidth: 1,
    },
    doneButton: {
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

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
    propertyTypeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    propertyTypeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    propertyTypeText: {
        fontSize: 14,
        fontWeight: '500',
    },
    selectedPreview: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    previewChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    previewChipText: {
        fontSize: 12,
        fontWeight: '500',
        maxWidth: 100,
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
    },
    amenityChip: {
        paddingHorizontal: 14,
        height: 38,
        borderRadius: 19,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    amenityText: {
        fontSize: 12,
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
