import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { usePayment } from '../../hooks/usePayment';
import { supabase } from '../../lib/supabase';

const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
        .map(v => String(v).padStart(2, '0'))
        .join(':');
};

const RentalConfirmationScreen = () => {
    const { rental_id, confirmation_deadline, property_title, amount } =
        useLocalSearchParams<{
            rental_id: string;
            confirmation_deadline: string;
            property_title: string;
            amount: string;
        }>();
    const router = useRouter();
    const { colors } = useTheme();
    const { confirmRental, disputeRental, loading } = usePayment();

    const [timeLeft, setTimeLeft] = useState(0);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const [landlordName, setLandlordName] = useState('Landlord');
    const [bankInfo, setBankInfo] = useState('Bank Transfer');

    useEffect(() => {
        const fetchRentalDetails = async () => {
            if (!rental_id) return;
            try {
                const { data, error } = await supabase
                    .from('rentals')
                    .select('owner:users!owner_id(first_name, last_name, bank_accounts(bank_name, account_number))')
                    .eq('id', rental_id)
                    .single();
                
                if (data && data.owner) {
                    const owner: any = data.owner;
                    const name = `${owner.first_name || ''} ${owner.last_name || ''}`.trim();
                    if (name) setLandlordName(name);

                    if (owner.bank_accounts) {
                        const bank = Array.isArray(owner.bank_accounts) ? owner.bank_accounts[0] : owner.bank_accounts;
                        if (bank) {
                            const maskedAcc = bank.account_number ? `**** ${bank.account_number.slice(-4)}` : '';
                            setBankInfo(`${bank.bank_name || 'Bank'} ${maskedAcc}`.trim());
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching rental details:', err);
            }
        };
        fetchRentalDetails();
    }, [rental_id]);

    useEffect(() => {
        if (!confirmation_deadline) return;
        const deadline = new Date(confirmation_deadline).getTime();

        const tick = () => {
            const remaining = deadline - Date.now();
            setTimeLeft(Math.max(0, remaining));
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [confirmation_deadline]);

    // Pulse animation for the countdown
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const handleConfirm = () => {
        Alert.alert(
            'Confirm Apartment',
            'By confirming, you agree the apartment matches its listing and funds will be released to the owner. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Confirm',
                    onPress: async () => {
                        const success = await confirmRental(rental_id);
                        if (success) {
                            router.replace({
                                pathname: '/shared-screens/EscrowReleasedScreen',
                                params: {
                                    amount: amount || '0',
                                    released_to: landlordName,
                                    bank: bankInfo,
                                    release_time: new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    reference: 'REL-' + Date.now(),
                                }
                            });
                        }
                    },
                },
            ]
        );
    };

    const handleDispute = async () => {
        if (!disputeReason.trim()) {
            Alert.alert('Required', 'Please describe the issue before submitting.');
            return;
        }
        const success = await disputeRental(rental_id, disputeReason.trim());
        if (success) {
            setShowDisputeModal(false);
            router.replace('/(tabs)');
        }
    };

    const urgency = timeLeft < 3 * 60 * 60 * 1000; // less than 3 hours
    const timerColor = urgency ? '#ef4444' : colors.primary;

    return (
        <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <View style={styles.topSection}>
                    <View style={[styles.successIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Payment Successful!</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Your rent of{' '}
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>
                            ₦{Number(amount).toLocaleString()}
                        </Text>{' '}
                        is held securely in escrow
                    </Text>
                </View>

                {/* Countdown timer */}
                <View style={[styles.timerCard, { backgroundColor: colors.card, borderColor: timerColor + '30' }]}>
                    <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
                        Inspection window closes in
                    </Text>
                    <Animated.Text
                        style={[
                            styles.timerValue,
                            { color: timerColor, transform: [{ scale: pulseAnim }] },
                        ]}
                    >
                        {formatCountdown(timeLeft)}
                    </Animated.Text>
                    <Text style={[styles.timerSub, { color: colors.textSecondary }]}>
                        You can confirm your apartment and release payment at any time before or during this countdown.
                    </Text>
                    {urgency && (
                        <View style={[styles.urgencyBanner, { backgroundColor: '#ef444415' }]}>
                            <Ionicons name="warning-outline" size={14} color="#ef4444" />
                            <Text style={[styles.urgencyText, { color: '#ef4444' }]}>
                                Time is almost up! Funds will auto-release to owner when timer ends.
                            </Text>
                        </View>
                    )}
                </View>

                {/* Property info */}
                <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.infoCardTitle, { color: colors.textSecondary }]}>Property</Text>
                    <Text style={[styles.infoCardValue, { color: colors.text }]}>{property_title}</Text>
                </View>

                {/* Checklist */}
                <View style={[styles.checklistCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.checklistTitle, { color: colors.text }]}>
                        Before you confirm, check:
                    </Text>
                    {[
                        'Apartment matches photos and description',
                        'All rooms, windows and doors are intact',
                        'Water supply and taps are working',
                        'Light switches and sockets work',
                        'No hidden damage or structural issues',
                        'Count and photograph all keys received',
                    ].map((item, i) => (
                        <View key={i} style={styles.checkItem}>
                            <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
                            <Text style={[styles.checkText, { color: colors.text }]}>{item}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Action buttons */}
            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <TouchableOpacity
                    style={[styles.disputeBtn, { borderColor: '#ef4444' }]}
                    onPress={() => setShowDisputeModal(true)}
                    disabled={loading}
                >
                    <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                    <Text style={[styles.disputeBtnText, { color: '#ef4444' }]}>Report Issue</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                    onPress={handleConfirm}
                    disabled={loading}
                >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.confirmBtnText}>
                        {loading ? 'Processing...' : 'Confirm Apartment'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Dispute modal */}
            <Modal
                visible={showDisputeModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDisputeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHandle}>
                            <View style={[styles.handle, { backgroundColor: colors.border }]} />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Report an Issue</Text>
                        <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                            Describe the problem. Our team will review within 24 hours and help resolve it.
                        </Text>
                        <TextInput
                            style={[styles.disputeInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                            placeholder="Describe the issue in detail..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={5}
                            value={disputeReason}
                            onChangeText={setDisputeReason}
                            textAlignVertical="top"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                                onPress={() => setShowDisputeModal(false)}
                            >
                                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSubmitBtn, { backgroundColor: '#ef4444' }]}
                                onPress={handleDispute}
                                disabled={loading}
                            >
                                <Text style={styles.modalSubmitText}>
                                    {loading ? 'Submitting...' : 'Submit Dispute'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 12, gap: 16 },
    topSection: { alignItems: 'center', paddingVertical: 16, gap: 8 },
    successIcon: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800', marginTop: 8 },
    subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    timerCard: {
        borderRadius: 16,
        borderWidth: 1.5,
        padding: 20,
        alignItems: 'center',
        gap: 8,
    },
    timerLabel: { fontSize: 13, fontWeight: '500' },
    timerValue: { fontSize: 48, fontWeight: '800', letterSpacing: 2 },
    timerSub: { fontSize: 12, textAlign: 'center' },
    urgencyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 10,
        borderRadius: 8,
        marginTop: 4,
        width: '100%',
    },
    urgencyText: { fontSize: 12, flex: 1, fontWeight: '500' },
    infoCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 4 },
    infoCardTitle: { fontSize: 12, fontWeight: '500' },
    infoCardValue: { fontSize: 15, fontWeight: '600' },
    checklistCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
    checklistTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    checkItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    checkText: { fontSize: 13, flex: 1, lineHeight: 20 },
    footer: {
        flexDirection: 'row',
        padding: 20,
        paddingBottom: 36,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    disputeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 52,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1.5,
        justifyContent: 'center',
    },
    disputeBtnText: { fontSize: 14, fontWeight: '600' },
    confirmBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 14,
        gap: 8,
    },
    confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
    modalHandle: { alignItems: 'center', marginBottom: 16 },
    handle: { width: 40, height: 4, borderRadius: 2 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    modalSub: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
    disputeInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 120, marginBottom: 16 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalCancelBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    modalCancelText: { fontSize: 15, fontWeight: '600' },
    modalSubmitBtn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    modalSubmitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default RentalConfirmationScreen;
