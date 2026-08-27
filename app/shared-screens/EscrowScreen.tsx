import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useTenantRentals, EscrowRental, ESCROW_HELD_STATUSES } from '../../hooks/useEscrow';

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

const formatReleaseTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return (
        d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' • ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
};

const EscrowScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { rentals, loading, refresh } = useTenantRentals();

    // Keep the list + badge fresh every time the tab is focused (stable callback — no re-render loops)
    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    const heldRentals = rentals.filter((r) => isHeld(r.status));
    const totalInEscrow = heldRentals.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    // Cards route to the dedicated screens — escrow is only releasable on its own screen, never from this tab
    const openRental = (item: EscrowRental) => {
        if (item.status === 'released') {
            const owner = item.owner;
            const releasedTo = owner
                ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim()
                : '';
            let bank = '';
            if (owner?.bank_accounts) {
                const ba = Array.isArray(owner.bank_accounts)
                    ? owner.bank_accounts[0]
                    : owner.bank_accounts;
                if (ba?.account_number) {
                    bank = `${ba.bank_name || 'Bank'} **** ${String(ba.account_number).slice(-4)}`.trim();
                }
            }
            router.push({
                pathname: '/shared-screens/EscrowReleasedScreen',
                params: {
                    amount: String(item.amount || 0),
                    released_to: releasedTo,
                    bank,
                    release_time: formatReleaseTime(item.updated_at),
                    reference: item.transfer_reference || 'REL-' + item.id.slice(0, 8).toUpperCase(),
                    landlord_id: owner?.id || '',
                    rental_id: item.id,
                },
            });
            return;
        }

        // Funds still in escrow (awaiting_confirmation / confirmed) → the release-escrow screen
        router.push({
            pathname: '/shared-screens/RentalConfirmationScreen',
            params: {
                rental_id: item.id,
                confirmation_deadline: item.confirmation_deadline || '',
                property_title: item.property?.title || 'Property',
                amount: String(item.amount || 0),
            },
        });
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
        const tappable = held || item.status === 'released';
        const propertyImage = item.property?.images?.[0];
        const title = item.property?.title || 'Rented Property';
        const location = item.property?.location || 'Lagos, Nigeria';
        const deadline = held && item.confirmation_deadline ? new Date(item.confirmation_deadline) : null;
        const deadlineOk = deadline && !isNaN(deadline.getTime());

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderLeftColor: meta.color }]}
                activeOpacity={tappable ? 0.75 : 1}
                disabled={!tappable}
                onPress={tappable ? () => openRental(item) : undefined}
            >
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
                    <View style={styles.cardHeaderRight}>
                        <View style={[styles.statusBadge, { backgroundColor: meta.color + '15' }]}>
                            <Ionicons name={meta.icon} size={13} color={meta.color} />
                            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                        {tappable && (
                            <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#CBD5E1'} />
                        )}
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

                {held && (
                    <View style={[styles.noteBox, { backgroundColor: '#2563EB12', borderColor: '#2563EB30' }]}>
                        <Ionicons name="lock-closed-outline" size={14} color="#2563EB" />
                        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                            Funds are held safely in escrow. Tap to open the release screen and confirm when ready.
                        </Text>
                    </View>
                )}
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
                            Released — tap to view the transfer details and receipt.
                        </Text>
                    </View>
                )}
                {item.status === 'refunded' && (
                    <View style={[styles.noteBox, { backgroundColor: '#64748B12', borderColor: '#64748B30' }]}>
                        <Ionicons name="refresh-outline" size={14} color="#64748B" />
                        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                            This payment was refunded back to you.
                        </Text>
                    </View>
                )}

                {item.status === 'awaiting_payment' && (
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.payBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handlePayNow(item)}
                        >
                            <Text style={styles.payBtnText}>Pay Now</Text>
                            <Ionicons name="arrow-forward" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
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
    cardHeaderRight: {
        alignItems: 'flex-end',
        gap: 8,
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
        marginTop: 12,
    },
    payBtn: {
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
});

export default EscrowScreen;
