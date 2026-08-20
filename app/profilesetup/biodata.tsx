import BackButton from '@/components/BackButton';
import { EMPLOYER_HIDDEN_STATUSES } from '@/constants/biodataOptions';
import { useBankDetails } from '@/hooks/useBankDetails';
import { useBioData } from '@/hooks/useBioData';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import BankDetailsStep from '../../components/biodata/BankDetailsStep';
import BiodataModals from '../../components/biodata/BiodataModals';
import BusinessInfoStep from '../../components/biodata/BusinessInfoStep';
import IdentityStep from '../../components/biodata/IdentityStep';
import NextOfKinStep from '../../components/biodata/NextOfKinStep';
import OccupationStep from '../../components/biodata/OccupationStep';
import PersonalInfoStep from '../../components/biodata/PersonalInfoStep';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import StepIndicator from '../../components/StepIndicator';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BiodataForm, ModalKeys } from '../../types/biodata';
import { supabase } from '../../lib/supabase';

const EMPTY_FORM: BiodataForm = {
    first_name: '',
    last_name: '',
    phone_number: '',
    dob: '',
    gender: '',
    profile_photo: '',
    id_type: 'NIN',
    id_number: '',
    id_front_image: '',
    id_back_image: '',
    employment_status: '',
    employer_name: '',
    monthly_income_range: '',
    business_name: '',
    cac_number: '',
    next_of_kin_name: '',
    next_of_kin_phone: '',
    next_of_kin_relationship: '',
    bank_name: '',
    account_number: '',
    account_name: '',
    bank_code: '',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const BioDataScreen = () => {
    const { colors } = useTheme();
    const { role, user } = useAuth();
    const { submitBioData, isSubmitting } = useBioData();
    const { fetchBanks } = useBankDetails();
    const router = useRouter();
    const isLandlord = role === 'LANDLORD' || role === 'ADMIN';
    const STEP_LABELS = isLandlord
        ? ['Personal', 'Identity', 'Business', 'Next of Kin', 'Bank']
        : ['Personal', 'Identity', 'Occupation', 'Next of Kin'];
    const totalSteps = STEP_LABELS.length;

    const [step, setStep] = useState(0);
    const [showDobPicker, setShowDobPicker] = useState(false);
    const [form, setForm] = useState<BiodataForm>(EMPTY_FORM);
    const [bankOptions, setBankOptions] = useState<any[]>([]);
    const [modals, setModals] = useState<Record<ModalKeys, boolean>>({
        gender: false,
        idType: false,
        employment: false,
        income: false,
        relationship: false,
        bank: false,
    });

    // ── PRE-FILL USER DATA FROM DATABASE ──────────────────────────────────────
    React.useEffect(() => {
        const loadInitialData = async () => {
            if (!user) return;
            try {
                const [userRes, bioRes, bankRes] = await Promise.all([
                    supabase.from('users').select('first_name, last_name, is_verified, is_nin_verified').eq('id', user.id).maybeSingle(),
                    supabase.from('user_biodata').select('*').eq('id', user.id).maybeSingle(),
                    supabase.from('bank_accounts').select('*').eq('user_id', user.id).maybeSingle(),
                ]);

                const uData = userRes.data;
                const bData = bioRes.data;
                const bankData = bankRes.data;

                setForm(prev => ({
                    ...prev,
                    first_name: uData?.first_name || user.user_metadata?.first_name || user.user_metadata?.firstName || prev.first_name,
                    last_name: uData?.last_name || user.user_metadata?.last_name || user.user_metadata?.lastName || prev.last_name,
                    phone_number: bData?.phone_number || prev.phone_number,
                    dob: bData?.dob || prev.dob,
                    gender: bData?.gender || prev.gender,
                    profile_photo: bData?.profile_photo || prev.profile_photo,
                    id_type: 'NIN',
                    id_number: bData?.id_number || prev.id_number,
                    is_nin_verified: Boolean(uData?.is_verified || uData?.is_nin_verified || bData?.kyc_status === 'verified'),
                    employment_status: bData?.employment_status || prev.employment_status,
                    employer_name: bData?.employer_name || prev.employer_name,
                    monthly_income_range: bData?.monthly_income_range || prev.monthly_income_range,
                    business_name: bData?.business_name || prev.business_name,
                    cac_number: bData?.cac_number || prev.cac_number,
                    next_of_kin_name: bData?.next_of_kin_name || prev.next_of_kin_name,
                    next_of_kin_phone: bData?.next_of_kin_phone || prev.next_of_kin_phone,
                    next_of_kin_relationship: bData?.next_of_kin_relationship || prev.next_of_kin_relationship,
                    bank_name: bankData?.bank_name || prev.bank_name,
                    account_number: bankData?.account_number || prev.account_number,
                    account_name: bankData?.account_name || prev.account_name,
                    bank_code: bankData?.bank_code || prev.bank_code,
                }));
            } catch (e) {
                console.warn('[BioDataScreen] Pre-fill warning:', e);
            }
        };

        loadInitialData();
    }, [user]);

    // Fetch banks on mount
    React.useEffect(() => {
        const loadBanks = async () => {
            const list = await fetchBanks();
            setBankOptions(list);
        };
        loadBanks();
    }, []);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const updateForm = (key: keyof BiodataForm, value: any) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const openModal = (key: ModalKeys) =>
        setModals(prev => ({ ...prev, [key]: true }));

    const closeModal = (key: ModalKeys) =>
        setModals(prev => ({ ...prev, [key]: false }));

    const onDateChange = (_: any, selectedDate?: Date) => {
        setShowDobPicker(false);
        if (selectedDate) updateForm('dob', selectedDate.toISOString().split('T')[0]);
    };

    // ── Navigation ────────────────────────────────────────────────────────────

    const validateStep = () => {
        const currentStepLabel = STEP_LABELS[step];

        if (currentStepLabel === 'Personal') {
            if (!form.first_name?.trim() || !form.last_name?.trim() || !form.phone_number.trim() || !form.dob || !form.gender) {
                Alert.alert('Missing Info', 'Please fill in your legal First Name, Last Name, phone number, date of birth, and gender exactly as on your National ID.');
                return false;
            }
        }

        if (currentStepLabel === 'Identity') {
            if (!form.id_number || form.id_number.trim().length !== 11) {
                Alert.alert('NIN Required', 'Please enter your 11-digit National Identification Number (NIN).');
                return false;
            }
            if (!form.is_nin_verified) {
                Alert.alert('Verification Required', 'Please tap "Verify NIN with NIMC" to verify your National ID before continuing.');
                return false;
            }
        }

        if (currentStepLabel === 'Occupation') {
            if (!form.employment_status || !form.monthly_income_range) {
                Alert.alert('Missing Info', 'Please select your employment status and income range.');
                return false;
            }
            const needsEmployer = !EMPLOYER_HIDDEN_STATUSES.includes(form.employment_status);
            if (needsEmployer && !form.employer_name.trim()) {
                Alert.alert('Missing Info', 'Please enter your employer or business name.');
                return false;
            }
        }

        if (currentStepLabel === 'Business') {
            if (!form.business_name.trim()) {
                Alert.alert('Missing Info', 'Please enter your business or company name.');
                return false;
            }
        }

        if (currentStepLabel === 'Next of Kin') {
            if (!form.next_of_kin_name.trim() || !form.next_of_kin_phone.trim() || !form.next_of_kin_relationship) {
                Alert.alert('Missing Info', 'Please fill in all Next of Kin details.');
                return false;
            }
        }

        if (currentStepLabel === 'Bank') {
            if (!form.bank_name || !form.account_number || !form.account_name) {
                Alert.alert('Missing Info', 'Please provide valid bank details. The account name must be verified.');
                return false;
            }
        }

        return true;
    };

    const handleNext = () => {
        if (!validateStep()) return;

        if (step < totalSteps - 1) setStep(s => s + 1);
        else handleSubmit();
    };

    const handleBack = () => {
        if (step > 0) setStep(s => s - 1);
    };

    const handleSubmit = async () => {
        if (!form.is_nin_verified) {
            Alert.alert('NIN Unverified', 'You must verify your National ID (NIN) with NIMC before completing registration.');
            return;
        }

        const finalFirstName = (
            form.first_name ||
            user?.user_metadata?.first_name ||
            user?.user_metadata?.firstName ||
            ''
        ).trim();

        const finalLastName = (
            form.last_name ||
            user?.user_metadata?.last_name ||
            user?.user_metadata?.lastName ||
            ''
        ).trim();

        if (!finalFirstName || !finalLastName) {
            Alert.alert(
                'Missing Legal Name',
                'Please ensure your legal First Name and Last Name are filled in Step 1.'
            );
            return;
        }

        const submissionData: BiodataForm = {
            ...form,
            first_name: finalFirstName,
            last_name: finalLastName,
        };

        const { error } = await submitBioData(submissionData);
        if (error) {
            Alert.alert('Error', error);
            return;
        }
        Alert.alert('Success 🎉', 'Your registration and NIN verification are complete!');
        if (role === 'LANDLORD') {
            router.replace('/landlord');
        } else {
            router.replace('/(tabs)');
        }
    };

    // ── Step map ──────────────────────────────────────────────────────────────

    const sharedProps = { form, updateForm, openModal };

    const STEPS = isLandlord
        ? [
            <PersonalInfoStep key="personal" {...sharedProps} onShowDobPicker={() => setShowDobPicker(true)} />,
            <IdentityStep key="identity" {...sharedProps} />,
            <BusinessInfoStep key="business" form={form} updateForm={updateForm} />,
            <NextOfKinStep key="nok" {...sharedProps} />,
            <BankDetailsStep key="bank" {...sharedProps} />,
        ]
        : [
            <PersonalInfoStep key="personal" {...sharedProps} onShowDobPicker={() => setShowDobPicker(true)} />,
            <IdentityStep key="identity" {...sharedProps} />,
            <OccupationStep key="occupation" {...sharedProps} />,
            <NextOfKinStep key="nok" {...sharedProps} />,
        ];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                {step > 0 ? (
                    <BackButton />
                ) : (
                    <View style={{ width: 40 }} />
                )}
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Registration Setup</Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                        Step {step + 1} of {totalSteps}
                    </Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <StepIndicator currentStep={step} totalSteps={totalSteps} labels={STEP_LABELS} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {STEPS[step]}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                {step > 0 && (
                    <TouchableOpacity
                        style={[styles.backBtn, { borderColor: colors.border }]}
                        onPress={handleBack}
                    >
                        <Text style={[styles.backBtnText, { color: colors.text }]}>Back</Text>
                    </TouchableOpacity>
                )}
                <CustomButton
                    title={step === totalSteps - 1 ? 'Complete Registration 🎉' : 'Continue'}
                    onPress={handleNext}
                    loading={isSubmitting}
                    style={styles.nextBtn}
                />
            </View>

            {/* Date Picker */}
            {showDobPicker && (
                <DateTimePicker
                    value={form.dob ? new Date(form.dob) : new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                />
            )}

            {/* All BottomSheet Pickers */}
            <BiodataModals
                modals={modals}
                form={form}
                updateForm={updateForm}
                closeModal={closeModal}
                bankOptions={bankOptions}
            />
        </ScreenWrapper>
    );
};

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
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    headerSub: { fontSize: 12, marginTop: 2 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 34,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 12,
        alignItems: 'center',
    },
    backBtn: {
        height: 52,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtnText: { fontSize: 15, fontWeight: '600' },
    nextBtn: { flex: 1 },
});

export default BioDataScreen;