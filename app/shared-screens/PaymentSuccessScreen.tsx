import CustomButton from '@/components/CustomButton';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';

const PaymentSuccessScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { txn_id, amount, date, property, rental_id, confirmation_deadline } = useLocalSearchParams<{
        txn_id?: string;
        amount?: string;
        date?: string;
        property?: string;
        rental_id?: string;
        confirmation_deadline?: string;
    }>();

    const formattedAmount = amount ? `₦${Number(amount).toLocaleString()}` : '₦0';

    const handleGoToCountdown = () => {
        if (!rental_id) {
            Alert.alert('Error', 'Rental ID is missing. Cannot open confirmation screen.');
            return;
        }
        router.replace({
            pathname: '/shared-screens/RentalConfirmationScreen',
            params: {
                rental_id: rental_id,
                confirmation_deadline: confirmation_deadline || '',
                property_title: property || 'Selected Property',
                amount: amount || '0',
            }
        });
    };

    const handleDownloadReceipt = () => {
        const receiptUrl = `https://eden-receipts.vercel.app/receipt?ref=${txn_id || ''}&amount=${amount || '0'}&property=${encodeURIComponent(property || '')}&date=${encodeURIComponent(date || '')}`;
        router.push({
            pathname: '/shared-screens/WebViewScreen',
            params: {
                url: receiptUrl,
                title: 'Payment Receipt',
            }
        });
    };

    const handleViewLease = () => {
        router.push('/shared-screens/LeasesScreen');
    };

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} withScrollView={true}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={{ width: 40 }} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Success</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Success Checkmark with scattered dots */}
                <View style={styles.heroContainer}>
                    <Image
                        source={require('../../assets/images/success.png')}
                        style={styles.heroImage}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>Payment Successful!</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>
                        Your rent payment has been received and is secured in escrow.
                    </Text>
                </View>

                {/* Details Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Transaction Details</Text>
                    
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Transaction ID</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {txn_id || 'N/A'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Amount Paid</Text>
                        <Text style={[styles.detailValue, { color: colors.text, fontWeight: '700' }]}>
                            {formattedAmount}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {date || 'N/A'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Property</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
                            {property || 'Selected Property'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
                        <View style={styles.badgeContainer}>
                            <View style={[styles.statusBadge, { backgroundColor: '#E8F5E9' }]}>
                                <Text style={styles.statusBadgeText}>In Escrow</Text>
                            </View>
                        </View>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Receipt Link */}
                    <TouchableOpacity 
                        style={styles.receiptLink}
                        onPress={handleDownloadReceipt}
                    >
                        <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                        <Text style={[styles.receiptLinkText, { color: colors.primary }]}>
                            Download Receipt
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <CustomButton
                    title="Confirm Apartment (Countdown)"
                    onPress={handleGoToCountdown}
                    style={styles.primaryButton}
                />

                <TouchableOpacity
                    style={[styles.outlineButton, { borderColor: colors.border }]}
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text style={[styles.outlineButtonText, { color: colors.text }]}>
                        Go to Dashboard
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleViewLease}
                >
                    <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                        View Lease Agreement
                    </Text>
                </TouchableOpacity>
            </View>
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
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: 16, fontWeight: '700' },
    scrollContent: { padding: 16, paddingBottom: 10 },
    heroContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    heroImage: {
        width: 120,
        height: 120,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 4,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    card: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 8,
    },
    detailLabel: {
        fontSize: 13,
        flex: 1,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'right',
        flex: 2,
    },
    badgeContainer: {
        flex: 2,
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2E7D32',
    },
    divider: {
        height: 1,
        width: '100%',
    },
    receiptLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingTop: 12,
        paddingBottom: 2,
    },
    receiptLinkText: {
        fontSize: 13,
        fontWeight: '700',
    },
    footer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    primaryButton: {
        marginBottom: 8,
    },
    outlineButton: {
        borderWidth: 1,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    outlineButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryButton: {
        alignItems: 'center',
        paddingVertical: 6,
    },
    secondaryButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
});

export default PaymentSuccessScreen;
