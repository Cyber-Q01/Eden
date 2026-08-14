import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import WebView from 'react-native-webview';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useCredits } from '../../hooks/useCredits';

const { width } = Dimensions.get('window');

const CREDIT_PRICE = 666;
const VAT_RATE = 0.075;

const UNLOCK_OPTIONS = [3, 6, 9, 12, 18, 21];
const BUNDLES = UNLOCK_OPTIONS.map((unlocks) => {
    const subtotal = unlocks * CREDIT_PRICE;
    const vat = subtotal * VAT_RATE;
    const amount = Math.round(subtotal + vat);
    return { unlocks, subtotal, vat, amount };
});

const TopUpCreditsScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { credits, loading, fetchCredits, initializeTopUp, verifyTopUp } = useCredits();

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [paystackUrl, setPaystackUrl] = useState<string | null>(null);
    const [currentReference, setCurrentReference] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const { height: SCREEN_HEIGHT } = Dimensions.get('window');
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isModalVisible) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isModalVisible]);

    const openModal = () => {
        setIsModalVisible(true);
    };

    const closeModal = (callback?: () => void) => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 280,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setIsModalVisible(false);
            if (callback) callback();
        });
    };

    const selected = BUNDLES[selectedIndex];
    const currentBalanceNaira = credits * CREDIT_PRICE;
    const newBalanceNaira = currentBalanceNaira + selected.amount;

    // Redundant useEffect removed as useCredits handles initial fetch

    const handlePay = async () => {
        setProcessing(true);
        try {
            const data = await initializeTopUp(selected.amount, selected.unlocks);
            if (data) {
                setCurrentReference(data.reference);
                closeModal(() => {
                    setPaystackUrl(data.authorization_url);
                });
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleWebviewBack = async () => {
        if (currentReference) {
            setPaystackUrl(null);
            setVerifying(true);
            const success = await verifyTopUp(currentReference);
            setVerifying(false);
            if (success) {
                setCurrentReference(null);
                await fetchCredits();
            }
        } else {
            setPaystackUrl(null);
        }
    };

    const handleWebViewNav = async (navState: any) => {
        const url: string = navState.url ?? '';

        if (
            (url.includes('Eden://credits/verify') ||
                url.includes('paystack-callback') ||
                url.includes('paystack.co/close') ||
                url.includes('standard.paystack.co/close')) &&
            currentReference
        ) {
            setPaystackUrl(null);
            setVerifying(true);
            const success = await verifyTopUp(currentReference);
            setVerifying(false);
            if (success) {
                setCurrentReference(null);
                await fetchCredits();
            }
        }

        if (url.includes('Eden://credits/cancelled')) {
            setPaystackUrl(null);
            setCurrentReference(null);
        }
    };

    // ── Paystack WebView ──────────────────────────────────────────────────────
    if (paystackUrl) {
        return (
            <ScreenWrapper disableKeyboardAvoidingView>
                <View style={styles.webviewContainer}>
                    <View style={[styles.webviewHeader, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={handleWebviewBack} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.webviewTitle, { color: colors.text }]}>Secure Payment</Text>
                        <View style={{ width: 22 }} />
                    </View>
                    <WebView
                        source={{ uri: paystackUrl }}
                        onNavigationStateChange={handleWebViewNav}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        setSupportMultipleWindows={false}
                        javaScriptCanOpenWindowsAutomatically={true}
                        mixedContentMode="compatibility"
                        startInLoadingState
                        renderLoading={() => (
                            <View style={styles.webviewLoading}>
                                <ActivityIndicator color={colors.primary} size="large" />
                            </View>
                        )}
                    />
                </View>
            </ScreenWrapper>
        );
    }

    // ── Verifying state ───────────────────────────────────────────────────────
    if (verifying) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.verifyingText, { color: colors.text }]}>
                        Confirming your payment...
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <BackButton />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Fund Wallet</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <View style={styles.balanceCardInner}>
                        <Text style={styles.balanceLabel}>Wallet Balance</Text>
                        <Text style={styles.balanceAmount}>
                            N{(credits * CREDIT_PRICE).toLocaleString()}.00
                        </Text>
                        <Text style={styles.balanceUnlocks}>
                            {credits} service unit{credits !== 1 ? 's' : ''} available
                        </Text>
                    </View>
                    <View style={styles.balanceIconWrap}>
                        <Ionicons name="wallet-outline" size={40} color="rgba(255,255,255,0.3)" />
                    </View>
                </View>

                {/* Select Recharge */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Select Deposit Amount
                </Text>

                <View style={styles.bundleGrid}>
                    {BUNDLES.map((bundle, index) => {
                        const isSelected = index === selectedIndex;
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.bundleCard,
                                    {
                                        backgroundColor: isSelected ? colors.primary : colors.card,
                                        borderColor: isSelected ? colors.primary : colors.border,
                                    },
                                ]}
                                onPress={() => setSelectedIndex(index)}
                                activeOpacity={0.8}
                            >
                                {isSelected && (
                                    <View style={styles.bundleCheck}>
                                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                    </View>
                                )}
                                <Text
                                    style={[
                                        styles.bundleAmount,
                                        { color: isSelected ? '#fff' : colors.text },
                                    ]}
                                >
                                    N{bundle.amount.toLocaleString()}
                                </Text>
                                <Text
                                    style={[
                                        styles.bundleUnlocks,
                                        { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary },
                                    ]}
                                >
                                    {bundle.unlocks} units
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Summary Card */}
                <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                            Subtotal ({selected.unlocks} units)
                        </Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                            N{selected.subtotal.toLocaleString()}
                        </Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                            VAT (7.5%)
                        </Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                            N{selected.vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                            Total Payable
                        </Text>
                        <Text style={[styles.summaryValue, { color: colors.primary }]}>
                            N{selected.amount.toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Info Note */}
                <View style={styles.infoRow}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Each unit costs N{CREDIT_PRICE}
                    </Text>
                </View>
            </ScrollView>

            {/* CTA Button */}
            <View style={[styles.ctaContainer, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                    style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                    onPress={openModal}
                    activeOpacity={0.85}
                >
                    <Text style={styles.ctaText}>
                        Proceed to pay N{selected.amount.toLocaleString()}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Payment Method Bottom Sheet Modal */}
            <Modal
                transparent
                visible={isModalVisible}
                animationType="none"
                onRequestClose={() => closeModal()}
            >
                <TouchableWithoutFeedback onPress={() => closeModal()}>
                    <Animated.View
                        style={[
                            styles.modalBackdrop,
                            {
                                opacity: backdropOpacity,
                                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.55)',
                            },
                        ]}
                    />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        styles.modalSheet,
                        {
                            backgroundColor: colors.background,
                            transform: [{ translateY }],
                        },
                    ]}
                >
                    {/* Drag indicator handle */}
                    <View style={styles.modalDragArea}>
                        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                    </View>

                    <View style={styles.modalContent}>
                        {/* Title Row */}
                        <View style={styles.modalHeaderRow}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Payment Method</Text>
                            <View style={[styles.amountPillBadge, { backgroundColor: colors.primary + '10' }]}>
                                <Text style={[styles.amountPillText, { color: colors.primary }]}>
                                    N{selected.amount.toLocaleString()}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        {/* Paystack Option Card */}
                        <TouchableOpacity
                            style={[
                                styles.paymentOptionCard,
                                {
                                    borderColor: colors.primary,
                                    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.08)' : '#EFF6FF'
                                }
                            ]}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.paystackIconWrap, { backgroundColor: '#00C3F7' }]}>
                                <Text style={styles.paystackIconText}>P</Text>
                            </View>
                            <View style={styles.paymentOptionDetails}>
                                <Text style={[styles.paymentOptionTitle, { color: colors.text }]}>Paystack</Text>
                                <Text style={[styles.paymentOptionSubtitle, { color: colors.textSecondary }]}>
                                    Pay with card, bank transfer or USSD
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Security Banner */}
                        <View
                            style={[
                                styles.securityBanner,
                                {
                                    borderColor: isDark ? '#064E3B' : '#A7F3D0',
                                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5'
                                }
                            ]}
                        >
                            <View style={styles.securityIconWrap}>
                                <Ionicons name="lock-closed-outline" size={18} color={isDark ? '#34D399' : '#10B981'} />
                            </View>
                            <View style={styles.securityDetails}>
                                <Text style={[styles.securityTitle, { color: isDark ? '#34D399' : '#065F46' }]}>
                                    All transactions are 256-bit encrypted
                                </Text>
                                <Text style={[styles.securitySubtitle, { color: isDark ? '#059669' : '#059669' }]}>
                                    Your payment is 100% secure
                                </Text>
                            </View>
                        </View>

                        {/* CTA Pay Button */}
                        <TouchableOpacity
                            style={[styles.modalPayButton, { backgroundColor: colors.primary }]}
                            onPress={handlePay}
                            disabled={processing}
                            activeOpacity={0.85}
                        >
                            {processing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.modalPayButtonText}>
                                    Pay N{selected.amount.toLocaleString()} with Paystack
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
    },

    // Balance Card
    balanceCard: {
        backgroundColor: '#1A3A6B',
        borderRadius: 20,
        padding: 24,
        marginBottom: 28,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    balanceCardInner: {
        flex: 1,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 6,
    },
    balanceAmount: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 4,
    },
    balanceUnlocks: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: '500',
    },
    balanceIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Section Title
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 16,
    },

    // Bundle Grid
    bundleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    bundleCard: {
        width: (width - 64) / 3,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        position: 'relative',
    },
    bundleCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    bundleAmount: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    bundleUnlocks: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Summary Card
    summaryCard: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    summaryDivider: {
        height: StyleSheet.hairlineWidth,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '700',
    },

    // Info Note
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 20,
    },
    infoText: {
        fontSize: 13,
        fontWeight: '500',
    },

    // CTA
    ctaContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 36,
    },
    ctaButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ctaText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },

    // WebView
    webviewContainer: {
        flex: 1,
    },
    webviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    webviewTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    webviewLoading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // States
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    verifyingText: {
        fontSize: 16,
        fontWeight: '500',
    },

    // Modal Styles
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 24,
    },
    modalDragArea: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalHandle: {
        width: 38,
        height: 4,
        borderRadius: 2,
    },
    modalContent: {
        paddingHorizontal: 24,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
    },
    amountPillBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    amountPillText: {
        fontSize: 14,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 20,
    },
    paymentOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    paystackIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    paystackIconText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '900',
    },
    paymentOptionDetails: {
        flex: 1,
    },
    paymentOptionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    paymentOptionSubtitle: {
        fontSize: 13,
    },
    securityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        marginBottom: 36,
    },
    securityIconWrap: {
        marginRight: 12,
    },
    securityDetails: {
        flex: 1,
    },
    securityTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    securitySubtitle: {
        fontSize: 11,
        marginTop: 1,
    },
    modalPayButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    modalPayButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default TopUpCreditsScreen;
