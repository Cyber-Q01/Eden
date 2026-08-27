import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useTenantRentals, EscrowRental, ESCROW_HELD_STATUSES } from '../../hooks/useEscrow';
import { usePayment } from '../../hooks/usePayment';

const formatNaira = (n: number | string | undefined) =>
    '₦' + Number(n || 0).toLocaleString();

const STATUS_META: Record<
    string,
    { label: string; color: string; icon: 'time-outline' | 'shield-checkmark' | 'warning-outline' | 'checkmark-circle-outline' | 'refresh-outline' | 'card-outline' }
> = {
    awaiting_payment: { label: 'Awaiting Payment', color: '#F59E0B', icon: 'time-outline' },
    awaiting_confirmation: { label: 'Funds in Escrow', color: '#2563EB', icon: 'shield-checkmark' },
    confirmed: { label: 'Funds in Escrow', color: '#2563EB', icon: 'shield-checkmark' },
    disputed: { label: 'Dispute in Review', color: '#EF4444', icon: 'warning-outline' },
    released: { label: 'Escrow Released', color: '#10B981', icon: 'checkmark-circle-outline' },
    refunded: { label: 'Refunded', color: '#64748B', icon: 'refresh-outline' },
};

const getStatusMeta = (status: string) =>
    STATUS_META[status] || { label: status, color: '#64748B', icon: 'card-outline' as const };

const isHeld = (status: string) => (ESCROW_HELD_STATUSES as string[]).includes(status);

const EscrowScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { rentals, loading, refresh } = useTenantRentals();
    const { confirmRental, disputeRental, loading: paymentLoading } = usePayment();

    const [busyId, setBusyId] = useState<string | null>(null);
    const [disputeTarget, setDisputeTarget] = useState<EscrowRental | null>(null);
    const [disputeReason, setDisputeReason] = useState('');

    const heldRentals = rentals.filter((r) => isHeld(r.status));
    const totalInEscrow = heldRentals.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const handleConfirm = (rental: EscrowRental) => {
        if (busyId) return;
        const landlordName = rental.owner
            ? `${rental.owner.first_name || ''} ${rental.owner.last_name || ''}`.trim() || 'the landlord'
            : 'the landlord';
        Alert.alert(
            'Confirm & Release Escrow',
            `By confirming, you agree the property matches its listing and ${formatNaira(
                rental.amount
            )} held in escrow will be released to ${landlordName}. This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Release Funds',
                    onPress: async () => {
                        setBusyId(rental.id);
                        const ok = await confirmRental(rental.id);
                        if (ok) await refresh();
                        setBusyId(null);
                    },
                },
            ]
        );
    };

    const openDispute = (rental: EscrowRental) => {
        if (busyId) return;
        setDisputeReason('');
        setDisputeTarget(rental);
    };

    const submitDispute = async () => {
        if (!disputeTarget) return;
        if (!disputeReason.trim()) {
            Alert.alert('Required', 'Please describe the issue before submitting.');
            return;
        }
        setBusyId(disputeTarget.id);
        const ok = await disputeRental(disputeTarget.id, disputeReason.trim());
        setBusyId(null);
        setDisputeTarget(null);
        if (ok) await refresh();
    };

    const handlePayNow = (rental: EscrowRental) => {
        router.push({
            pathname: '/shared-screens/RentPaymentScreen',
            params: { rental_id: rental.id },
        });
    };

    const renderRental = ({ item }: { item: EscrowRental }) => {
        const meta = getStatusMeta(item.status);
        const held = isHeld(item.status);
        const propertyImage = item.property?.images?.[0];
        const title = item.property?.title || 'Rented Property';
        const location = item.property?.location || 'Lagos, Nigeria';
        const busy = busyId === item.id || paymentLoading;
        const deadline =
            held && item.confirmation_deadline
                ? new Date(item.confirmation_deadline)
                : null;
        const deadlineOk = deadline && !isNaN(deadline.getTime());

        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderLeftColor: meta.color }]}>
                <View style={styles.cardHeader}>
                    {propertyImage ? (
                        <Image source={{ uri: propertyImage }} style={styles.propertyImage} />
                    ) : (
                        <View style={[styles.propertyImagePlaceholder, { backgroundColor: colors.border }]}>
                            <Ionicons name="home-outline" size={20} color={colors.textSecondary} />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>
                            {title}
                        </Text>
                        <Text style={[styles.propertyLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                            {location}
                        </Text>
                        <Text style={[styles.amount, { color: colors.primary }]}>
                            {formatNaira(item.amount)}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: meta.color + '15' }]}>
                        <Ionicons name={meta.icon} size={13} color={meta.color} />
                        <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                </View>

                <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {new Date(item.created_at).toLocaleDateString('en-NG', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </Text>
                    </View>
                    {deadlineOk && (
                        <View style={styles.metaItem}>
                            <Ionicons name="hourglass-outline" size={13} color={meta.color} />
                            <Text style={[styles.metaText, { color: meta.color }]}>
                                Confirm by {deadline!.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                            </Text>
                        </View>
                    )}
                </View>

                {item.status === 'disputed' && (
                    <View style={[styles.noteBox, { backgroundColor: '#EF444412', borderColor: '#EF444430' }]}>
                        <Ionicons name="information-circle-outline" size={14} color="#EF4444" />
                        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                            Our team is reviewing your dispute. Funds stay frozen until a decision is made.
                        </Text>
                    </View>
                )}
                {item.status === 'awaiting_payment' && (
                    <View style={[styles.noteBox, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B30' }]}>
                        <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
                        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                            Your application was accepted. Pay now to move your rent into secure escrow.
                        </Text>
                    </View>
                )}
                {item.status === 'released' && (
                    <View style={[styles.noteBox, { backgroundColor: '#10B98112', borderColor: '#10B98130' }]}>
                        <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                            Funds were released to the landlord. You are done with this payment.
                        </Text>
                    </View>
                )}

                {(item.status === 'awaiting_confirmation' || item.status === 'confirmed') && (
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.releaseBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => handleConfirm(item)}
                            disabled={busy}
                        >
                            {busy ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Ionicons name="checkmark" size={16} color="#FFF" />
                            )}
                            <Text style={styles.releaseBtnText}>Confirm &amp; Release</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.disputeBtn, { borderColor: '#EF4444' }]}
                            onPress={() => openDispute(item)}
                            disabled={busy}
                        >
                            <Ionicons name="warning-outline" size={15} color="#EF4444" />
                            <Text style={[styles.disputeBtnText, { color: '#EF4444' }]}>Dispute</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {item.status === 'awaiting_payment' && (
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.payBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handlePayNow(item)}
                        >
                            <Ionicons name="card-outline" size={16} color="#FFF" />
                            <Text style={styles.payBtnText}>Pay Now</Text>
                            <Ionicons name="arrow-forward" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <ScreenWrapper withScrollView={false} style={{ backgroundColor: colors.background }}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Escrow</Text>
                <View style={[styles.countBadge, { backgroundColor: heldRentals.length > 0 ? '#EF4444' : colors.border + '40' }]}>
                    <Text style={[styles.countText, { color: '#FFF' }]}>{heldRentals.length}</Text>
                </View>
            </View>

            <FlatList
                data={rentals}
                keyExtractor={(item) => item.id}
                renderItem={renderRental}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View>
                        {/* Summary card */}
                        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1E293B' : '#0F172A', borderColor: isDark ? '#334155' : '#1E293B' }]}>
                            <View style={styles.summaryLeft}>
                                <View style={styles.summaryIconWrap}>
                                    <Ionicons name="shield-checkmark" size={20} color="#6EE7B7" />
                                </View>
                                <View>
                                    <Text style={[styles.summaryLabel, { color: '#94A3B8' }]}>Total in escrow</Text>
                                    <Text style={styles.summaryValue}>{formatNaira(totalInEscrow)}</Text>
                                </View>
                            </View>
                            <View style={styles.summaryRight}>
                                <Text style={[styles.summaryCount, { color: '#F8FAFC' }]}>{heldRentals.length}</Text>
                                <Text style={[styles.summarySubLabel, { color: '#94A3B8' }]}>
                                    {heldRentals.length === 1 ? 'payment held' : 'payments held'}
                                </Text>
                            </View>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.empty}>
                            <Ionicons name="shield-outline" size={54} color={colors.border} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Escrow Payments Yet</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                When you pay rent through Eden, your money is held safely here until you confirm the property.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    )
                }
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />
                }
            />

            {/* Dispute modal */}
            <Modal
                visible={!!disputeTarget}
                transparent
                animationType="slide"
                onRequestClose={() => setDisputeTarget(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Raise a Dispute</Text>
                        <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                            Explain what is wrong with the property or payment. Our team reviews every dispute within 24 hours.
                        </Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="Describe the issue (e.g. property differs from listing, landlord asking for cash outside Eden, etc.)..."
                            placeholderTextColor={colors.textSecondary + '99'}
                            multiline
                            numberOfLines={4}
                            value={disputeReason}
                            onChangeText={setDisputeReason}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                                onPress={() => setDisputeTarget(null)}
                                disabled={!!busyId}
                            >
                                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSubmitBtn}
                                onPress={submitDispute}
                                disabled={!!busyId}
                            >
                                {busyId ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.modalSubmitText}>Submit Dispute</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    countBadge: {
        minWidth: 32,
        height: 24,
        borderRadius: 12,
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countText: {
        fontSize: 13,
        fontWeight: '800',
    },
    listContent: {
        padding: 16,
        gap: 14,
        paddingBottom: 40,
    },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 4,
    },
    summaryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    summaryIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#10B98125',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryLabel: {
        fontSize: 11.5,
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#F8FAFC',
        marginTop: 2,
    },
    summaryRight: {
        alignItems: 'flex-end',
    },
    summaryCount: {
        fontSize: 22,
        fontWeight: '800',
    },
    summarySubLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    card: {
        borderRadius: 18,
        borderLeftWidth: 4,
        padding: 14,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    propertyImage: {
        width: 54,
        height: 54,
        borderRadius: 12,
    },
    propertyImagePlaceholder: {
        width: 54,
        height: 54,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    propertyTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    propertyLocation: {
        fontSize: 12,
        marginTop: 2,
    },
    amount: {
        fontSize: 14,
        fontWeight: '700',
        marginTop: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginTop: 10,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    metaText: {
        fontSize: 11.5,
        fontWeight: '500',
    },
    noteBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    noteText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    releaseBtn: {
        flex: 1,
        height: 46,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    releaseBtnText: {
        color: '#FFF',
        fontSize: 13.5,
        fontWeight: '700',
    },
    disputeBtn: {
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    disputeBtnText: {
        fontSize: 13.5,
        fontWeight: '700',
    },
    payBtn: {
        flex: 1,
        height: 46,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    payBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
    },
    empty: {
        alignItems: 'center',
        paddingTop: 80,
        gap: 10,
        paddingHorizontal: 24,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    emptyText: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    loadingWrap: {
        paddingTop: 80,
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        padding: 20,
        paddingBottom: 30,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    modalSub: {
        fontSize: 12.5,
        lineHeight: 17,
        marginTop: 6,
        marginBottom: 12,
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 13.5,
        minHeight: 90,
        textAlignVertical: 'top',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
    },
    modalCancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalSubmitBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSubmitText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
});

export default EscrowScreen;
