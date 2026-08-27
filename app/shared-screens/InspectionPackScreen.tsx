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
import { useInspectionPasses, INSPECTION_PACK_SIZE, INSPECTION_PRICE, INSPECTION_PACK_TOTAL } from '../../hooks/useInspectionPasses';

const { width } = Dimensions.get('window');

const SUBTOTAL = INSPECTION_PACK_SIZE * INSPECTION_PRICE; // 1,998
const VAT = Math.round((INSPECTION_PACK_TOTAL - SUBTOTAL) * 100) / 100; // 149.85

const InspectionPackScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { remaining, used, total, initializePack, verifyPack } = useInspectionPasses();

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

    const handlePay = async () => {
        setProcessing(true);
        try {
            const data = await initializePack();
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

    const finishVerify = async (reference: string) => {
        setPaystackUrl(null);
        setVerifying(true);
        const success = await verifyPack(reference);
        setVerifying(false);
        if (success) {
            setCurrentReference(null);
            router.back();
        }
    };

    const handleWebviewBack = async () => {
        if (currentReference) {
            await finishVerify(currentReference);
        } else {
            setPaystackUrl(null);
        }
    };

    const handleWebViewNav = async (navState: any) => {
        const url: string = navState.url ?? '';

        if (
            (url.includes('Eden://pack/verify') ||
                url.includes('edenhome://pack/verify') ||
                url.includes('paystack-callback') ||
                url.includes('paystack.co/close') ||
                url.includes('standard.paystack.co/close')) &&
            currentReference
        ) {
            await finishVerify(currentReference);
        }

        if (url.includes('Eden://pack/cancelled') || url.includes('edenhome://pack/cancelled')) {
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
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Inspection Bookings</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <View style={styles.balanceCardInner}>
                        <Text style={styles.balanceLabel}>Inspections Remaining</Text>
                        <Text style={styles.balanceAmount}>{remaining}</Text>
                        <Text style={styles.balanceUnlocks}>
                            {total > 0
                                ? `${used} of ${total} properties booked`
                                : 'No inspections yet — buy 3 to start'}
                        </Text>
                    </View>
                    <View style={styles.balanceIconWrap}>
                        <Ionicons name="eye-outline" size={40} color="rgba(255,255,255,0.3)" />
                    </View>
                </View>

                {/* What you get */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    What You Get
                </Text>

                <View style={[styles.packCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.packIconWrap}>
                        <Ionicons name="key-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.packTitle, { color: colors.text }]}>
                            {INSPECTION_PACK_SIZE} Property Inspections
                        </Text>
                        <Text style={[styles.packSubtitle, { color: colors.textSecondary }]}>
                            View any {INSPECTION_PACK_SIZE} available properties — pick the date, time & WhatsApp number when you book
                        </Text>
                    </View>
                </View>

                {/* Summary Card */}
                <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                            Subtotal ({INSPECTION_PACK_SIZE} inspections × N{INSPECTION_PRICE.toLocaleString()})
                        </Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                            N{SUBTOTAL.toLocaleString()}
                        </Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                            VAT (7.5%)
                        </Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                            N{VAT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                            Total Payable
                        </Text>
                        <Text style={[styles.summaryValue, { color: colors.primary }]}>
                            N{INSPECTION_PACK_TOTAL.toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Info Note */}
                <View style={styles.infoRow}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Each inspection costs N{INSPECTION_PRICE.toLocaleString()} — unused bookings stay in your account until you use them
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
                        Book {INSPECTION_PACK_SIZE} Inspections — Pay N{INSPECTION_PACK_TOTAL.toLocaleString()}
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
                                    N{INSPECTION_PACK_TOTAL.toLocaleString()}
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
                                <Text style={[styles.securitySubtitle, { color: '#059669' }]}>
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
                                    Pay N{INSPECTION_PACK_TOTAL.toLocaleString()} with Paystack
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

    // Pack Card
    packCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
        gap: 12,
    },
    packIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    packTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    packSubtitle: {
        fontSize: 12,
        lineHeight: 16,
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
        flex: 1,
        marginRight: 12,
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '700',
    },

    // Info Note
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginBottom: 20,
    },
    infoText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
        lineHeight: 18,
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
        fontSize: 16,
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

export default InspectionPackScreen;
