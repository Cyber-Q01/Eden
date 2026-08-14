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

const EscrowReleasedScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { amount, released_to, bank, release_time, reference } = useLocalSearchParams<{
        amount?: string;
        released_to?: string;
        bank?: string;
        release_time?: string;
        reference?: string;
    }>();

    const formattedAmount = amount ? `₦${Number(amount).toLocaleString()}` : '₦0';

    const handleRateLandlord = () => {
        Alert.alert(
            'Rate Your Landlord',
            'Landlord rating feature is coming soon!',
            [{ text: 'OK' }]
        );
    };

    const handleDownloadReceipt = () => {
        const receiptUrl = `https://eden-receipts.vercel.app/receipt?ref=${reference || ''}&amount=${amount || '0'}&released_to=${encodeURIComponent(released_to || '')}&bank=${encodeURIComponent(bank || '')}&date=${encodeURIComponent(release_time || '')}`;
        router.push({
            pathname: '/shared-screens/WebViewScreen',
            params: {
                url: receiptUrl,
                title: 'Transaction Receipt',
            }
        });
    };

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} withScrollView={false}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={{ width: 40 }} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Escrow Details</Text>
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
                    <Text style={[styles.title, { color: colors.text }]}>Escrow Released!</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>
                        Funds have been successfully authorized and released to the landlord.
                    </Text>
                </View>

                {/* Details Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Transfer Summary</Text>
                    
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Amount</Text>
                        <Text style={[styles.detailValue, { color: colors.text, fontWeight: '700' }]}>
                            {formattedAmount}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Released to</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {released_to || 'Landlord'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Bank Account</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {bank || 'Bank Transfer'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Release Time</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {release_time || 'Just now'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reference</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                            {reference || 'N/A'}
                        </Text>
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

                {/* What Happens Next Card */}
                <View style={[styles.nextCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                    <View style={styles.nextHeader}>
                        <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                        <Text style={[styles.nextTitle, { color: colors.primary }]}>What happens next?</Text>
                    </View>
                    <Text style={[styles.nextText, { color: colors.textSecondary }]}>
                        • The landlord has been notified of the escrow release via push notification and SMS.
                    </Text>
                    <Text style={[styles.nextText, { color: colors.textSecondary, marginTop: 6 }]}>
                        • The bank transfer process has initiated. Payouts typically reflect in the owner's account within 1-2 business days.
                    </Text>
                    <Text style={[styles.nextText, { color: colors.textSecondary, marginTop: 6 }]}>
                        • Please coordinate with your landlord to organize key exchange, move-in date, and initial inspection.
                    </Text>
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <CustomButton
                    title="Rate Your Landlord"
                    onPress={handleRateLandlord}
                    style={styles.primaryButton}
                />
                
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                        Go to Dashboard
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
    nextCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginBottom: 6,
    },
    nextHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    nextTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    nextText: {
        fontSize: 12,
        lineHeight: 17,
    },
    footer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    primaryButton: {
        marginBottom: 8,
    },
    secondaryButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default EscrowReleasedScreen;
