import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';

const ActivateScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();

    const benefits = [
        {
            icon: 'eye-outline',
            title: "View Landlord's Contact",
            description: "Access verified phone numbers and addresses"
        },
        {
            icon: 'calendar-outline',
            title: "Book inspections instantly",
            description: "Schedule viewing appointments with ease"
        },
        {
            icon: 'lock-open-outline',
            title: "Unlock full property details",
            description: "See exact address, house terms, and availability"
        },
        {
            icon: 'shield-checkmark-outline',
            title: "Secure rent payments",
            description: "Use Escrow or direct pay securely"
        },
        {
            icon: 'headset-outline',
            title: "Priority support",
            description: "Get help anytime during your house search"
        }
    ];

    return (
        <ScreenWrapper keyboardAware={false}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>ONE-TIME • ₦2,000</Text>
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>
                        Unlock Full Access
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Pay once, hunt freely. No monthly charges, no hidden fees.
                    </Text>
                </View>

                {/* Benefits */}
                <View style={styles.benefitsContainer}>
                    {benefits.map((benefit, index) => (
                        <View key={index} style={[styles.benefitItem, { backgroundColor: colors.card }]}>
                            <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '18' }]}>
                                <Ionicons name={benefit.icon as any} size={22} color={colors.primary} />
                            </View>
                            <View style={styles.benefitText}>
                                <Text style={[styles.benefitTitle, { color: colors.text }]}>{benefit.title}</Text>
                                <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>{benefit.description}</Text>
                            </View>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        </View>
                    ))}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <CustomButton
                        title="Activate for ₦2,000"
                        onPress={() => router.push('/subscription/payment-method')}
                        style={styles.activateButton}
                    />
                    <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
                        Renew only after you successfully rent a house
                    </Text>

                    {/* Maybe later — small and subtle */}
                    <TouchableOpacity
                        onPress={() => router.replace('/(tabs)')}
                        style={styles.skipButton}
                    >
                        <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                            Maybe later
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 48,
        flexGrow: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    badge: {
        backgroundColor: '#FFF3E0',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 5,
        marginBottom: 16,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E65100',
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    benefitsContainer: {
        gap: 12,
        marginBottom: 36,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        borderRadius: 16,
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    benefitText: {
        flex: 1,
    },
    benefitTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    benefitDescription: {
        fontSize: 13,
        lineHeight: 18,
    },
    footer: {
        alignItems: 'center',
        gap: 12,
    },
    activateButton: {
        width: '100%',
    },
    footerNote: {
        fontSize: 13,
        textAlign: 'center',
    },
    skipButton: {
        paddingVertical: 8,
        paddingHorizontal: 24,
    },
    skipText: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.55,
    },
});

export default ActivateScreen;
