import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { sanitizePrice } from '../../lib/validation';
import { useTheme } from '../../context/ThemeContext';
import ThemedTextInput from '../ThemedTextInput';
import { Counter, DropdownButton, FieldLabel } from './Common';

const LISTING_PURPOSE_OPTIONS = [
    { label: 'For Rent', value: 'rent' },
    { label: 'For Sale', value: 'sale' },
];

const BILLING_PERIOD_OPTIONS = [
    { label: 'Yearly', value: 'yearly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Monthly', value: 'monthly' },
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

export const PropertyStep0 = ({ form, setField, role, landlords, openModal }: any) => {
    const { colors, isDark } = useTheme();
    const isRent = form.listing_purpose === 'rent';
    const agencyFeeAmount = ((parseFloat(sanitizePrice(form.price)) || 0) * form.agency_fee_percentage / 100);

    // Dynamic warning banner colors for Light and Dark modes
    const bannerBg = isDark ? '#451A03' : '#FEF3C7';
    const bannerBorder = isDark ? '#78350F' : '#FDE68A';
    const bannerTitle = isDark ? '#F59E0B' : '#92400E';
    const bannerText = isDark ? '#FCD34D' : '#B45309';

    return (
        <View style={styles.stepContent}>
            {/* Listing Purpose */}
            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Listing Purpose</FieldLabel>
                <PillSelector
                    options={LISTING_PURPOSE_OPTIONS}
                    selectedValue={form.listing_purpose}
                    onSelect={v => setField('listing_purpose', v)}
                />
            </View>

            {/* Property Info Section */}
            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>Property Info</Text>

                {/* Simulated Listing Type Pill Selector */}
                <View style={styles.inputGroup}>
                    <FieldLabel colors={colors}>Listing Type</FieldLabel>
                    <View style={styles.pillContainer}>
                        <TouchableOpacity
                            style={[
                                styles.pillButton,
                                role !== 'AGENT'
                                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                                    : { backgroundColor: colors.card, borderColor: colors.border }
                            ]}
                            disabled={true}
                        >
                            <Text
                                style={[
                                    styles.pillText,
                                    role !== 'AGENT' ? { color: '#FFFFFF', fontWeight: '600' } : { color: colors.textSecondary }
                                ]}
                            >
                                Landlord(No Agency Fee)
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.pillButton,
                                role === 'AGENT'
                                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                                    : { backgroundColor: colors.card, borderColor: colors.border }
                            ]}
                            disabled={true}
                        >
                            <Text
                                style={[
                                    styles.pillText,
                                    role === 'AGENT' ? { color: '#FFFFFF', fontWeight: '600' } : { color: colors.textSecondary }
                                ]}
                            >
                                Agent
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {role === 'AGENT' && (
                    <View style={styles.inputGroup}>
                        <FieldLabel colors={colors}>Select Landlord</FieldLabel>
                        <DropdownButton
                            value={(() => {
                                const l = landlords.find((lx: any) => lx.id === form.landlord_id);
                                if (!l) return '';
                                return l.business_name || `${l.first_name} ${l.last_name}`;
                            })()}
                            placeholder="Select the landlord for this property"
                            onPress={() => openModal('landlord')}
                            colors={colors}
                        />
                    </View>
                )}

                <View style={styles.inputGroup}>
                    <FieldLabel colors={colors}>Property Title</FieldLabel>
                    <ThemedTextInput
                        value={form.title}
                        onChangeText={(v: string) => setField('title', v)}
                        placeholder="2 Bedroom Flat with Parking"
                        containerStyle={[styles.textInputStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <FieldLabel colors={colors}>Property Type</FieldLabel>
                    <DropdownButton
                        value={form.type}
                        placeholder="Select Property Type......"
                        onPress={() => openModal('type')}
                        colors={colors}
                        style={[styles.dropdownStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <FieldLabel colors={colors}>Description</FieldLabel>
                    <ThemedTextInput
                        value={form.description}
                        onChangeText={(v: string) => setField('description', v)}
                        placeholder="Describe your property, Mention key features, nearby landmarks and any special conditions..."
                        multiline
                        numberOfLines={4}
                        containerStyle={[styles.textAreaContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
                        style={styles.textArea}
                        maxLength={500}
                    />
                    <Text style={[styles.charCounter, { color: colors.textSecondary }]}>
                        {form.description ? form.description.length : 0}/500
                    </Text>
                </View>

                {form.type.toLowerCase().includes('land') && (
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 2, marginRight: 10 }]}>
                            <FieldLabel colors={colors}>Land Size</FieldLabel>
                            <ThemedTextInput
                                value={form.land_size}
                                onChangeText={(v: string) => setField('land_size', v)}
                                placeholder="e.g. 2"
                                keyboardType="numeric"
                                containerStyle={[styles.textInputStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1.5 }]}>
                            <FieldLabel colors={colors}>Unit</FieldLabel>
                            <View style={styles.unitToggleContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.unitToggleBtn,
                                        { borderColor: colors.border },
                                        form.land_measurement_unit === 'plots' && { backgroundColor: colors.primary, borderColor: colors.primary }
                                    ]}
                                    onPress={() => setField('land_measurement_unit', 'plots')}
                                >
                                    <Text style={[styles.unitToggleText, { color: colors.textSecondary }, form.land_measurement_unit === 'plots' && { color: '#FFF' }]}>Plots</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.unitToggleBtn,
                                        { borderColor: colors.border },
                                        form.land_measurement_unit === 'acres' && { backgroundColor: colors.primary, borderColor: colors.primary }
                                    ]}
                                    onPress={() => setField('land_measurement_unit', 'acres')}
                                >
                                    <Text style={[styles.unitToggleText, { color: colors.textSecondary }, form.land_measurement_unit === 'acres' && { color: '#FFF' }]}>Acres</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* Pricing Section */}
            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>Pricing</Text>

                <View style={styles.inputGroup}>
                    <FieldLabel colors={colors}>{isRent ? 'Annual Rent (₦)' : 'Sale Price (₦)'}</FieldLabel>
                    <ThemedTextInput
                        value={form.price}
                        onChangeText={(v: string) => setField('price', v)}
                        placeholder="0.00"
                        keyboardType="numeric"
                        containerStyle={[styles.textInputStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
                        leftIcon={<Text style={[styles.prefixText, { color: colors.primary }]}>N</Text>}
                    />
                </View>

                {isRent && (
                    <View style={styles.inputGroup}>
                        <FieldLabel colors={colors}>Payment Plan</FieldLabel>
                        <PillSelector
                            options={BILLING_PERIOD_OPTIONS}
                            selectedValue={form.billing_period}
                            onSelect={v => setField('billing_period', v)}
                        />
                    </View>
                )}

                {role === 'AGENT' && isRent && (
                    <View style={styles.inputGroup}>
                        <FieldLabel colors={colors}>Agency Fee (₦)</FieldLabel>
                        <ThemedTextInput
                            value={agencyFeeAmount > 0 ? agencyFeeAmount.toFixed(2) : '0.00'}
                            editable={false}
                            containerStyle={[styles.textInputStyle, { backgroundColor: colors.background, borderColor: colors.border }]}
                            leftIcon={<Text style={[styles.prefixText, { color: colors.primary }]}>N</Text>}
                        />
                        <View style={{ marginTop: 12 }}>
                            <FieldLabel colors={colors}>Agency Fee Percentage ({form.agency_fee_percentage}%)</FieldLabel>
                            <Slider
                                style={{ width: '100%', height: 40 }}
                                minimumValue={1}
                                maximumValue={9}
                                step={1}
                                value={form.agency_fee_percentage}
                                onValueChange={v => setField('agency_fee_percentage', v)}
                                minimumTrackTintColor={colors.primary}
                                maximumTrackTintColor={colors.border}
                                thumbTintColor={colors.primary}
                            />
                        </View>
                    </View>
                )}

                {isRent && (
                    <>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                <FieldLabel colors={colors}>Caution Fee (₦)</FieldLabel>
                                <ThemedTextInput
                                    value={form.caution_fee}
                                    onChangeText={(v: string) => setField('caution_fee', v)}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    containerStyle={[styles.textInputStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    leftIcon={<Text style={[styles.prefixText, { color: colors.primary }]}>N</Text>}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <FieldLabel colors={colors}>Legal Fee (₦)</FieldLabel>
                                <ThemedTextInput
                                    value={form.legal_fee}
                                    onChangeText={(v: string) => setField('legal_fee', v)}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    containerStyle={[styles.textInputStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    leftIcon={<Text style={[styles.prefixText, { color: colors.primary }]}>N</Text>}
                                />
                            </View>
                        </View>

                        {/* Platform Service Warning */}
                        <View style={[styles.warningBanner, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
                            <Ionicons name="warning" size={20} color="#F59E0B" style={{ marginRight: 10, marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.warningTitle, { color: bannerTitle }]}>Platform Service Change</Text>
                                <Text style={[styles.warningText, { color: bannerText }]}>
                                    Eden deducts 1.5% from each rent payment as a platform fee. This is charged to the tenant
                                </Text>
                            </View>
                        </View>

                        {/* Total Display */}
                        <View style={styles.inputGroup}>
                            <FieldLabel colors={colors}>Total Package (Non-editable)</FieldLabel>
                            <View style={[styles.totalDisplay, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}>
                                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total to be paid by Tenant:</Text>
                                <Text style={[styles.totalValue, { color: colors.primary }]}>
                                    ₦{form.total_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                            </View>
                        </View>
                    </>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    stepContent: {
        paddingBottom: 40,
    },
    sectionContainer: {
        marginTop: 20,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    textInputStyle: {
        borderWidth: 1,
        borderRadius: 14,
        height: 52,
    },
    dropdownStyle: {
        borderWidth: 1,
        borderRadius: 14,
        height: 52,
    },
    textAreaContainer: {
        height: 120,
        alignItems: 'flex-start',
        paddingTop: 12,
        borderWidth: 1,
        borderRadius: 14,
    },
    textArea: {
        height: '100%',
        textAlignVertical: 'top',
        fontSize: 15,
    },
    charCounter: {
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    prefixText: {
        fontWeight: '700',
        fontSize: 16,
        marginRight: 8,
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
        textAlign: 'center',
    },
    unitToggleContainer: {
        flexDirection: 'row',
        height: 52,
        gap: 8,
    },
    unitToggleBtn: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unitToggleText: {
        fontSize: 14,
        fontWeight: '600',
    },
    warningBanner: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        marginTop: 10,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    warningText: {
        fontSize: 13,
        lineHeight: 18,
    },
    totalDisplay: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    totalLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 4,
    },
    totalValue: {
        fontSize: 22,
        fontWeight: '800',
    },
});
