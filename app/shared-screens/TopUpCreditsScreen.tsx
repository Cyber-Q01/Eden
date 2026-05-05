import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
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
    const { colors } = useTheme();
    const { credits, loading, fetchCredits, initializeTopUp, verifyTopUp } = useCredits();

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [paystackUrl, setPaystackUrl] = useState<string | null>(null);
    const [currentReference, setCurrentReference] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [processing, setProcessing] = useState(false);

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
                setPaystackUrl(data.authorization_url);
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleWebViewNav = async (navState: any) => {
        const url: string = navState.url ?? '';

        if (
            (url.includes('edenhome://credits/verify') ||
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

        if (url.includes('edenhome://credits/cancelled')) {
            setPaystackUrl(null);
            setCurrentReference(null);
        }
    };

    // ── Paystack WebView ──────────────────────────────────────────────────────
    if (paystackUrl) {
        return (
            <ScreenWrapper>
                <View style={styles.webviewContainer}>
                    <View style={[styles.webviewHeader, { borderBottomColor: colors.border }]}>
                        <BackButton />
                        <Text style={[styles.webviewTitle, { color: colors.text }]}>Secure Payment</Text>
                        <View style={{ width: 22 }} />
                    </View>
                    <WebView
                        source={{ uri: paystackUrl }}
                        onNavigationStateChange={handleWebViewNav}
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
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Top Up Credits</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <View style={styles.balanceCardInner}>
                        <Text style={styles.balanceLabel}>Current Balance</Text>
                        <Text style={styles.balanceAmount}>
                            N{(credits * CREDIT_PRICE).toLocaleString()}.00
                        </Text>
                        <Text style={styles.balanceUnlocks}>
                            {credits} unlock{credits !== 1 ? 's' : ''} remaining
                        </Text>
                    </View>
                    <View style={styles.balanceIconWrap}>
                        <Ionicons name="wallet-outline" size={40} color="rgba(255,255,255,0.3)" />
                    </View>
                </View>

                {/* Select Recharge */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Select Recharge Amount
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
                                    {bundle.unlocks} unlocks
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Summary Card */}
                <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                            Subtotal ({selected.unlocks} unlocks)
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
                        Each unlock costs N{CREDIT_PRICE}
                    </Text>
                </View>
            </ScrollView>

            {/* CTA Button */}
            <View style={[styles.ctaContainer, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                    style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                    onPress={handlePay}
                    disabled={processing}
                    activeOpacity={0.85}
                >
                    {processing ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.ctaText}>
                            Proceed to pay N{selected.amount.toLocaleString()}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
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
});

export default TopUpCreditsScreen;
