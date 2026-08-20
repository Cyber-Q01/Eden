import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { usePayment } from '../../hooks/usePayment';

const RentPaymentScreen = () => {
    const { rental_id } = useLocalSearchParams<{ rental_id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const { initializeRentPayment, verifyRentPayment, loading } = usePayment();

    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [reference, setReference] = useState<string | null>(null);
    const [propertyTitle, setPropertyTitle] = useState('');
    const [propertyLocation, setPropertyLocation] = useState('');
    const [amount, setAmount] = useState(0);
    const [verifying, setVerifying] = useState(false);
    const [initError, setInitError] = useState(false);

    // ✅ Prevent double verification
    const hasVerified = useRef(false);

    useEffect(() => {
        if (!rental_id) return;
        loadPayment();
    }, [rental_id]);

    const loadPayment = async () => {
        setInitError(false);
        hasVerified.current = false;
        const data = await initializeRentPayment(rental_id as string);
        if (data) {
            setPaymentUrl(data.authorization_url);
            setReference(data.reference);
            setPropertyTitle(data.property_title ?? '');
            setPropertyLocation(data.property_location ?? '');
            setAmount(data.amount ?? 0);
        } else {
            setInitError(true);
        }
    };

    const handleNavigationChange = async (navState: any) => {
        const { url } = navState;

        if (!url) return;

        console.log('WebView navigating to:', url);

        // ✅ Catch all Paystack completion URLs
        const isComplete =
            url.includes('paystack-callback') ||
            url.includes('payment/verify') ||
            url.includes('paystack.co/close') ||
            url.includes('standard.paystack.co/close');

        if (isComplete && reference && !hasVerified.current) {
            hasVerified.current = true; // prevent double call
            setVerifying(true);

            try {
                const result = await verifyRentPayment(reference);
                setVerifying(false);

                if (result?.status === 'successful') {
                    // ✅ Payment confirmed — go to PaymentSuccessScreen
                    router.replace({
                        pathname: '/shared-screens/PaymentSuccessScreen',
                        params: {
                            txn_id: reference || 'TXN-' + Date.now(),
                            amount: amount.toString(),
                            date: new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }),
                            property: propertyTitle,
                            rental_id: result.rental_id || rental_id,
                            confirmation_deadline: result.confirmation_deadline || '',
                        },
                    });
                } else {
                    // ❌ Payment failed or pending
                    router.replace({
                        pathname: '/shared-screens/PaymentFailedScreen',
                        params: { rental_id },
                    });
                }
            } catch (e) {
                console.error('Verification failed:', e);
                setVerifying(false);
                hasVerified.current = false; // allow retry
            }
        }
    };

    if (loading && !paymentUrl) {
        return (
            <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Preparing secure payment...
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    if (initError) {
        return (
            <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
                    <Text style={[styles.errorTitle, { color: colors.text }]}>
                        Unable to load payment
                    </Text>
                    <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
                        Please go back and try again.
                    </Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                        onPress={loadPayment}
                    >
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    if (!paymentUrl) return null;

    return (
        <ScreenWrapper
            disableKeyboardAvoidingView
            withScrollView={true}
            style={{ backgroundColor: colors.background }}
        >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Secure Payment</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Property summary strip */}
            <View
                style={[
                    styles.summaryStrip,
                    { backgroundColor: colors.primary + '10', borderBottomColor: colors.border },
                ]}
            >
                <View style={styles.summaryLeft}>
                    <Ionicons name="home-outline" size={18} color={colors.primary} />
                    <View style={{ marginLeft: 10 }}>
                        <Text
                            style={[styles.summaryTitle, { color: colors.text }]}
                            numberOfLines={1}
                        >
                            {propertyTitle}
                        </Text>
                        <Text
                            style={[styles.summaryLocation, { color: colors.textSecondary }]}
                            numberOfLines={1}
                        >
                            {propertyLocation}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.summaryAmount, { color: colors.primary }]}>
                    ₦{amount.toLocaleString()}
                </Text>
            </View>

            {/* Verifying overlay */}
            {verifying ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Verifying your payment...
                    </Text>
                    <Text style={[styles.subText, { color: colors.textSecondary }]}>
                        Please don't close the app
                    </Text>
                </View>
            ) : (
                <WebView
                    source={{ uri: paymentUrl }}
                    onNavigationStateChange={handleNavigationChange}
                    style={{ flex: 1 }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    setSupportMultipleWindows={false}
                    javaScriptCanOpenWindowsAutomatically={true}
                    mixedContentMode="compatibility"
                    startInLoadingState
                    renderLoading={() => (
                        <View
                            style={[styles.centered, { backgroundColor: colors.background }]}
                        >
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    )}
                />
            )}

            {/* Trust badge */}
            <View
                style={[
                    styles.trustBar,
                    { backgroundColor: colors.card, borderTopColor: colors.border },
                ]}
            >
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
                <Text style={[styles.trustText, { color: colors.textSecondary }]}>
                    Funds held securely in escrow until you confirm the apartment
                </Text>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        gap: 12,
    },
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
    summaryStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    summaryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    summaryTitle: { fontSize: 14, fontWeight: '600' },
    summaryLocation: { fontSize: 12, marginTop: 2 },
    summaryAmount: { fontSize: 16, fontWeight: '800' },
    trustBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingBottom: 28,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    trustText: { fontSize: 11, flex: 1 },
    loadingText: { fontSize: 14, marginTop: 8 },
    subText: { fontSize: 12 },
    errorTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
    errorSub: { fontSize: 14, textAlign: 'center', marginTop: 4 },
    retryBtn: { marginTop: 20, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
    retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default RentPaymentScreen;