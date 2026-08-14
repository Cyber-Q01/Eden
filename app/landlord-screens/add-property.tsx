import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/BackButton';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AmenitiesSelector from '../../components/AmenitiesSelector';
import BottomSheetPicker, { PickerOption } from '../../components/BottomSheetPicker';
import ScreenWrapper from '../../components/ScreenWrapper';
import StepIndicator from '../../components/StepIndicator';
import { useTheme } from '../../context/ThemeContext';
import { FormData, useAddPropertyForm } from '../../hooks/useAddPropertyForm';
import { useProperty } from '../../hooks/useProperties';
import { getLGAsForState, getStateNames } from '../../lib/nigeriaData';

// Extracted Step Components
import { PropertyStep0 } from '../../components/add-property/PropertyStep0';
import { PropertyStep1 } from '../../components/add-property/PropertyStep1';
import { PropertyStep2 } from '../../components/add-property/PropertyStep2';
import { PropertyStep3 } from '../../components/add-property/PropertyStep3';

// ─── Option datasets ──────────────────────────────────────────────────────────

const LISTING_PURPOSE_OPTIONS: PickerOption[] = [
    { label: 'For Rent', value: 'rent', icon: 'key-outline' },
    { label: 'For Sale', value: 'sale', icon: 'home-outline' },
];

const PROPERTY_TYPES: PickerOption[] = [
    { label: 'Self Contain', value: 'Self Contain', icon: 'cube-outline' },
    { label: 'Room and Parlour Self Contain', value: 'Room and Parlour Self Contain', icon: 'cube-outline' },
    { label: 'Mini Flat', value: 'Mini Flat', icon: 'bed-outline' },
    { label: '1 Bedroom Flat', value: '1 Bedroom Flat', icon: 'bed-outline' },
    { label: '2 Bedroom Flat', value: '2 Bedroom Flat', icon: 'bed-outline' },
    { label: '3 Bedroom Flat', value: '3 Bedroom Flat', icon: 'bed-outline' },
    { label: '4 Bedroom Flat', value: '4 Bedroom Flat', icon: 'bed-outline' },
    { label: 'Shared apartments', value: 'Shared apartments', icon: 'people-outline' },
    { label: 'Studio Apartment', value: 'Studio Apartment', icon: 'apps-outline' },
    { label: 'Block of Flats', value: 'Block of Flats', icon: 'business-outline' },
    { label: 'Detached Duplex', value: 'Detached Duplex', icon: 'layers-outline' },
    { label: 'Semi-Detached Duplex', value: 'Semi-Detached Duplex', icon: 'layers-outline' },
    { label: 'Terrace Duplex', value: 'Terrace Duplex', icon: 'business-outline' },
    { label: 'Terrace House', value: 'Terrace House', icon: 'business-outline' },
    { label: 'Bungalow', value: 'Bungalow', icon: 'home-outline' },
    { label: 'Detached House', value: 'Detached House', icon: 'home-outline' },
    { label: 'Semi-Detached House', value: 'Semi-Detached House', icon: 'home-outline' },
    { label: 'Mansion', value: 'Mansion', icon: 'castle-outline' },
    { label: 'Shop', value: 'Shop', icon: 'cart-outline' },
    { label: 'Office Space', value: 'Office Space', icon: 'briefcase-outline' },
    { label: 'Co-working Space', value: 'Co-working Space', icon: 'people-outline' },
    { label: 'Warehouse', value: 'Warehouse', icon: 'cube-outline' },
    { label: 'Event Hall', value: 'Event Hall', icon: 'color-wand-outline' },
    { label: 'Hotel/Guest House', value: 'Hotel/Guest House', icon: 'bed-outline' },
    { label: 'Plaza/Complex', value: 'Plaza/Complex', icon: 'business-outline' },
    { label: 'Residential Land', value: 'Residential Land', icon: 'map-outline' },
    { label: 'Commercial Land', value: 'Commercial Land', icon: 'map-outline' },
    { label: 'Industrial Land', value: 'Industrial Land', icon: 'map-outline' },
    { label: 'Farm Land', value: 'Farm Land', icon: 'leaf-outline' },
];

const BILLING_PERIOD_OPTIONS: PickerOption[] = [
    { label: 'Per Year', value: 'yearly', icon: 'calendar-outline' },
    { label: 'Per Month', value: 'monthly', icon: 'today-outline' },
    { label: 'Per Quarter', value: 'quarterly', icon: 'calendar-number-outline' },
];

const FURNISHING_OPTIONS: PickerOption[] = [
    { label: 'Unfurnished', value: 'unfurnished', icon: 'square-outline' },
    { label: 'Semi-furnished', value: 'semi-furnished', icon: 'grid-outline' },
    { label: 'Fully Furnished', value: 'furnished', icon: 'checkmark-circle-outline' },
];

const STEPS = ['Basics', 'Location', 'Details', 'Media'];

// ─── Main Screen ─────────────────────────────────────────────────────────────

const AddPropertyScreen = () => {
    const { id } = useLocalSearchParams();
    const isEdit = !!id;
    const { property, loading: fetchingProperty } = useProperty(id as string);
    const { colors } = useTheme();

    const {
        form,
        setField,
        currentStep,
        loading,
        landlords,
        modals,
        openModal,
        closeModal,
        handleNext,
        handleBack,
        handleSubmit,
        pickImage,
        pickVideo,
        role,
    } = useAddPropertyForm(isEdit, id as string, property);

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return (
                    <PropertyStep0
                        form={form}
                        setField={setField}
                        role={role}
                        landlords={landlords}
                        openModal={openModal}
                        colors={colors}
                    />
                );
            case 1:
                return (
                    <PropertyStep1
                        form={form}
                        setField={setField}
                        openModal={openModal}
                        colors={colors}
                    />
                );
            case 2:
                return (
                    <PropertyStep2
                        form={form}
                        setField={setField}
                        openModal={openModal}
                        colors={colors}
                    />
                );
            case 3:
                return (
                    <PropertyStep3
                        form={form}
                        setField={setField}
                        pickImage={pickImage}
                        pickVideo={pickVideo}
                        openModal={openModal}
                        colors={colors}
                    />
                );
            default:
                return null;
        }
    };

    const isLastStep = currentStep === STEPS.length - 1;

    if (isEdit && fetchingProperty) {
        return (
            <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 12, color: colors.textSecondary }}>Fetching property details...</Text>
            </ScreenWrapper>
        );
    }

    // Custom Circle-and-Line Step Indicator
    const renderSegmentedProgress = () => {
        return (
            <View style={styles.segmentedProgressContainer}>
                {Array.from({ length: STEPS.length }).map((_, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const isFuture = index > currentStep;
                    const isLast = index === STEPS.length - 1;

                    return (
                        <View key={index} style={styles.stepItemWrapper}>
                            {/* Dot */}
                            <View
                                style={[
                                    styles.stepDot,
                                    isCompleted || isCurrent
                                        ? { backgroundColor: colors.primary }
                                        : { backgroundColor: '#D1D5DB' },
                                ]}
                            >
                                {isFuture && (
                                    <View style={styles.stepDotInner} />
                                )}
                            </View>

                            {/* Connecting line after the dot (except last) */}
                            {!isLast && (
                                <View
                                    style={[
                                        styles.stepLine,
                                        {
                                            backgroundColor: isCompleted ? colors.primary : '#D1D5DB',
                                        },
                                    ]}
                                />
                            )}
                        </View>
                    );
                })}
            </View>
        );
    };

    const getNextButtonContent = () => {
        if (loading) {
            return <ActivityIndicator color="#FFF" />;
        }
        if (isLastStep) {
            return (
                <Text style={styles.nextBtnText}>
                    {isEdit ? 'Update' : 'Publish'}
                </Text>
            );
        }
        let label = 'Continue';
        if (currentStep === 0) label = 'Next: Location';
        else if (currentStep === 1) label = 'Next: Property Details';
        else if (currentStep === 2) label = 'Next: Media';

        return (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.nextBtnText}>{label}</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
            </View>
        );
    };

    const getBackButtonContent = () => {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="arrow-back" size={16} color={colors.text} style={{ marginRight: 6 }} />
                <Text style={[styles.backBtnText, { color: colors.text }]}>Back</Text>
            </View>
        );
    };

    return (
        <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Add new Listings</Text>
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                    Step {currentStep + 1} of {STEPS.length}
                </Text>
            </View>

            {/* Segmented Step indicator */}
            {renderSegmentedProgress()}

            {/* Form content */}
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {renderStep()}
            </ScrollView>

            {/* Footer navigation */}
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
                {currentStep > 0 && (
                    <TouchableOpacity
                        style={[styles.backBtn, { borderColor: colors.border }]}
                        onPress={handleBack}
                    >
                        {getBackButtonContent()}
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: colors.primary }]}
                    onPress={isLastStep ? handleSubmit : handleNext}
                    disabled={loading}
                >
                    {getNextButtonContent()}
                </TouchableOpacity>
            </View>

            {/* ── Bottom Sheet Modals ─────────────────────────────────── */}

            <BottomSheetPicker
                visible={modals.purpose}
                title="Listing Purpose"
                options={LISTING_PURPOSE_OPTIONS}
                selectedValue={form.listing_purpose}
                onSelect={v => setField('listing_purpose', v as 'rent' | 'sale')}
                onClose={() => closeModal('purpose')}
            />

            <BottomSheetPicker
                visible={modals.type}
                title="Property Type"
                options={PROPERTY_TYPES}
                selectedValue={form.type}
                onSelect={v => setField('type', v)}
                onClose={() => closeModal('type')}
            />

            <BottomSheetPicker
                visible={modals.billing}
                title="Billing Period"
                options={BILLING_PERIOD_OPTIONS}
                selectedValue={form.billing_period}
                onSelect={v => setField('billing_period', v as 'monthly' | 'quarterly' | 'yearly')}
                onClose={() => closeModal('billing')}
            />

            <BottomSheetPicker
                visible={modals.state}
                title="Select State"
                options={getStateNames().map(s => ({ label: s, value: s }))}
                selectedValue={form.state}
                onSelect={v => {
                    setField('state', v);
                    setField('lga', ''); // reset LGA when state changes
                }}
                onClose={() => closeModal('state')}
            />

            <BottomSheetPicker
                visible={modals.lga}
                title={`LGAs in ${form.state}`}
                options={getLGAsForState(form.state).map(l => ({ label: l, value: l }))}
                selectedValue={form.lga}
                onSelect={v => setField('lga', v)}
                onClose={() => closeModal('lga')}
            />

            <BottomSheetPicker
                visible={modals.furnishing}
                title="Furnishing Status"
                options={FURNISHING_OPTIONS}
                selectedValue={form.furnishing}
                onSelect={v => setField('furnishing', v as FormData['furnishing'])}
                onClose={() => closeModal('furnishing')}
            />

            <AmenitiesSelector
                visible={modals.amenities}
                selectedAmenities={form.amenities}
                onConfirm={v => setField('amenities', v)}
                onClose={() => closeModal('amenities')}
            />

            <BottomSheetPicker
                visible={modals.landlord}
                title="Select Landlord"
                options={landlords.map(l => ({
                    label: l.business_name || `${l.first_name} ${l.last_name}`,
                    value: l.id
                }))}
                selectedValue={form.landlord_id}
                onSelect={v => setField('landlord_id', v)}
                onClose={() => closeModal('landlord')}
            />
        </ScreenWrapper>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    stepText: {
        fontSize: 14,
        fontWeight: '600',
    },
    segmentedProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    stepItemWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    stepDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepDotInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    stepLine: {
        flex: 1,
        height: 5,
        borderRadius: 3,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 34,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    backBtn: {
        height: 52,
        paddingHorizontal: 24,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    nextBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default AddPropertyScreen;