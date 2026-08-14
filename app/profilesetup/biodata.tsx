import BackButton from '@/components/BackButton';
import { EMPLOYER_HIDDEN_STATUSES } from '@/constants/biodataOptions';
import { useBankDetails } from '@/hooks/useBankDetails';
import { useBioData } from '@/hooks/useBioData';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
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

const EMPTY_FORM: BiodataForm = {
    phone_number: '',
    dob: '',
    gender: '',
    profile_photo: '',
    id_type: '',
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
    const { role } = useAuth();
    const { submitBioData, isSubmitting } = useBioData();
    const { fetchBanks } = useBankDetails();
    const router = useRouter()
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

    // Fetch banks on mount
    React.useEffect(() => {
        const loadBanks = async () => {
            const list = await fetchBanks();
            setBankOptions(list);
        };
        loadBanks();
    }, []);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const updateForm = (key: keyof BiodataForm, value: string) =>
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
            if (!form.phone_number.trim() || !form.dob || !form.gender) {
                Alert.alert('Missing Info', 'Please fill in your phone number, date of birth, and gender.');
                return false;
            }
        }

        if (currentStepLabel === 'Identity') {
            // Identity Step validation logic:
            // The user said "Except optional field and the id verification field"
            // If they mean the whole step is optional, we skip.
            // But usually ID Type and ID Number are basic biodata.
            // I'll enforce ID Type and ID Number but keep images optional if they are considered "id verification field"
            if (!form.id_type || !form.id_number.trim()) {
                Alert.alert('Missing Info', 'Please select an ID type and enter your ID number.');
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
        const { error } = await submitBioData(form);
        if (error) {
            Alert.alert('Error', error);
            return;
        }
        // Navigation is handled automatically by _layout.tsx
        // after refreshBiodataStatus() updates completedBiodata = true
        Alert.alert('Success 🎉', 'Your registration is complete!');
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
        <ScreenWrapper withScrollView={false} style={[styles.container, { backgroundColor: colors.background }]}>
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

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {STEPS[step]}
            </ScrollView>

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