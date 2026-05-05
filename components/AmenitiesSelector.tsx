import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type AmenityItem = {
    label: string;
    icon: string;
    category: string;
};

const AMENITIES: AmenityItem[] = [
    // Power
    { label: 'PHCN Power', icon: 'flash-outline', category: 'Power' },
    { label: 'Generator', icon: 'battery-charging-outline', category: 'Power' },
    { label: 'Solar Power', icon: 'sunny-outline', category: 'Power' },
    { label: 'Inverter', icon: 'thunderstorm-outline', category: 'Power' },
    // Water
    { label: 'Borehole Water', icon: 'water-outline', category: 'Water' },
    { label: 'Running Water', icon: 'rainy-outline', category: 'Water' },
    { label: 'Water Heater', icon: 'thermometer-outline', category: 'Water' },
    // Security
    { label: 'Security Guard', icon: 'shield-checkmark-outline', category: 'Security' },
    { label: 'Fence/Gate', icon: 'lock-closed-outline', category: 'Security' },
    { label: 'CCTV', icon: 'videocam-outline', category: 'Security' },
    { label: 'Estate', icon: 'business-outline', category: 'Security' },
    // Facilities
    { label: 'Swimming Pool', icon: 'water', category: 'Facilities' },
    { label: 'Gym', icon: 'fitness-outline', category: 'Facilities' },
    { label: 'Parking Space', icon: 'car-outline', category: 'Facilities' },
    { label: 'Balcony', icon: 'home-outline', category: 'Facilities' },
    { label: 'Garden', icon: 'leaf-outline', category: 'Facilities' },
    { label: 'Playground', icon: 'football-outline', category: 'Facilities' },
    // Internet & Tech
    { label: 'WiFi', icon: 'wifi-outline', category: 'Tech' },
    { label: 'Cable TV', icon: 'tv-outline', category: 'Tech' },
    { label: 'Smart Home', icon: 'phone-portrait-outline', category: 'Tech' },
    // Others
    { label: 'Air Conditioning', icon: 'snow-outline', category: 'Others' },
    { label: 'Tiled Floors', icon: 'grid-outline', category: 'Others' },
    { label: 'POP Ceiling', icon: 'layers-outline', category: 'Others' },
    { label: 'Kitchen Cabinet', icon: 'restaurant-outline', category: 'Others' },
    { label: 'Wardrobe', icon: 'archive-outline', category: 'Others' },
];

const CATEGORIES = [...new Set(AMENITIES.map(a => a.category))];

type Props = {
    visible: boolean;
    selectedAmenities: string[];
    onConfirm: (amenities: string[]) => void;
    onClose: () => void;
};

const AmenitiesSelector = ({ visible, selectedAmenities, onConfirm, onClose }: Props) => {
    const { colors } = useTheme();
    const [selected, setSelected] = useState<string[]>(selectedAmenities);
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setSelected(selectedAmenities);
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
            onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
            onPanResponderRelease: (_, g) => {
                if (g.dy > 80 || g.vy > 0.5) closeSheet();
                else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }).start();
            },
        })
    ).current;

    const closeSheet = () => {
        Animated.parallel([
            Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onClose());
    };

    const toggleAmenity = (label: string) => {
        setSelected(prev =>
            prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label]
        );
    };

    const handleConfirm = () => {
        onConfirm(selected);
        closeSheet();
    };

    const filteredAmenities = AMENITIES.filter(a => a.category === activeCategory);

    if (!visible) return null;

    return (
        <Modal transparent visible = { visible } animationType = "none" onRequestClose = { closeSheet } >
            <TouchableWithoutFeedback onPress={ closeSheet }>
                <Animated.View style={ [styles.backdrop, { opacity: backdropOpacity }] } />
                    </TouchableWithoutFeedback>

                    < Animated.View style = { [styles.sheet, { backgroundColor: colors.background, transform: [{ translateY }] }]} >
                        {/* Drag handle */ }
                        < View {...panResponder.panHandlers } style = { styles.dragArea } >
                            <View style={ [styles.handle, { backgroundColor: colors.border }] } />
                                </View>

    {/* Header */ }
    <View style={ [styles.header, { borderBottomColor: colors.border }] }>
        <View>
        <Text style={ [styles.title, { color: colors.text }] }> Amenities </Text>
    {
        selected.length > 0 && (
            <Text style={ [styles.subtitle, { color: colors.primary }] }>
                { selected.length } selected
                    </Text>
                        )}
</View>
    < TouchableOpacity onPress = { closeSheet } style = { styles.closeBtn } >
        <Ionicons name="close" size = { 22} color = { colors.textSecondary } />
            </TouchableOpacity>
            </View>

{/* Category tabs */ }
<ScrollView
                    horizontal
showsHorizontalScrollIndicator = { false}
style = { styles.categoryScroll }
contentContainerStyle = { styles.categoryContent }
    >
{
    CATEGORIES.map(cat => {
        const isActive = cat === activeCategory;
        const countInCat = AMENITIES.filter(a => a.category === cat && selected.includes(a.label)).length;
        return (
            <TouchableOpacity
                                key= { cat }
        onPress = {() => setActiveCategory(cat)
    }
                                style = {
            [
            styles.categoryTab,
            { borderColor: colors.border },
            isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                                ]}
        >
        <Text style={ [styles.categoryText, { color: isActive ? '#fff' : colors.textSecondary }]} >
        { cat }
    </Text>
                                { countInCat > 0 && (
            <View style={ [styles.badge, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : colors.primary }]} >
    <Text style={ styles.badgeText } > { countInCat } </Text>
    </View>
    )
}
    </TouchableOpacity>
                        );
                    })}
</ScrollView>

{/* Amenities grid */ }
<ScrollView showsVerticalScrollIndicator={ false } style = { styles.grid } contentContainerStyle = { styles.gridContent } >
    <View style={ styles.gridRow }>
    {
        filteredAmenities.map(item => {
            const isSelected = selected.includes(item.label);
            return (
                <TouchableOpacity
                                    key= { item.label }
            style = {
                [
                styles.amenityCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                isSelected && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                                    ]}
            onPress = {() => toggleAmenity(item.label)
        }
                                    activeOpacity = { 0.7}
            >
            <View style={
                [
                styles.amenityIcon,
                { backgroundColor: isSelected ? colors.primary : colors.background },
                                    ]} >
        <Ionicons name={ item.icon as any } size = { 20} color = { isSelected? '#fff': colors.textSecondary } />
        </View>
        < Text style = { [styles.amenityLabel, { color: isSelected ? colors.primary : colors.text }]} numberOfLines = { 2} >
        { item.label }
        </Text>
                                    { isSelected && (
                <View style={ [styles.checkmark, { backgroundColor: colors.primary }]} >
        <Ionicons name="checkmark" size = { 10} color = "#fff" />
        </View>
        )
    }
        </TouchableOpacity>
                            );
                        })}
</View>
    </ScrollView>

{/* Confirm button */ }
<View style={ [styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }] }>
{
    selected.length > 0 && (
        <TouchableOpacity
                            onPress={ () => setSelected([]) }
style = { styles.clearBtn }
    >
    <Text style={ [styles.clearText, { color: colors.textSecondary }] }> Clear all </Text>
        </TouchableOpacity>
                    )}
<TouchableOpacity
                        style={ [styles.confirmBtn, { backgroundColor: colors.primary }] }
onPress = { handleConfirm }
    >
    <Text style={ styles.confirmText }>
        { selected.length > 0 ? `Confirm (${selected.length})` : 'Skip' }
        </Text>
        </TouchableOpacity>
        </View>
        </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: SCREEN_HEIGHT * 0.75,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 20,
    },
    dragArea: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryScroll: {
        maxHeight: 56,
        marginTop: 12,
    },
    categoryContent: {
        paddingHorizontal: 16,
        gap: 8,
        alignItems: 'center',
    },
    categoryTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        gap: 4,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '600',
    },
    badge: {
        borderRadius: 10,
        paddingHorizontal: 5,
        paddingVertical: 1,
        minWidth: 18,
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    grid: {
        flex: 1,
        marginTop: 12,
    },
    gridContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    gridRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    amenityCard: {
        width: '30%',
        aspectRatio: 0.9,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        gap: 6,
        position: 'relative',
    },
    amenityIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    amenityLabel: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },
    checkmark: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 34,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    clearBtn: {
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    clearText: {
        fontSize: 14,
        fontWeight: '500',
    },
    confirmBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default AmenitiesSelector;