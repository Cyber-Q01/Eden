import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AmenitiesSelector from '../../components/AmenitiesSelector';
import BottomSheetPicker, { PickerOption } from '../../components/BottomSheetPicker';
import ScreenWrapper from '../../components/ScreenWrapper';
import StepIndicator from '../../components/StepIndicator';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useLandlord } from '../../hooks/useLandlord';

import { getLGAsForState, getStateNames } from '../../lib/nigeriaData';
import {
    sanitizePrice,
    sanitizeText,
    validateAll,
    validateDescription,
    validatePrice,
    validateRequired,
} from '../../lib/validation';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
    // Step 1 – Basics
    listing_purpose: 'rent' | 'sale';
    title: string;
    description: string;
    price: string;
    billing_period: 'monthly' | 'quarterly' | 'yearly';
    type: string;
    agency_fee_percentage: number;
    caution_fee: string;
    legal_fee: string;
    total_price: number;

    // Step 2 – Location
    state: string;
    lga: string;
    location: string;       // street / neighbourhood
    landmark: string;

    // Step 3 – Details
    bedrooms: number;
    bathrooms: number;
    toilets: number;
    furnishing: 'furnished' | 'semi-furnished' | 'unfurnished';
    parking: boolean;

    // Step 4 – Amenities & Photos
    amenities: string[];
    images: string[];
};

// ─── Option datasets ──────────────────────────────────────────────────────────

const LISTING_PURPOSE_OPTIONS: PickerOption[] = [
    { label: 'For Rent', value: 'rent', icon: 'key-outline' },
    { label: 'For Sale', value: 'sale', icon: 'home-outline' },
];

const PROPERTY_TYPES: PickerOption[] = [
    { label: 'Self-contain', value: 'Self-contain', icon: 'cube-outline' },
    { label: '1 Bedroom Flat', value: '1 Bedroom', icon: 'bed-outline' },
    { label: '2 Bedroom Flat', value: '2 Bedroom', icon: 'bed-outline' },
    { label: '3 Bedroom Flat', value: '3 Bedroom', icon: 'bed-outline' },
    { label: 'Studio Apartment', value: 'Studio', icon: 'apps-outline' },
    { label: 'Duplex', value: 'Duplex', icon: 'layers-outline' },
    { label: 'Bungalow', value: 'Bungalow', icon: 'home-outline' },
    { label: 'Detached House', value: 'Detached House', icon: 'home-outline' },
    { label: 'Semi-detached', value: 'Semi-detached', icon: 'business-outline' },
    { label: 'Mansion', value: 'Mansion', icon: 'castle-outline' },
    { label: 'Shop/Office', value: 'Shop/Office', icon: 'storefront-outline' },
    { label: 'Land', value: 'Land', icon: 'map-outline' },
    { label: 'Warehouse', value: 'Warehouse', icon: 'cube-outline' },
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

const COUNTER_CONFIG = [
    { key: 'bedrooms' as const, label: 'Bedrooms', icon: 'bed-outline' },
    { key: 'bathrooms' as const, label: 'Bathrooms', icon: 'water-outline' },
    { key: 'toilets' as const, label: 'Toilets', icon: 'accessibility-outline' },
];

const STEPS = ['Basics', 'Location', 'Details', 'Media'];

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionTitle = ({ children, colors }: { children: string; colors: any }) => (
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{children}</Text>
);

const FieldLabel = ({ children, colors }: { children: React.ReactNode; colors: any }) => (
    <Text style={[styles.label, { color: colors.textSecondary }]}>{children}</Text>
);

const DropdownButton = ({
    value,
    placeholder,
    onPress,
    colors,
}: {
    value: string;
    placeholder: string;
    onPress: () => void;
    colors: any;
}) => (
    <TouchableOpacity
        style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[styles.dropdownText, { color: value ? colors.text : colors.textSecondary }]}>
            {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
);

const Counter = ({
    label,
    icon,
    value,
    onChange,
    colors,
}: {
    label: string;
    icon: string;
    value: number;
    onChange: (v: number) => void;
    colors: any;
}) => (
    <View style={[styles.counterRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.counterLeft}>
            <View style={[styles.counterIcon, { backgroundColor: colors.background }]}>
                <Ionicons name={icon as any} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.counterLabel, { color: colors.text }]}>{label}</Text>
        </View>
        <View style={styles.counterControls}>
            <TouchableOpacity
                style={[styles.counterBtn, { borderColor: colors.border }]}
                onPress={() => onChange(Math.max(0, value - 1))}
            >
                <Ionicons name="remove" size={16} color={value === 0 ? colors.border : colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.counterValue, { color: colors.text }]}>{value}</Text>
            <TouchableOpacity
                style={[styles.counterBtn, { borderColor: colors.border, backgroundColor: colors.primary }]}
                onPress={() => onChange(Math.min(20, value + 1))}
            >
                <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
        </View>
    </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

const AddPropertyScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { showError } = useToast();
    const { addProperty } = useLandlord();

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState<FormData>({
        listing_purpose: 'rent',
        title: '',
        description: '',
        price: '',
        billing_period: 'yearly',
        type: '',
        agency_fee_percentage: 5,
        caution_fee: '',
        legal_fee: '',
        total_price: 0,
        state: '',
        lga: '',
        location: '',
        landmark: '',
        bedrooms: 1,
        bathrooms: 1,
        toilets: 1,
        furnishing: 'unfurnished',
        parking: false,
        amenities: [],
        images: [],
    });

    // Modal visibility state
    const [modals, setModals] = useState({
        purpose: false,
        type: false,
        billing: false,
        state: false,
        lga: false,
        furnishing: false,
        amenities: false,
    });

    const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
        setForm(prev => ({ ...prev, [key]: value }));

    // Calculate total price automatically
    useEffect(() => {
        const rent = parseFloat(sanitizePrice(form.price)) || 0;
        const caution = parseFloat(sanitizePrice(form.caution_fee)) || 0;
        const legal = parseFloat(sanitizePrice(form.legal_fee)) || 0;
        const agency = (rent * form.agency_fee_percentage) / 100;
        
        const total = rent + agency + caution + legal;
        setField('total_price', total);
    }, [form.price, form.agency_fee_percentage, form.caution_fee, form.legal_fee]);

    const openModal = (key: keyof typeof modals) =>
        setModals(prev => ({ ...prev, [key]: true }));

    const closeModal = (key: keyof typeof modals) =>
        setModals(prev => ({ ...prev, [key]: false }));

    // ── Image picker ──────────────────────────────────────────────────────────

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 6 - form.images.length,
            quality: 0.4,
        });
        if (!result.canceled) {
            setField('images', [...form.images, ...result.assets.map(a => a.uri)]);
        }
    };

    // ── Step validation ───────────────────────────────────────────────────────

    const validateStep = (): string | null => {
        if (currentStep === 0) {
            return validateAll([
                { check: () => validateRequired(form.title, 'Property title') },
                { check: () => validateDescription(form.description, 20) },
                { check: () => validatePrice(form.price) },
                { check: () => validateRequired(form.type, 'Property type') },
            ]);
        }
        if (currentStep === 1) {
            return validateAll([
                { check: () => validateRequired(form.state, 'State') },
                { check: () => validateRequired(form.lga, 'LGA') },
                { check: () => validateRequired(form.location, 'Neighbourhood / address') },
            ]);
        }
        return null;
    };

    const handleNext = () => {
        const error = validateStep();
        if (error) {
            showError({ type: 'unknown', title: 'Required Fields', message: error });
            return;
        }
        setCurrentStep(s => s + 1);
    };

    const handleBack = () => {
        if (currentStep === 0) router.back();
        else setCurrentStep(s => s - 1);
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (form.images.length === 0) {
            showError({ type: 'unknown', title: 'Photos Required', message: 'Please add at least one photo of the property.' });
            return;
        }

        setLoading(true);
        const { error } = await addProperty(
            {
                title: sanitizeText(form.title),
                description: sanitizeText(form.description),
                price: parseFloat(sanitizePrice(form.price)),
                location: sanitizeText(form.location),
                type: form.type,
                listing_purpose: form.listing_purpose,
                billing_period: form.listing_purpose === 'rent' ? form.billing_period : undefined,
                state: form.state,
                lga: form.lga,
                landmark: form.landmark ? sanitizeText(form.landmark) : undefined,
                bedrooms: form.bedrooms,
                bathrooms: form.bathrooms,
                toilets: form.toilets,
                furnishing: form.furnishing,
                parking: form.parking,
                amenities: form.amenities,
                agency_fee_percentage: form.agency_fee_percentage,
                caution_fee: parseFloat(sanitizePrice(form.caution_fee)) || 0,
                legal_fee: parseFloat(sanitizePrice(form.legal_fee)) || 0,
                total_price: form.total_price,
            },
            form.images
        );
        setLoading(false);
        if (!error) router.back();
    };

    // ── Step renderers ────────────────────────────────────────────────────────

    const renderStep0 = () => (
        <View style={styles.stepContent}>
            <SectionTitle colors={colors}>What are you listing?</SectionTitle>

            {/* Listing purpose toggle */}
            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Listing Purpose</FieldLabel>
                <DropdownButton
                    value={LISTING_PURPOSE_OPTIONS.find(o => o.value === form.listing_purpose)?.label ?? ''}
                    placeholder="Select purpose"
                    onPress={() => openModal('purpose')}
                    colors={colors}
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Property Title</FieldLabel>
                <ThemedTextInput
                    value={form.title}
                    onChangeText={v => setField('title', v)}
                    placeholder="e.g. Spacious 2-bedroom flat in Lekki"
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Description</FieldLabel>
                <ThemedTextInput
                    value={form.description}
                    onChangeText={v => setField('description', v)}
                    placeholder="Describe the property in detail..."
                    multiline
                    numberOfLines={4}
                    containerStyle={styles.textAreaContainer}
                    style={styles.textArea}
                />
            </View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <FieldLabel colors={colors}>Price (₦)</FieldLabel>
                    <ThemedTextInput
                        value={form.price}
                        onChangeText={v => setField('price', v)}
                        placeholder="e.g. 500000"
                        keyboardType="numeric"
                    />
                </View>
                {form.listing_purpose === 'rent' && (
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <FieldLabel colors={colors}>Per</FieldLabel>
                        <DropdownButton
                            value={BILLING_PERIOD_OPTIONS.find(o => o.value === form.billing_period)?.label ?? ''}
                            placeholder="Period"
                            onPress={() => openModal('billing')}
                            colors={colors}
                        />
                    </View>
                )}
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Property Type</FieldLabel>
                <DropdownButton
                    value={form.type}
                    placeholder="Select property type"
                    onPress={() => openModal('type')}
                    colors={colors}
                />
            </View>

            {form.listing_purpose === 'rent' && (
                <View style={styles.feesSection}>
                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <FieldLabel colors={colors}>Agency Fee ({form.agency_fee_percentage}%)</FieldLabel>
                            <Text style={[styles.feeAmount, { color: colors.primary }]}>
                                ₦{((parseFloat(sanitizePrice(form.price)) || 0) * form.agency_fee_percentage / 100).toLocaleString()}
                            </Text>
                        </View>
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
                        <Text style={[styles.serviceNote, { color: colors.textSecondary }]}>
                            <Ionicons name="information-circle-outline" size={14} /> A service fee of 1.5% will be deducted from the rent amount.
                        </Text>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                            <FieldLabel colors={colors}>Caution Fee (₦)</FieldLabel>
                            <ThemedTextInput
                                value={form.caution_fee}
                                onChangeText={v => setField('caution_fee', v)}
                                placeholder="e.g. 50000"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <FieldLabel colors={colors}>Legal Fee (₦)</FieldLabel>
                            <ThemedTextInput
                                value={form.legal_fee}
                                onChangeText={v => setField('legal_fee', v)}
                                placeholder="e.g. 20000"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <FieldLabel colors={colors}>Total Package (Non-editable)</FieldLabel>
                        <View style={[styles.totalDisplay, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
                            <Text style={[styles.totalLabel, { color: colors.text }]}>Total to be paid by Tenant:</Text>
                            <Text style={[styles.totalValue, { color: colors.primary }]}>
                                ₦{form.total_price.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <SectionTitle colors={colors}>Where is it located?</SectionTitle>

            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>State</FieldLabel>
                <DropdownButton
                    value={form.state}
                    placeholder="Select state"
                    onPress={() => openModal('state')}
                    colors={colors}
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>LGA (Local Government Area)</FieldLabel>
                <DropdownButton
                    value={form.lga}
                    placeholder={form.state ? 'Select LGA' : 'Select state first'}
                    onPress={() => form.state && openModal('lga')}
                    colors={colors}
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Neighbourhood / Street Address</FieldLabel>
                <ThemedTextInput
                    value={form.location}
                    onChangeText={v => setField('location', v)}
                    placeholder="e.g. Lekki Phase 1, Victoria Island"
                />
            </View>

            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Nearest Landmark (optional)</FieldLabel>
                <ThemedTextInput
                    value={form.landmark}
                    onChangeText={v => setField('landmark', v)}
                    placeholder="e.g. Behind GTBank, Beside Shoprite"
                />
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContent}>
            <SectionTitle colors={colors}>Property details</SectionTitle>

            {/* Room counters */}
            {COUNTER_CONFIG.map(({ key, label, icon }) => (
                <Counter
                    key={key}
                    label={label}
                    icon={icon}
                    value={form[key]}
                    onChange={v => setField(key, v)}
                    colors={colors}
                />
            ))}

            <View style={[styles.inputGroup, { marginTop: 20 }]}>
                <FieldLabel colors={colors}>Furnishing Status</FieldLabel>
                <DropdownButton
                    value={FURNISHING_OPTIONS.find(o => o.value === form.furnishing)?.label ?? ''}
                    placeholder="Select furnishing"
                    onPress={() => openModal('furnishing')}
                    colors={colors}
                />
            </View>

            {/* Parking toggle */}
            <View style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={styles.counterLeft}>
                    <View style={[styles.counterIcon, { backgroundColor: colors.background }]}>
                        <Ionicons name="car-outline" size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.counterLabel, { color: colors.text }]}>Parking Space</Text>
                </View>
                <Switch
                    value={form.parking}
                    onValueChange={v => setField('parking', v)}
                    trackColor={{ false: colors.border, true: colors.primary + '80' }}
                    thumbColor={form.parking ? colors.primary : colors.textSecondary}
                />
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContent}>
            <SectionTitle colors={colors}>Photos & amenities</SectionTitle>

            {/* Photo grid */}
            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Property Photos (up to 6)</FieldLabel>
                <View style={styles.photoGrid}>
                    {form.images.map((uri, i) => (
                        <View key={i} style={[styles.photoBox, { backgroundColor: colors.card }]}>
                            <Image source={{ uri }} style={styles.photoImage} />
                            <TouchableOpacity
                                onPress={() => setField('images', form.images.filter((_, idx) => idx !== i))}
                                style={styles.removePhoto}
                            >
                                <Ionicons name="close-circle" size={22} color="#FF3B30" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {form.images.length < 6 && (
                        <TouchableOpacity
                            onPress={pickImage}
                            style={[styles.photoBox, styles.addPhotoBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                        >
                            <Ionicons name="camera-outline" size={28} color={colors.primary} />
                            <Text style={[styles.addPhotoText, { color: colors.primary }]}>Add</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Amenities */}
            <View style={styles.inputGroup}>
                <FieldLabel colors={colors}>Amenities</FieldLabel>
                <TouchableOpacity
                    style={[styles.amenitiesBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                    onPress={() => openModal('amenities')}
                    activeOpacity={0.7}
                >
                    <View style={styles.amenitiesBtnLeft}>
                        <Ionicons name="list-outline" size={20} color={colors.primary} />
                        <Text style={[styles.amenitiesBtnText, { color: form.amenities.length ? colors.text : colors.textSecondary }]}>
                            {form.amenities.length > 0
                                ? `${form.amenities.length} amenities selected`
                                : 'Select amenities'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Tags preview */}
                {form.amenities.length > 0 && (
                    <View style={styles.tagRow}>
                        {form.amenities.slice(0, 5).map(a => (
                            <View key={a} style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
                                <Text style={[styles.tagText, { color: colors.primary }]}>{a}</Text>
                            </View>
                        ))}
                        {form.amenities.length > 5 && (
                            <View style={[styles.tag, { backgroundColor: colors.border }]}>
                                <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                                    +{form.amenities.length - 5}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    );

    const STEP_RENDERERS = [renderStep0, renderStep1, renderStep2, renderStep3];
    const isLastStep = currentStep === STEPS.length - 1;

    return (
        <ScreenWrapper withScrollView={false} style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Add Property</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Step indicator */}
            <StepIndicator currentStep={currentStep} totalSteps={STEPS.length} labels={STEPS} />

            {/* Form content */}
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {STEP_RENDERERS[currentStep]()}
            </ScrollView>

            {/* Footer navigation */}
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                {currentStep > 0 && (
                    <TouchableOpacity
                        style={[styles.backBtn, { borderColor: colors.border }]}
                        onPress={handleBack}
                    >
                        <Text style={[styles.backBtnText, { color: colors.text }]}>Back</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: colors.primary }]}
                    onPress={isLastStep ? handleSubmit : handleNext}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.nextBtnText}>
                            {isLastStep ? 'List Property 🎉' : 'Continue'}
                        </Text>
                    )}
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    stepContent: {
        paddingTop: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 24,
        marginTop: 8,
    },
    inputGroup: {
        marginBottom: 18,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 52,
    },
    dropdownText: {
        fontSize: 15,
    },
    textAreaContainer: {
        height: 110,
        paddingTop: 14,
        alignItems: 'flex-start',
    },
    textArea: {
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
    },
    // Counters
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
    },
    counterLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    counterIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    counterControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    counterBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterValue: {
        fontSize: 16,
        fontWeight: '700',
        minWidth: 20,
        textAlign: 'center',
    },
    // Toggle
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 4,
    },
    // Photos
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    photoBox: {
        width: 100,
        height: 100,
        borderRadius: 12,
        overflow: 'visible',
        position: 'relative',
    },
    photoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    removePhoto: {
        position: 'absolute',
        top: -8,
        right: -8,
    },
    addPhotoBtn: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        gap: 4,
    },
    addPhotoText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Amenities
    amenitiesBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    amenitiesBtnLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    amenitiesBtnText: {
        fontSize: 15,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    // Footer
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
        paddingHorizontal: 20,
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
    // Fees Section
    feesSection: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    feeAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
    serviceNote: {
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 4,
        lineHeight: 18,
    },
    totalDisplay: {
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    totalLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 4,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
    },
});

export default AddPropertyScreen;