import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Switch,
} from 'react-native';
import BackButton from '../../components/BackButton';
import BottomSheetPicker, { PickerOption } from '../../components/BottomSheetPicker';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useBankDetails } from '../../hooks/useBankDetails';

const BankAccountScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { showSuccess, showError } = useToast();
    const { 
        bankDetails, 
        loading: fetchingDetails, 
        saving, 
        fetchBanks, 
        resolveAccountName, 
        saveBankDetails 
    } = useBankDetails();

    // State for new account form
    const [bank, setBank] = useState<PickerOption | null>(null);
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [isDefault, setIsDefault] = useState(true);

    const [banks, setBanks] = useState<PickerOption[]>([]);
    const [resolving, setResolving] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    // Fetch banks list on mount
    useEffect(() => {
        const loadBanks = async () => {
            const list = await fetchBanks();
            const unique = list.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.value === v.value) === i);
            setBanks(unique);
        };
        loadBanks();
    }, []);

    // Auto-resolve account name
    useEffect(() => {
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
            } else if (accountNumber.length < 10) {
                setAccountName('');
                setIsVerified(false);
            }
        };
        resolve();
    }, [accountNumber, bank]);

    const handleSave = async () => {
        if (!bank || !isVerified) {
            showError({ 
                type: 'unknown', 
                title: 'Incomplete Details', 
                message: 'Please select a bank and ensure the account number is verified.' 
            });
            return;
        }

        const { error } = await saveBankDetails(
            bank.label,
            accountNumber,
            accountName,
            bank.value
        );

        if (!error) {
            // Reset form
            setBank(null);
            setAccountNumber('');
            setAccountName('');
            setIsDefault(true);
            setIsVerified(false);
        }
    };

    const maskAccountNumber = (acc: string) => {
        if (!acc) return '';
        const last4 = acc.slice(-4);
        return `** **** ${last4} **`;
    };

    return (
        <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Bank Accounts</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
                <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Info Banner */}
                    <View style={[styles.infoBanner, { backgroundColor: '#F0F7FF' }]}>
                        <Ionicons name="information-circle" size={24} color="#1D4ED8" />
                        <View style={styles.infoTextContainer}>
                            <Text style={[styles.infoTitle, { color: '#1D4ED8' }]}>Where will your rent go</Text>
                            <Text style={[styles.infoSubtitle, { color: '#64748B' }]}>
                                Add your bank account to receive payments when escrow is released
                            </Text>
                        </View>
                    </View>

                    {/* Saved Accounts Section */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Saved Accounts</Text>
                    {fetchingDetails ? (
                        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
                    ) : bankDetails ? (
                        <View style={[styles.savedCard, { borderColor: colors.primary, backgroundColor: colors.card }]}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.bankIconCircle, { backgroundColor: '#F0F7FF' }]}>
                                    <Ionicons name="home" size={20} color="#1D4ED8" />
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={[styles.cardBankName, { color: colors.text }]}>{bankDetails.bank_name}</Text>
                                    <Text style={[styles.cardAccNumber, { color: colors.textSecondary }]}>
                                        {maskAccountNumber(bankDetails.account_number)}
                                    </Text>
                                    <Text style={[styles.cardAccName, { color: colors.textSecondary }]}>{bankDetails.account_name}</Text>
                                    <View style={[styles.defaultBadge, { backgroundColor: '#F0F7FF' }]}>
                                        <Text style={[styles.defaultBadgeText, { color: '#1D4ED8' }]}>Default</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.moreOptions}>
                                    <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No bank accounts saved yet.</Text>
                    )}

                    {/* Add New Account Section */}
                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>Add New Account</Text>
                    
                    <View style={styles.form}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Bank Name</Text>
                        <TouchableOpacity
                            style={[styles.bankSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => setShowPicker(true)}
                        >
                            <View style={styles.selectorLeft}>
                                <Ionicons name="home-outline" size={20} color={colors.textSecondary} />
                                <Text style={[styles.selectorText, { color: bank ? colors.text : colors.textSecondary }]}>
                                    {bank?.label || 'Select your bank...'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Account Number</Text>
                        <ThemedTextInput
                            placeholder="Enter 10-digit account number"
                            value={accountNumber}
                            onChangeText={setAccountNumber}
                            keyboardType="numeric"
                            maxLength={10}
                        />

                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Account Name</Text>
                        <View style={[styles.accountNameBox, { backgroundColor: '#F8FAFC', borderColor: colors.border }]}>
                            {resolving ? (
                                <View style={styles.resolvingRow}>
                                    <Text style={[styles.resolvingText, { color: colors.textSecondary }]}>Fetching account name...</Text>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                </View>
                            ) : (
                                <Text style={[styles.accountNameResult, { color: accountName ? colors.text : colors.textSecondary }]}>
                                    {accountName || 'Account name will appear here'}
                                </Text>
                            )}
                            {isVerified && (
                                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                            )}
                        </View>
                        <View style={styles.paystackHelp}>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
                            <Text style={[styles.paystackText, { color: '#059669' }]}>
                                Account name fetched automatically via paystack
                            </Text>
                        </View>

                        {/* Default Switch */}
                        <View style={styles.switchRow}>
                            <View style={styles.switchLabelRow}>
                                <Ionicons name="star-outline" size={20} color="#D97706" />
                                <Text style={[styles.switchText, { color: colors.text }]}>Set as default account</Text>
                            </View>
                            <Switch
                                value={isDefault}
                                onValueChange={setIsDefault}
                                trackColor={{ false: '#E2E8F0', true: '#1D4ED8' }}
                                thumbColor={isDefault ? '#FFF' : '#FFF'}
                            />
                        </View>

                        {/* Security Banner */}
                        <View style={[styles.securityBanner, { backgroundColor: '#F0FDF4' }]}>
                            <Ionicons name="shield-checkmark" size={24} color="#059669" />
                            <View style={styles.securityTextContainer}>
                                <Text style={[styles.securityTitle, { color: '#059669' }]}>Your account is secure</Text>
                                <Text style={[styles.securitySubtitle, { color: '#059669' }]}>
                                    Bak details are encrypted. Eden never stores your full account number
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer Button */}
            <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <CustomButton
                    title="Save Bank Account"
                    onPress={handleSave}
                    loading={saving}
                    disabled={!isVerified || resolving}
                    style={styles.saveButton}
                />
            </View>

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
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    infoBanner: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        gap: 12,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    infoSubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    savedCard: {
        borderWidth: 2,
        borderRadius: 20,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    bankIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardInfo: {
        flex: 1,
    },
    cardBankName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    cardAccNumber: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    cardAccName: {
        fontSize: 14,
        marginBottom: 8,
    },
    defaultBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    defaultBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    moreOptions: {
        padding: 4,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
    },
    form: {
        gap: 4,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    bankSelector: {
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    selectorLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectorText: {
        fontSize: 15,
        fontWeight: '500',
    },
    accountNameBox: {
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    resolvingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    resolvingText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    accountNameResult: {
        fontSize: 15,
        fontWeight: '600',
    },
    paystackHelp: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
    },
    paystackText: {
        fontSize: 12,
        fontWeight: '500',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 24,
        marginBottom: 16,
    },
    switchLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    switchText: {
        fontSize: 15,
        fontWeight: '600',
    },
    securityBanner: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginTop: 16,
        gap: 12,
        alignItems: 'center',
    },
    securityTextContainer: {
        flex: 1,
    },
    securityTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    securitySubtitle: {
        fontSize: 12,
        lineHeight: 16,
    },
    footer: {
        padding: 20,
        paddingBottom: 35,
        borderTopWidth: 1,
    },
    saveButton: {
        borderRadius: 16,
        height: 56,
    },
});

export default BankAccountScreen;
