import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useBankDetails } from '../../hooks/useBankDetails';
import { sanitizeDigits, sanitize, validateRequired, validateAccountNumber, validateAll } from '../../lib/validation';

const AddBankScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { showError } = useToast();
    const { saveBankDetails, saving } = useBankDetails();
    const [bank, setBank] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSave = () => {
        const validationError = validateAll([
            { check: () => validateRequired(bank, 'Bank') },
            { check: () => validateAccountNumber(accountNumber) },
            { check: () => validateRequired(accountName, 'Account name') },
        ]);
        if (validationError) {
            showError({ type: 'unknown', title: 'Validation Error', message: validationError });
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirm = async () => {
        setShowConfirm(false);
        const { error } = await saveBankDetails(
            sanitize(bank),
            sanitizeDigits(accountNumber),
            sanitize(accountName)
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                    <TouchableOpacity style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.dropdownText, { color: colors.text }]}>{bank || 'Select Bank'}</Text>
                        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <ThemedTextInput
                        placeholder="Account Number"
                        value={accountNumber}
                        onChangeText={setAccountNumber}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <ThemedTextInput
                        placeholder="Account Name"
                        value={accountName}
                        onChangeText={setAccountName}
                    />
                </View>

                <CustomButton
                    title="Save Bank Account"
                    onPress={handleSave}
                    style={styles.saveButton}
                />
            </ScrollView>

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowConfirm(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <Ionicons name="shield-checkmark-outline" size={40} color="#00C853" />
                        </View>
                        <Text style={styles.modalTitle}>Confirm Bank Details</Text>

                        <View style={styles.detailsContainer}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Bank:</Text>
                                <Text style={styles.detailValue}>{bank}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Account Number:</Text>
                                <Text style={styles.detailValue}>{accountNumber}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Account Name:</Text>
                                <Text style={styles.detailValue}>{accountName}</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                            <Text style={styles.confirmButtonText}>Confirm</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowConfirm(false)}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F8FAF9',
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
        color: '#333',
    },
    scrollContent: {
        padding: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        fontSize: 16,
        color: '#333',
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    dropdownText: {
        fontSize: 16,
        color: '#666',
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
        backgroundColor: '#FFF',
        width: '100%',
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
    },
    modalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
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
        color: '#666',
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: '#407BFF',
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
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
});

export default AddBankScreen;
