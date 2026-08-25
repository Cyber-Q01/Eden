import { useState, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useLandlord } from './useLandlord';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useAgentManagement } from './useAgentManagement';
import {
    sanitizePrice,
    sanitizeText,
    validateAll,
    validateDescription,
    validatePrice,
    validateRequired,
} from '../lib/validation';

export type FormData = {
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
    state: string;
    lga: string;
    location: string;
    landmark: string;
    bedrooms: number;
    bathrooms: number;
    toilets: number;
    furnishing: 'furnished' | 'semi-furnished' | 'unfurnished';
    parking: boolean;
    amenities: string[];
    images: string[];
    video_url?: string;
    has_multiple_units: boolean;
    units_count: number;
    land_size?: string;
    land_measurement_unit?: 'plots' | 'acres';
    landlord_id?: string;
};

export const useAddPropertyForm = (isEdit: boolean, propertyId?: string, initialProperty?: any) => {
    const router = useRouter();
    const { showError } = useToast();
    const { addProperty, updateProperty } = useLandlord();
    const { role } = useAuth();
    const { fetchLandlords } = useAgentManagement();

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [landlords, setLandlords] = useState<any[]>([]);
    
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
        has_multiple_units: false,
        units_count: 1,
        land_size: '',
        land_measurement_unit: 'plots',
    });

    const [modals, setModals] = useState({
        purpose: false,
        type: false,
        billing: false,
        state: false,
        lga: false,
        furnishing: false,
        amenities: false,
        landlord: false,
    });

    const setField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) =>
        setForm(prev => ({ ...prev, [key]: value })), []);

    const openModal = (key: keyof typeof modals) => setModals(prev => ({ ...prev, [key]: true }));
    const closeModal = (key: keyof typeof modals) => setModals(prev => ({ ...prev, [key]: false }));

    // Pre-fill form if in edit mode
    useEffect(() => {
        if (isEdit && initialProperty) {
            setForm({
                listing_purpose: initialProperty.listing_purpose || 'rent',
                title: initialProperty.title || '',
                description: initialProperty.description || '',
                price: initialProperty.price?.toString() || '',
                billing_period: initialProperty.billing_period || 'yearly',
                type: initialProperty.type || '',
                agency_fee_percentage: initialProperty.agency_fee_percentage || 5,
                caution_fee: initialProperty.caution_fee?.toString() || '',
                legal_fee: initialProperty.legal_fee?.toString() || '',
                total_price: initialProperty.total_price || 0,
                state: initialProperty.state || '',
                lga: initialProperty.lga || '',
                location: initialProperty.location || '',
                landmark: initialProperty.landmark || '',
                bedrooms: initialProperty.bedrooms || 1,
                bathrooms: initialProperty.bathrooms || 1,
                toilets: initialProperty.toilets || 1,
                furnishing: initialProperty.furnishing || 'unfurnished',
                parking: initialProperty.parking || false,
                amenities: initialProperty.amenities || [],
                images: initialProperty.images || [],
                has_multiple_units: initialProperty.has_multiple_units || false,
                units_count: initialProperty.units_count || 1,
                land_size: initialProperty.land_size?.toString() || '',
                land_measurement_unit: initialProperty.land_measurement_unit || 'plots',
                landlord_id: initialProperty.landlord_id || '',
            });
        }
    }, [initialProperty, isEdit]);

    useEffect(() => {
        if (role === 'AGENT') {
            fetchLandlords().then(setLandlords);
        }
    }, [role]);

    // Calculate total price automatically (Rent + 5% Platform Service Fee + ₦1,000 Escrow Fee + Agency + Caution + Legal)
    useEffect(() => {
        const rent = parseFloat(sanitizePrice(form.price)) || 0;
        const caution = parseFloat(sanitizePrice(form.caution_fee)) || 0;
        const legal = parseFloat(sanitizePrice(form.legal_fee)) || 0;
        const agency = role === 'AGENT' ? (rent * form.agency_fee_percentage) / 100 : 0;
        const serviceFee = (rent * 5.0) / 100;
        const escrowFee = rent > 0 ? 1000 : 0;

        const total = rent + serviceFee + escrowFee + agency + caution + legal;
        setField('total_price', total);
    }, [form.price, form.agency_fee_percentage, form.caution_fee, form.legal_fee, role, setField]);

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

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 15 * 1024 * 1024) {
                showError({ type: 'unknown', title: 'Video Too Large', message: 'Please select a video smaller than 15MB.' });
                return;
            }
            setField('video_url', asset.uri);
        }
    };

    const validateStep = (): string | null => {
        if (currentStep === 0) {
            const checks: any[] = [
                { check: () => validateRequired(form.title, 'Property title') },
                { check: () => validateDescription(form.description, 20) },
                { check: () => validatePrice(form.price) },
                { check: () => validateRequired(form.type, 'Property type') },
            ];

            if (role === 'AGENT') {
                checks.push({ check: () => validateRequired(form.landlord_id || '', 'Landlord') });
            }

            return validateAll(checks);
        }
        if (currentStep === 1) {
            return validateAll([
                { check: () => validateRequired(form.state, 'State') },
                { check: () => validateRequired(form.lga, 'LGA') },
                { check: () => validateRequired(form.location, 'Neighbourhood / address') },
                { check: () => validateRequired(form.landmark, 'Landmark') },
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
        else setCurrentStep(s => s - s % 1 - 1); // logic check: s - 1
    };

    const handleSubmit = async () => {
        // Pending (under moderation review) listings cannot be edited or republished
        if (isEdit && initialProperty && (initialProperty.moderation_status || 'pending').toLowerCase() === 'pending') {
            showError({
                type: 'unknown',
                title: 'Listing Under Review',
                message: 'This property is pending admin approval and cannot be edited right now. Please wait for the moderation review to complete.',
            });
            return;
        }

        if (form.images.length === 0) {
            showError({ type: 'unknown', title: 'Photos Required', message: 'Please add at least one photo of the property.' });
            return;
        }

        setLoading(true);
        const propertyData = {
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
            agency_fee_percentage: role === 'AGENT' ? form.agency_fee_percentage : 0,
            caution_fee: parseFloat(sanitizePrice(form.caution_fee)) || 0,
            legal_fee: parseFloat(sanitizePrice(form.legal_fee)) || 0,
            total_price: form.total_price,
            has_multiple_units: form.has_multiple_units,
            units_count: form.has_multiple_units ? form.units_count : 1,
            land_size: form.type.toLowerCase().includes('land') ? parseFloat(form.land_size || '0') : undefined,
            land_measurement_unit: form.type.toLowerCase().includes('land') ? form.land_measurement_unit : undefined,
            landlord_id: role === 'AGENT' ? form.landlord_id : undefined,
            status: 'available',
            moderation_status: 'pending',
            rejection_reason: null, // Reset previous rejection on resubmission
        };

        const { error } = isEdit
            ? await updateProperty(propertyId as string, propertyData, form.images, form.video_url)
            : await addProperty(propertyData, form.images, form.video_url);

        setLoading(false);
        if (!error) router.back();
    };

    return {
        form,
        setField,
        currentStep,
        setCurrentStep,
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
    };
};
