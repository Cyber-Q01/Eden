import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import BackButton from '../../components/BackButton';
import BottomSheetPicker, { PickerOption } from '../../components/BottomSheetPicker';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useBankDetails } from '../../hooks/useBankDetails';

const AddBankScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { showError } = useToast();
    const { saveBankDetails, saving, fetchBanks, resolveAccountName } = useBankDetails();

    const [bank, setBank] = useState<{ label: string; value: string } | null>(null);
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');

    const [banks, setBanks] = useState<PickerOption[]>([]);
    const [resolving, setResolving] = useState(false);
    const [isVerified, setIsVerified] = useState(false);

    const [showConfirm, setShowConfirm] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    // Fetch banks on mount
    React.useEffect(() => {
        const loadBanks = async () => {
            const list = await fetchBanks();
            // Deduplicate by value just in case API returns duplicates
            const unique = list.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.value === v.value) === i);
            setBanks(unique);
        };
        loadBanks();
    }, []);

    // Auto-resolve account name
    React.useEffect(() => {
        const resolve = async () => {
            if (accountNumber.length === 10 && bank) {
                setResolving(true);
                setIsVerified(false);
                const name = await resolveAccountName(accountNumber, bank.value);
                if (name) {
                    setAccountName(name);
                    setIsVerified(true);
                } else {
                    setAccountName('');
                    setIsVerified(false);
                }
                setResolving(false);
            }
        };
        resolve();
    }, [accountNumber, bank]);

    const handleSave = () => {
        if (!isVerified) {
            showError({ type: 'unknown', title: 'Not Verified', message: 'Please ensure your account details are verified before saving.' });
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirm = async () => {
        if (!bank) return;
        setShowConfirm(false);
        const { error } = await saveBankDetails(
            bank.label,
            accountNumber,
            accountName,
            bank.value
        );
        if (!error) {
            router.back();
        }
    };

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Add Bank Account</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Account Number</Text>
                        <ThemedTextInput
                            placeholder="Enter 10-digit account number"
                            value={accountNumber}
                            onChangeText={setAccountNumber}
                            keyboardType="numeric"
                            maxLength={10}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Select Bank</Text>
                        <TouchableOpacity
                            style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => setShowPicker(true)}
                        >
                            <Text style={[styles.dropdownText, { color: bank ? colors.text : colors.textSecondary }]}>
                                {bank?.label || 'Select Bank'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Account Name</Text>
                            {resolving && <ActivityIndicator size="small" color={colors.primary} />}
                            {isVerified && !resolving && (
                                <View style={styles.verifiedRow}>
                                    <Ionicons name="checkmark-circle" size={16} color="#00C853" />
                                    <Text style={[styles.verifiedText, { color: '#00C853' }]}>Verified</Text>
                                </View>
                            )}
                        </View>
                        <View style={[styles.nameDisplay, { backgroundColor: colors.card, borderColor: isVerified ? '#00C853' : colors.border }]}>
                            <Text style={[styles.accountNameText, { color: accountName ? colors.text : colors.textSecondary }]}>
                                {accountName || (resolving ? 'Resolving...' : 'Account name will appear here')}
                            </Text>
                        </View>
                    </View>

                    <CustomButton
                        title="Save Bank Account"
                        onPress={handleSave}
                        loading={saving}
                        disabled={!isVerified || resolving}
                        style={styles.saveButton}
                    />
                </ScrollView>
            </KeyboardAvoidingView>

            <BottomSheetPicker
                visible={showPicker}
                title="Select Bank"
                options={banks}
                selectedValue={bank?.value || ''}
                onSelect={(val) => {
                    const selected = banks.find(b => b.value === val);
                    if (selected) setBank(selected);
                }}
                onClose={() => setShowPicker(false)}
            />

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowConfirm(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalIconContainer, { backgroundColor: colors.border + '30', borderColor: colors.border }]}>
                            <Ionicons name="shield-checkmark-outline" size={40} color="#00C853" />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Bank Details</Text>

                        <View style={styles.detailsContainer}>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Bank:</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>{bank?.label}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account Number:</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>{accountNumber}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account Name:</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>{accountName}</Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[styles.confirmButton, { backgroundColor: colors.primary }]} 
                            onPress={handleConfirm}
                        >
                            <Text style={styles.confirmButtonText}>Confirm</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowConfirm(false)}>
                            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
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
        padding: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    verifiedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    verifiedText: {
        fontSize: 12,
        fontWeight: '700',
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    dropdownText: {
        fontSize: 16,
    },
    nameDisplay: {
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    accountNameText: {
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        marginTop: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
    },
    modalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 24,
    },
    detailsContainer: {
        width: '100%',
        marginBottom: 24,
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    detailLabel: {
        fontSize: 14,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    confirmButton: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    confirmButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export default AddBankScreen;
