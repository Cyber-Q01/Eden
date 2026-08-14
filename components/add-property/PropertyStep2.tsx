import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { FieldLabel } from './Common';

const FURNISHING_OPTIONS = [
    { label: 'Furnished', value: 'furnished' },
    { label: 'Semi-Furnished', value: 'semi-furnished' },
    { label: 'Unfurnished', value: 'unfurnished' },
];

const CONDITION_OPTIONS = [
    { label: 'New', value: 'new' },
    { label: 'Good', value: 'good' },
    { label: 'Fair', value: 'fair' },
];

// Reusable Segmented Pill Selector
interface PillSelectorProps {
    options: { label: string; value: string }[];
    selectedValue: string;
    onSelect: (value: any) => void;
}

const PillSelector = ({ options, selectedValue, onSelect }: PillSelectorProps) => {
    const { colors } = useTheme();
    return (
        <View style={styles.pillContainer}>
            {options.map(opt => {
                const isSelected = opt.value === selectedValue;
                return (
                    <TouchableOpacity
                        key={opt.value}
                        style={[
                            styles.pillButton,
                            isSelected
                                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                                : { backgroundColor: colors.card, borderColor: colors.border }
                        ]}
                        onPress={() => onSelect(opt.value)}
                    >
                        <Text
                            style={[
                                styles.pillText,
                                isSelected ? { color: '#FFFFFF', fontWeight: '600' } : { color: colors.textSecondary }
                            ]}
                        >
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

// Custom Row Counter component for Rooms card
interface RowCounterProps {
    label: string;
    value: number;
    onChange: (v: number) => void;
}

const RowCounter = ({ label, value, onChange }: RowCounterProps) => {
    const { colors, isDark } = useTheme();
    return (
        <View style={styles.counterRow}>
            <Text style={[styles.counterLabel, { color: colors.text }]}>{label}</Text>
            <View style={styles.counterControls}>
                <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: isDark ? colors.border : '#EFF6FF' }]}
                    onPress={() => onChange(Math.max(0, value - 1))}
                >
                    <Ionicons name="remove" size={16} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.counterValue, { color: colors.text }]}>{value}</Text>
                <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: isDark ? colors.border : '#EFF6FF' }]}
                    onPress={() => onChange(value + 1)}
                >
                    <Ionicons name="add" size={16} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export const PropertyStep2 = ({ form, setField, openModal }: any) => {
    const { colors, isDark } = useTheme();
    const isLand = form.type.toLowerCase().includes('land');

    // Local states for cosmetic fields in the mockup
    const [floorLevel, setFloorLevel] = React.useState('Ground Floor');
    const [condition, setCondition] = React.useState('new');
    const [bq, setBq] = React.useState(false);

    if (isLand) {
        return (
            <View style={styles.stepContent}>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>Property Details</Text>
                <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                    <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.text }]}>
                        This property is listed as Land. Indoor features like bedrooms and furnishing are not applicable.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.stepContent}>
            <Text style={[styles.sectionHeader, { color: colors.text }]}>Property Details</Text>

            {/* Rooms Card */}
            <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Rooms</Text>
                <RowCounter
                    label="Bedrooms"
                    value={form.bedrooms}
                    onChange={v => setField('bedrooms', v)}
                />
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
                <RowCounter
                    label="Bathrooms"
                    value={form.bathrooms}
                    onChange={v => setField('bathrooms', v)}
                />
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
                <RowCounter
                    label="Toilets"
                    value={form.toilets}
                    onChange={v => setField('toilets', v)}
                />
            </View>

            {/* Furnished Status */}
            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Furnished Status</FieldLabel>
                <PillSelector
                    options={FURNISHING_OPTIONS}
                    selectedValue={form.furnishing}
                    onSelect={v => setField('furnishing', v)}
                />
            </View>

            {/* Parking Space Toggle */}
            <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.toggleLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: isDark ? colors.border : '#EFF6FF' }]}>
                        <Ionicons name="car-outline" size={20} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Parking Space</Text>
                        <Text style={[styles.toggleSublabel, { color: colors.textSecondary }]}>Available parking for tenants</Text>
                    </View>
                </View>
                <Switch
                    value={form.parking}
                    onValueChange={v => setField('parking', v)}
                    trackColor={{ false: colors.border, true: colors.primary + '80' }}
                    thumbColor={form.parking ? colors.primary : colors.textSecondary}
                />
            </View>

            {/* Floor Level (Cosmetic Dropdown) */}
            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Floor Level</FieldLabel>
                <TouchableOpacity
                    style={[styles.dropdownStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => {
                        // Simulated select list: toggle ground floor / 1st floor
                        setFloorLevel(prev => prev === 'Ground Floor' ? '1st Floor' : 'Ground Floor');
                    }}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.dropdownText, { color: colors.text }]}>{floorLevel}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Property Condition (Cosmetic Pill Selector) */}
            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Property Condition</FieldLabel>
                <PillSelector
                    options={CONDITION_OPTIONS}
                    selectedValue={condition}
                    onSelect={v => setCondition(v)}
                />
            </View>

            {/* Boys Quarters (Cosmetic Toggle) */}
            <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.toggleLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: isDark ? colors.border : '#EFF6FF' }]}>
                        <Ionicons name="home-outline" size={20} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Boys Quarters</Text>
                        <Text style={[styles.toggleSublabel, { color: colors.textSecondary }]}>Separate staff quarters</Text>
                    </View>
                </View>
                <Switch
                    value={bq}
                    onValueChange={v => setBq(v)}
                    trackColor={{ false: colors.border, true: colors.primary + '80' }}
                    thumbColor={bq ? colors.primary : colors.textSecondary}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    stepContent: {
        paddingBottom: 40,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    cardContainer: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 16,
    },
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    counterLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    counterControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    counterBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterValue: {
        width: 40,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '700',
    },
    separator: {
        height: 1,
        marginVertical: 4,
    },
    inputGroup: {
        marginBottom: 20,
    },
    pillContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    pillButton: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pillText: {
        fontSize: 14,
        fontWeight: '500',
    },
    toggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    toggleLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    toggleSublabel: {
        fontSize: 12,
        marginTop: 2,
    },
    dropdownStyle: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 52,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownText: {
        fontSize: 15,
    },
    infoCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        marginTop: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        marginLeft: 12,
        lineHeight: 20,
    },
});
