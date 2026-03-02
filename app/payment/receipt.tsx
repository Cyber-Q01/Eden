import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';

const PaymentReceipt = () => {
    const router = useRouter();

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Active Tenant</Text>
                </View>

                <View style={styles.receiptCard}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="receipt-outline" size={32} color="#333" />
                    </View>
                    <Text style={styles.receiptTitle}>Payment Receipt</Text>
                    <Text style={styles.receiptId}>Receipt ID: 9FH4-2025-873</Text>

                    <View style={styles.divider} />

                    {/* Amount Info */}
                    <View style={styles.amountSection}>
                        <Text style={styles.label}>Amount Paid</Text>
                        <Text style={styles.amount}>N450,000</Text>
                        <Text style={styles.paymentType}>Escrow Payment</Text>
                        <Text style={styles.date}>Jan 18, 2025 . 2:30 PM</Text>
                    </View>

                    <View style={styles.successBadge}>
                        <Text style={styles.successText}>Successful</Text>
                    </View>

                    <View style={styles.detailsDivider} />

                    {/* Property Details */}
                    <Text style={styles.sectionHeader}>Property Details</Text>
                    <View style={styles.propertyRow}>
                        <View style={styles.propertyPlaceholder} />
                        <View>
                            <Text style={styles.propertyName}>3 Bedroom Apartment, Yaba</Text>
                            <Text style={styles.propertyLocation}>Yaba, Lagos</Text>
                            <Text style={styles.propertyDuration}>Rent Duration: 1 Year</Text>
                        </View>
                    </View>

                    {/* Landlord Details */}
                    <Text style={styles.sectionHeader}>Landlord Details</Text>
                    <View style={styles.landlordInfo}>
                        <Text style={styles.landlordName}>Abey Sulaimon</Text>
                        <Text style={styles.protectedText}>
                            Sensitive information like home address or ID is protected
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text style={styles.doneButtonText}>Done</Text>
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
        marginBottom: 10,
    },
    backButton: {
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333',
        flex: 1,
        textAlign: 'center',
        marginRight: 34,
    },
    receiptCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        marginTop: 10,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#333',
    },
    receiptTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    receiptId: {
        fontSize: 14,
        color: '#999',
        marginBottom: 20,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: '#F0F0F0',
        marginBottom: 20,
    },
    amountSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#999',
        marginBottom: 8,
    },
    amount: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0047AB',
        marginBottom: 8,
    },
    paymentType: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
        marginBottom: 4,
    },
    date: {
        fontSize: 14,
        color: '#999',
    },
    successBadge: {
        backgroundColor: '#E6F9F0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#D0F0E0',
    },
    successText: {
        color: '#00C853',
        fontWeight: '700',
    },
    detailsDivider: {
        width: '100%',
        height: 1,
        backgroundColor: '#F0F0F0',
        marginBottom: 20,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12,
        alignSelf: 'center',
    },
    propertyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    propertyPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#D1D5DB',
    },
    propertyName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    propertyLocation: {
        fontSize: 14,
        color: '#666',
    },
    propertyDuration: {
        fontSize: 12,
        color: '#999',
    },
    landlordInfo: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        width: '100%',
        alignItems: 'center',
    },
    landlordName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    protectedText: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
    },
    doneButton: {
        backgroundColor: '#2563EB',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
});

export default PaymentReceipt;
