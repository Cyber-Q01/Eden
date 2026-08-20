import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BackButton from '../../components/BackButton';
import ScreenWrapper from '../../components/ScreenWrapper';

const EscrowPaymentSummary = () => {
    const router = useRouter();

    return (
        <ScreenWrapper withScrollView={true}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <BackButton />
                    <Text style={styles.headerTitle}>Escrow Payment Summary</Text>
                </View>

                {/* Amount Box */}
                <View style={styles.amountBox}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Rent Amount</Text>
                        <Text style={styles.value}>₦450,000.00</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Platform Service Charge (5%)</Text>
                        <Text style={styles.value}>₦22,500.00</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Escrow Protection Fee</Text>
                        <Text style={styles.value}>₦1,000.00</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Text style={styles.totalLabel}>Total Payable</Text>
                        <Text style={styles.totalValue}>₦473,500.00</Text>
                    </View>
                </View>

                {/* Property Brief */}
                <View style={styles.propertySection}>
                    <View style={styles.propertyPlaceholder} />
                    <View>
                        <Text style={styles.propertyName}>2-Bedroom Apartment</Text>
                        <Text style={styles.propertyLocation}>Lekki Phase 2</Text>
                    </View>
                </View>

                {/* Security Info */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        Your payment is secure. Eden will release the money to the landlord only when you confirm the apartment is available
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => router.push('/payment/receipt')}
                >
                    <Text style={styles.payButtonText}>Proceed to Payment</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    backButton: {
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        flex: 1,
        textAlign: 'center',
        marginRight: 34,
    },
    amountBox: {
        borderWidth: 1,
        borderColor: '#2563EB',
        borderRadius: 16,
        padding: 24,
        marginBottom: 40,
        backgroundColor: '#F8F9FF',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    label: {
        fontSize: 16,
        color: '#666',
    },
    value: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E7FF',
        marginVertical: 12,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2563EB',
    },
    totalValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0047AB',
    },
    propertySection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 40,
        justifyContent: 'center',
    },
    propertyPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: '#D1D5DB',
    },
    propertyName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    propertyLocation: {
        fontSize: 14,
        color: '#999',
    },
    infoCard: {
        backgroundColor: '#F9FAFB',
        padding: 20,
        borderRadius: 16,
        marginBottom: 40,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    payButton: {
        backgroundColor: '#2563EB',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 'auto',
        marginBottom: 20,
    },
    payButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
});

export default EscrowPaymentSummary;
