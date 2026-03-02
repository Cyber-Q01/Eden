import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';

const ChoosePaymentMethod = () => {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Choose Payment Method</Text>
                </View>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>How would you like to pay for this rent?</Text>

                <View style={styles.optionsContainer}>
                    {/* Escrow Option */}
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.background }]}>
                            <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.optionTitle, { color: colors.text }]}>Escrow Payment</Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                            Your payment will be held securely by eden until you confirm the house is available
                        </Text>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/payment/summary')}
                        >
                            <Text style={styles.primaryButtonText}>Continue with Escrow</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Direct Option */}
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.background }]}>
                            <Ionicons name="business-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.optionTitle, { color: colors.text }]}>Direct Payment</Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                            Pay directly to the landlord's bank account. You'll upload proof of payment afterward
                        </Text>
                        <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.primary }]}>
                            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Continue with Payment</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
    headerSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
    },
    optionsContainer: {
        gap: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    optionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
    },
    optionDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    primaryButton: {
        backgroundColor: '#2563EB',
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2563EB',
    },
    secondaryButtonText: {
        color: '#2563EB',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ChoosePaymentMethod;
