import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

type RentalData = {
    id: string;
    status: string;
    confirmation_deadline: string | null;
    property: {
        title: string;
        location: string;
    } | null;
};

type PaymentDetail = {
    id: string;
    type: 'membership' | 'rent' | 'topup' | 'unlock';
    amount: number;
    paystack_reference: string | null;
    paystack_status?: string | null;
    status: string;
    paid_at: string | null;
    created_at: string;
    metadata?: {
        rental_id?: string;
        property_id?: string;
        owner_id?: string;
        user_id?: string;
    } | null;
    credits?: number;
    property_id?: string;
    property?: {
        title: string;
        location: string;
    } | null;
    rental?: RentalData | null;
};

const PaymentDetailsScreen = () => {
    const { payment_id } = useLocalSearchParams<{ payment_id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    const [payment, setPayment] = useState<PaymentDetail | null>(null);
    const [payments, setPayments] = useState<PaymentDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (payment_id) {
            loadPaymentDetails();
        } else {
            loadPaymentHistory();
        }
    }, [payment_id]);

    const loadPaymentHistory = async () => {
        setLoading(true);
        try {
            if (!user) return;

            // Fetch standard payments
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('payments')
                .select('*')
                .eq('user_id', user.id);

            if (paymentsError) throw paymentsError;

            // Fetch credit transactions
            const { data: creditData, error: creditError } = await supabase
                .from('credit_transactions')
                .select(`
                    *,
                    property:properties(title, location)
                `)
                .eq('user_id', user.id);

            if (creditError) throw creditError;

            // Map and merge
            const mappedCredits: PaymentDetail[] = (creditData || []).map(tx => ({
                id: tx.id,
                type: tx.type as any,
                amount: tx.naira_amount || 0,
                paystack_reference: tx.paystack_reference,
                status: 'successful',
                paid_at: tx.created_at,
                created_at: tx.created_at,
                credits: tx.credits,
                property_id: tx.property_id,
                property: tx.property,
                rental: null
            }));

            const combined = [
                ...(paymentsData || []).map(p => ({ ...p, rental: null })),
                ...mappedCredits
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setPayments(combined);
        } catch (e: any) {
            console.error('loadPaymentHistory failed:', e.message);
            showError({
                type: 'unknown',
                title: 'History Error',
                message: 'Could not load transaction history'
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadPaymentDetails = async () => {
        setLoading(true);

        try {
            // Try fetching from payments first
            const { data: paymentData, error: paymentError } = await supabase
                .from('payments')
                .select('*')
                .eq('id', payment_id)
                .maybeSingle();

            if (paymentData) {
                let rental: RentalData | null = null;
                const rentalId = paymentData.metadata?.rental_id;

                if (paymentData.type === 'rent' && rentalId) {
                    const { data: rentalData } = await supabase
                        .from('rentals')
                        .select(`
                            id,
                            status,
                            confirmation_deadline,
                            property:properties(title, location)
                        `)
                        .eq('id', rentalId)
                        .single();

                    if (rentalData) {
                        const raw = rentalData as any;
                        rental = {
                            id: raw.id,
                            status: raw.status,
                            confirmation_deadline: raw.confirmation_deadline,
                            property: Array.isArray(raw.property) ? raw.property[0] : raw.property
                        };
                    }
                }
                setPayment({ ...paymentData, rental });
                return;
            }

            // If not found, try credit_transactions
            const { data: creditData, error: creditError } = await supabase
                .from('credit_transactions')
                .select(`
                    *,
                    property:properties(title, location)
                `)
                .eq('id', payment_id)
                .maybeSingle();

            if (creditError) throw creditError;

            if (creditData) {
                setPayment({
                    id: creditData.id,
                    type: creditData.type as any,
                    amount: creditData.naira_amount || 0,
                    paystack_reference: creditData.paystack_reference,
                    status: 'successful',
                    paid_at: creditData.created_at,
                    created_at: creditData.created_at,
                    credits: creditData.credits,
                    property_id: creditData.property_id,
                    property: creditData.property,
                    rental: null
                });
            } else {
                throw new Error('Transaction not found');
            }

        } catch (e: any) {
            console.error('loadPaymentDetails failed:', e.message);
            showError({
                type: 'unknown',
                title: 'Load Error',
                message: 'Could not load transaction details'
            });
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const copyReference = async () => {
        if (!payment) return;
        try {
            await Clipboard.setStringAsync(payment.paystack_reference);
            showSuccess('Reference copied!');
        } catch (e) {
            console.error('Copy failed:', e);
        }
    };

    const shareReceipt = async () => {
        if (!payment) return;
        try {
            await Share.share({
                message: [
                    'Transaction Receipt — EdenHome',
                    '',
                    `Type: ${payment.type === 'rent' ? 'Rent Payment' :
                        payment.type === 'membership' ? 'Membership Fee' :
                            payment.type === 'topup' ? 'Credit Top-up' : 'Property Unlock'}`,
                    `Amount: ${payment.type === 'unlock' ? (payment.credits + ' credits') : ('₦' + payment.amount.toLocaleString())}`,
                    `Status: ${payment.status}`,
                    payment.paystack_reference ? `Reference: ${payment.paystack_reference}` : '',
                    `Date: ${formatDate(payment.paid_at ?? payment.created_at)}`,
                ].filter(Boolean).join('\n'),
            });
        } catch (e) {
            console.error('Share failed:', e);
        }
    };

    const goToRentalConfirmation = () => {
        if (!payment?.rental || !payment.metadata?.rental_id) return;
        router.push({
            pathname: '/shared-screens/RentalConfirmationScreen',
            params: {
                rental_id: payment.metadata.rental_id,
                confirmation_deadline: payment.rental.confirmation_deadline ?? '',
                property_title: payment.rental.property?.title ?? '',
                amount: payment.amount.toString(),
            },
        });
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'successful':
            case 'confirmed':
            case 'released':
                return '#10b981';
            case 'pending':
            case 'awaiting_payment':
            case 'awaiting_confirmation':
                return '#f59e0b';
            case 'failed':
            case 'disputed':
            case 'refunded':
                return '#ef4444';
            default:
                return colors.textSecondary;
        }
    };

    const getStatusIcon = (status: string): any => {
        switch (status) {
            case 'successful':
            case 'confirmed':
            case 'released':
                return 'checkmark-circle';
            case 'pending':
            case 'awaiting_payment':
            case 'awaiting_confirmation':
                return 'time-outline';
            case 'failed':
            case 'disputed':
                return 'close-circle';
            case 'refunded':
                return 'arrow-undo-circle';
            default:
                return 'help-circle-outline';
        }
    };

    const formatStatus = (status: string) =>
        status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // ── Loading ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <ScreenWrapper withScrollView={true} style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <BackButton />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Details</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Loading payment...
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    // ── Payment History List View (If no ID provided) ────────────────
    if (!payment_id) {
        return (
            <ScreenWrapper
                withScrollView={false}
                style={[styles.container, { backgroundColor: colors.background }]}
            >
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <BackButton />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Payment History</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <ActivityIndicator
                            animating={refreshing}
                            color={colors.primary}
                            style={{ marginTop: 10 }}
                        />
                    }
                >
                    {payments.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No payments found
                            </Text>
                        </View>
                    ) : (
                        payments.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.paymentItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => router.push({
                                    pathname: '/shared-screens/PaymentHistoryScreen',
                                    params: { payment_id: item.id }
                                })}
                            >
                                <View style={[styles.itemIconWrap, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                                    <Ionicons
                                        name={
                                            item.type === 'rent' ? 'home' :
                                                item.type === 'membership' ? 'card' :
                                                    item.type === 'topup' ? 'add-circle' : 'lock-open'
                                        }
                                        size={20}
                                        color={getStatusColor(item.status)}
                                    />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={[styles.itemType, { color: colors.text }]} numberOfLines={1}>
                                        {item.type === 'rent' ? 'Rent Payment' :
                                            item.type === 'membership' ? 'Membership Fee' :
                                                item.type === 'topup' ? 'Credit Top-up' : 'Property Unlock'}
                                    </Text>
                                    <Text style={[styles.itemDate, { color: colors.textSecondary }]}>
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={styles.itemRight}>
                                    <Text style={[styles.itemAmount, { color: colors.text }]}>
                                        {item.type === 'unlock' ? `${item.credits} Credits` : `₦${item.amount.toLocaleString()}`}
                                    </Text>
                                    <Text style={[styles.itemStatus, { color: getStatusColor(item.status) }]}>
                                        {formatStatus(item.status)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </ScreenWrapper>
        );
    }

    if (!payment) return null;

    const statusColor = getStatusColor(payment.status);
    const isRent = payment.type === 'rent';
    const canConfirmRental =
        isRent &&
        payment.status === 'successful' &&
        payment.rental?.status === 'awaiting_confirmation';

    return (
        <ScreenWrapper
            withScrollView={true}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Details</Text>
                <TouchableOpacity onPress={shareReceipt} style={styles.shareBtn}>
                    <Ionicons name="share-outline" size={22} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Status */}
                <View style={styles.statusSection}>
                    <View style={[styles.statusIconWrap, { backgroundColor: statusColor + '15' }]}>
                        <Ionicons
                            name={getStatusIcon(payment.status)}
                            size={56}
                            color={statusColor}
                        />
                    </View>
                    <Text style={[styles.statusLabel, { color: statusColor }]}>
                        {formatStatus(payment.status)}
                    </Text>
                </View>

                {/* Amount */}
                <View style={styles.amountSection}>
                    <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                        Amount Paid
                    </Text>
                    <Text style={[styles.amountValue, { color: colors.text }]}>
                        {payment.type === 'unlock' ? '₦666' : `₦${payment.amount.toLocaleString()}`}
                    </Text>
                </View>

                {/* Details Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <DetailRow
                        label="Type"
                        value={
                            payment.type === 'rent' ? 'Rent Payment' :
                                payment.type === 'membership' ? 'Membership Fee' :
                                    payment.type === 'topup' ? 'Credit Top-up' : 'Property Unlock'
                        }
                        colors={colors}
                    />

                    {payment.type !== 'unlock' && (
                        <>
                            <Divider colors={colors} />
                            <DetailRow
                                label="Reference"
                                value={payment.paystack_reference || 'N/A'}
                                colors={colors}
                                onPress={payment.paystack_reference ? copyReference : undefined}
                                icon={payment.paystack_reference ? "copy-outline" : undefined}
                                mono
                            />
                        </>
                    )}

                    <Divider colors={colors} />

                    <DetailRow
                        label="Date"
                        value={formatDate(payment.paid_at ?? payment.created_at)}
                        colors={colors}
                    />

                    {isRent && payment.rental && (
                        <>
                            <Divider colors={colors} />
                            <DetailRow
                                label="Property"
                                value={payment.rental.property?.title ?? '—'}
                                colors={colors}
                            />
                            <Divider colors={colors} />
                            <DetailRow
                                label="Location"
                                value={payment.rental.property?.location ?? '—'}
                                colors={colors}
                            />
                            <Divider colors={colors} />
                            <DetailRow
                                label="Rental Status"
                                value={formatStatus(payment.rental.status)}
                                colors={colors}
                                valueColor={getStatusColor(payment.rental.status)}
                            />
                        </>
                    )}

                    {payment.type === 'topup' && (
                        <>
                            <Divider colors={colors} />
                            <DetailRow
                                label="Credits Added"
                                value={`${payment.credits} Unlocks`}
                                colors={colors}
                            />
                        </>
                    )}

                    {payment.type === 'unlock' && (
                        <>
                            <Divider colors={colors} />
                            <DetailRow
                                label="Credits Used"
                                value={`${payment.credits} Credits`}
                                colors={colors}
                            />
                            {payment.property && (
                                <>
                                    <Divider colors={colors} />
                                    <DetailRow
                                        label="Property"
                                        value={payment.property.title}
                                        colors={colors}
                                    />
                                    <Divider colors={colors} />
                                    <DetailRow
                                        label="Location"
                                        value={payment.property.location}
                                        colors={colors}
                                    />
                                </>
                            )}
                        </>
                    )}
                </View>

                {/* Go to confirmation if awaiting */}
                {canConfirmRental && (
                    <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                        onPress={goToRentalConfirmation}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                        <Text style={styles.confirmBtnText}>Confirm Your Apartment</Text>
                    </TouchableOpacity>
                )}

                {/* Info note */}
                <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                        All payments are secured and processed by Paystack. For disputes, contact support with your reference number.
                    </Text>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

// ── Sub-components ───────────────────────────────────────────────────────────

const DetailRow = ({
    label,
    value,
    colors,
    onPress,
    icon,
    valueColor,
    mono,
}: {
    label: string;
    value: string;
    colors: any;
    onPress?: () => void;
    icon?: string;
    valueColor?: string;
    mono?: boolean;
}) => (
    <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            style={styles.detailValueContainer}
            activeOpacity={onPress ? 0.6 : 1}
        >
            <Text
                style={[
                    styles.detailValue,
                    { color: valueColor ?? colors.text },
                    mono && styles.monoText,
                    !!onPress && { color: colors.primary },
                ]}
                numberOfLines={2}
            >
                {value}
            </Text>
            {icon && (
                <Ionicons name={icon as any} size={15} color={colors.primary} />
            )}
        </TouchableOpacity>
    </View>
);

const Divider = ({ colors }: { colors: any }) => (
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
);

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    shareBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 20, gap: 20, paddingBottom: 40 },
    statusSection: { alignItems: 'center', gap: 12, paddingVertical: 8 },
    statusIconWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusLabel: { fontSize: 18, fontWeight: '700' },
    amountSection: { alignItems: 'center', gap: 4 },
    amountLabel: { fontSize: 13, fontWeight: '500' },
    amountValue: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        gap: 14,
    },
    divider: { height: StyleSheet.hairlineWidth },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    detailLabel: { fontSize: 14, fontWeight: '500', flex: 1 },
    detailValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1.5,
        justifyContent: 'flex-end',
    },
    detailValue: { fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1 },
    monoText: { fontFamily: 'monospace', fontSize: 12 },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        borderRadius: 14,
        gap: 8,
    },
    confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    noteCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    noteText: { fontSize: 12, flex: 1, lineHeight: 18 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
    emptyText: { fontSize: 16, fontWeight: '500' },
    paymentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        gap: 12,
    },
    itemIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemInfo: { flex: 1, gap: 2 },
    itemType: { fontSize: 15, fontWeight: '600' },
    itemDate: { fontSize: 12 },
    itemRight: { alignItems: 'flex-end', gap: 2 },
    itemAmount: { fontSize: 15, fontWeight: '700' },
    itemStatus: { fontSize: 11, fontWeight: '600' },
});

export default PaymentDetailsScreen;