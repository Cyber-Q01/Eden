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
    ScrollView,
    TouchableOpacity,
    Platform,
} from 'react-native';

const PaymentFailedScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { rental_id, error_message } = useLocalSearchParams<{
        rental_id?: string;
        error_message?: string;
    }>();

    const handleRetry = () => {
        if (!rental_id) {
            router.replace('/(tabs)');
            return;
        }
        // Go back to the payment screen to retry
        router.replace({
            pathname: '/shared-screens/RentPaymentScreen',
            params: { rental_id }
        });
    };

    const handleGoToDashboard = () => {
        router.replace('/(tabs)');
    };

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} withScrollView={false}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={{ width: 40 }} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Failed</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Error Icon */}
                <View style={styles.heroContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="close-circle" size={80} color="#EF4444" />
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>Payment Unsuccessful</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>
                        {error_message || 'Your payment could not be processed. This might be due to insufficient funds, card expiration, or bank network issues.'}
                    </Text>
                </View>

                {/* Info Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>What can you do?</Text>
                    
                    <View style={styles.stepRow}>
                        <Ionicons name="card-outline" size={20} color={colors.primary} />
                        <Text style={[styles.stepText, { color: colors.text }]}>
                            Verify your card details and try again.
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.stepRow}>
                        <Ionicons name="business-outline" size={20} color={colors.primary} />
                        <Text style={[styles.stepText, { color: colors.text }]}>
                            Contact your bank to ensure internet payments are enabled.
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.stepRow}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                        <Text style={[styles.stepText, { color: colors.text }]}>
                            Reach out to Eden support if you were debited.
                        </Text>
                    </View>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <CustomButton
                    title="Try Again"
                    onPress={handleRetry}
                    style={styles.primaryButton}
                />

                <TouchableOpacity
                    style={[styles.outlineButton, { borderColor: colors.border }]}
                    onPress={handleGoToDashboard}
                >
                    <Text style={[styles.outlineButtonText, { color: colors.text }]}>
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
    scrollContent: { padding: 16, paddingBottom: 10, justifyContent: 'center' },
    heroContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 24,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 18,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 4,
    },
    stepText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    divider: {
        height: 1,
        width: '100%',
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
    },
    outlineButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
});

export default PaymentFailedScreen;
