import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useToast } from '../../components/Toast';
import { RENT_RECEIPT_HTML } from '../../constants/receiptHtml';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLeases } from '../../hooks/useLeases';

const { width } = Dimensions.get('window');

const LeaseDetailsScreen = () => {
    const router = useRouter();
    const { rentalId } = useLocalSearchParams();
    const { colors } = useTheme();
    const { fetchLeaseDetails, loading } = useLeases();
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [lease, setLease] = useState<any>(null);
    const [isDocModalVisible, setIsDocModalVisible] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (rentalId) {
            loadLeaseData();
        }
    }, [rentalId]);

    const loadLeaseData = async () => {
        const data = await fetchLeaseDetails(rentalId as string);
        setLease(data);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (loading && !lease) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!lease) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
                <Text style={[styles.errorText, { color: colors.text + '80' }]}>Lease not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                    <Text style={[styles.backLinkText, { color: colors.primary }]}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const property = lease.property;
    const owner = property?.owner;
    const startDate = new Date(lease.created_at);
    const endDate = new Date(startDate);
    endDate.setFullYear(startDate.getFullYear() + 1);

    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
    const daysPassed = (new Date().getTime() - startDate.getTime()) / (1000 * 3600 * 24);
    const daysRemaining = Math.max(0, Math.ceil(totalDays - daysPassed));
    const progress = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));

    const downloadReceipt = async () => {
        if (!lease || !user) return;

        setGenerating(true);
        try {
            const latestPayment = lease.payments?.find((p: any) => p.status === 'success') || {};
            const amount = latestPayment.amount || lease.property?.price || 0;
            const date = latestPayment.created_at ? new Date(latestPayment.created_at) : new Date();

            const tenantName = (user.user_metadata?.first_name && user.user_metadata?.last_name)
                ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                : user.email?.split('@')[0] || 'Tenant';

            const landlordObj = lease.property?.owner;
            const landlordName = (landlordObj?.first_name && landlordObj?.last_name)
                ? `${landlordObj.first_name} ${landlordObj.last_name}`
                : 'Landlord';

            const html = RENT_RECEIPT_HTML
                .replace('{{receiptNo}}', latestPayment.id?.slice(0, 8).toUpperCase() || 'N/A')
                .replace('{{dateIssued}}', formatDate(date))
                .replace('{{paymentMethod}}', latestPayment.payment_method || 'Bank Transfer')
                .replace('{{tenantName}}', tenantName)
                .replace('{{propertyTitle}}', lease.property?.title || 'Property')
                .replace('{{landlordName}}', landlordName)
                .replace('{{totalAmount}}', Number(amount).toLocaleString())
                .replace('{{paymentFor}}', `Rent - ${formatDate(startDate)} to ${formatDate(endDate)}`)
                .replace('{{transactionId}}', latestPayment.reference || 'N/A');

            const { uri } = await Print.printToFileAsync({ html });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
                showSuccess('Receipt downloaded successfully');
            } else {
                showError({ type: 'unknown', title: 'Feature Not Available', message: 'Sharing is not available on this device' });
            }
        } catch (error) {
            console.error('Error generating receipt:', error);
            showError({ type: 'unknown', title: 'Error', message: 'Failed to generate receipt' });
        } finally {
            setGenerating(false);
            setIsDocModalVisible(false);
        }
    };

    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            <StatusBar barStyle={colors.background === '#000000' ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Lease Details</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Hero Lease Card */}
                <View style={styles.leaseCardContainer}>
                    <LinearGradient
                        colors={[colors.primary, colors.primary + 'CC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.leaseCard}
                    >
                        <View style={[styles.decorCircle, { width: 160, height: 160, right: -40, top: -40 }]} />
                        <View style={[styles.decorCircle, { width: 100, height: 100, left: 180, bottom: -30 }]} />

                        <View style={styles.cardHeader}>
                            <View style={styles.badgeRow}>
                                <Text style={styles.badgeLabel}>Active Lease</Text>
                                <View style={styles.activeDot} />
                            </View>
                        </View>

                        <Text style={styles.propertyTitle}>{property?.title || 'Property'}</Text>
                        <Text style={styles.landlordName}>{owner?.first_name} {owner?.last_name || 'Landlord'}</Text>

                        <View style={styles.dateInfo}>
                            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                            <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                        </View>

                        <View style={styles.progressContainer}>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                            </View>
                            <View style={styles.progressLabelRow}>
                                <Text style={styles.progressLabel}>
                                    {Math.round(progress)}% complete • {daysRemaining} days remaining
                                </Text>
                                <TouchableOpacity
                                    style={styles.viewDocBtn}
                                    onPress={() => setIsDocModalVisible(true)}
                                >
                                    <Text style={styles.viewDocText}>Documents</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionRow}>
                    <ActionButton
                        icon="receipt-outline"
                        label="Receipts"
                        onPress={() => setIsDocModalVisible(true)}
                        colors={colors}
                    />
                    <ActionButton
                        icon="construct-outline"
                        label="Maintain"
                        onPress={() => router.push('/profile/maintenance-request')}
                        colors={colors}
                    />
                    <ActionButton
                        icon="headset-outline"
                        label="Support"
                        onPress={() => router.push('/shared-screens/HelpSupportScreen')}
                        colors={colors}
                    />
                    <ActionButton
                        icon="alert-circle-outline"
                        label="Report"
                        onPress={() => router.push('/profile/complaint-request')}
                        color="#F97316"
                        colors={colors}
                    />
                </View>

                {/* Lease Information */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Lease Terms</Text>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TermRow label="Annual Rent" value={`₦${Number(lease.amount || 0).toLocaleString()}`} colors={colors} />
                    <TermRow label="Caution Fee" value={`₦${Number(property?.caution_fee || 0).toLocaleString()}`} colors={colors} />
                    <TermRow label="Notice Period" value="3 months" colors={colors} />
                    <TermRow label="Renewal Option" value="Yes" colors={colors} />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <TermRow label="Status" value="Confirmed" colors={colors} isStatus />
                </View>

                {/* Payment History */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Payment History</Text>
                        <TouchableOpacity onPress={() => router.push('/shared-screens/PaymentHistoryScreen')}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {lease.payments?.slice(0, 3).map((payment: any, index: number) => (
                        <View key={payment.id}>
                            <PaymentRow
                                label={`${new Date(payment.paid_at || payment.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} Rent`}
                                amount={`₦${Number(payment.amount).toLocaleString()}`}
                                status={payment.status === 'successful' ? 'Paid' : 'Due'}
                                colors={colors}
                            />
                            {index < (lease.payments?.slice(0, 3).length - 1) && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                        </View>
                    ))}

                    {(!lease.payments || lease.payments.length === 0) && (
                        <Text style={{ textAlign: 'center', color: colors.text + '60', paddingVertical: 10 }}>No payment history available</Text>
                    )}
                </View>
            </ScrollView>

            {/* Documents Modal */}
            <Modal
                visible={isDocModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsDocModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsDocModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={[styles.modalTitle, { color: colors.text }]}>Lease Documents</Text>
                                    <TouchableOpacity onPress={() => setIsDocModalVisible(false)}>
                                        <Ionicons name="close" size={24} color={colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={[styles.docItem, { borderBottomColor: colors.border }]}
                                    onPress={downloadReceipt}
                                    disabled={generating}
                                >
                                    <View style={[styles.docIconBg, { backgroundColor: colors.primary + '15' }]}>
                                        {generating ? (
                                            <ActivityIndicator size="small" color={colors.primary} />
                                        ) : (
                                            <Ionicons name="receipt-outline" size={22} color={colors.primary} />
                                        )}
                                    </View>
                                    <View style={styles.docInfo}>
                                        <Text style={[styles.docName, { color: colors.text }]}>Payment Receipt</Text>
                                        <Text style={[styles.docMeta, { color: colors.text + '60' }]}>Official rent confirmation</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.text + '40'} />
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </ScreenWrapper>
    );
};

const ActionButton = ({ icon, label, onPress, color, colors }: any) => (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
        <View style={[styles.actionIconBg, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
            <Ionicons name={icon} size={22} color={color || colors.primary} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
);

const TermRow = ({ label, value, colors, isStatus }: any) => (
    <View style={styles.termRow}>
        <Text style={[styles.termLabel, { color: colors.text + '80' }]}>{label}</Text>
        {isStatus ? (
            <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.statusText, { color: '#166534' }]}>{value.toUpperCase()}</Text>
            </View>
        ) : (
            <Text style={[styles.termValue, { color: colors.text }]}>{value}</Text>
        )}
    </View>
);

const PaymentRow = ({ label, amount, status, colors }: any) => (
    <View style={styles.paymentRow}>
        <Text style={[styles.paymentPeriod, { color: colors.text + '80' }]}>{label}</Text>
        <View style={styles.paymentRight}>
            <Text style={[styles.paymentAmount, { color: colors.text }]}>{amount}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status === 'Paid' ? '#DCFCE7' : '#FEE2E2' }]}>
                <Text style={[styles.statusText, { color: status === 'Paid' ? '#166534' : '#991B1B' }]}>{status}</Text>
            </View>
        </View>
    </View>
);

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, color: '#64748B', marginBottom: 16 },
    backLink: { padding: 10 },
    backLinkText: { color: '#1D4ED8', fontWeight: '600' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    leaseCardContainer: { marginTop: 10, marginBottom: 24 },
    leaseCard: {
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    decorCircle: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 999,
    },
    cardHeader: { marginBottom: 12 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    badgeLabel: { color: '#BFDBFE', fontSize: 12, fontWeight: '600' },
    activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    propertyTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 4 },
    landlordName: { color: '#BFDBFE', fontSize: 13, marginBottom: 16 },
    dateInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    dateText: { color: '#BFDBFE', fontSize: 12 },
    progressContainer: { marginTop: 4 },
    progressBarBg: { height: 6, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 3, marginBottom: 12 },
    progressBarFill: { height: '100%', backgroundColor: '#FDBA74', borderRadius: 3 },
    progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressLabel: { color: '#BFDBFE', fontSize: 11 },
    viewDocBtn: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99 },
    viewDocText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    actionItem: { alignItems: 'center', width: (width - 40) / 4 },
    actionIconBg: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    actionLabel: { fontSize: 12, fontWeight: '500' },
    sectionCard: { borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    divider: { height: 1, marginVertical: 12 },
    termRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    termLabel: { fontSize: 13 },
    termValue: { fontSize: 13, fontWeight: '600' },
    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    paymentPeriod: { fontSize: 13 },
    paymentRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    paymentAmount: { fontSize: 13, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
    statusText: { fontSize: 10, fontWeight: '700' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    docItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    docIconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    docInfo: {
        flex: 1,
    },
    docName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    docMeta: {
        fontSize: 12,
    },
});

export default LeaseDetailsScreen;
