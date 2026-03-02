import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';

const ActivateScreen = () => {
    const router = useRouter();

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
            icon: 'lock-closed-outline',
            title: "Unlock full property details",
            description: "See exact same street address, house terms, and and Availability"
        },
        {
            icon: 'shield-outline',
            title: "Starts secure rent payments",
            description: "Use Escrow or direct pay surely"
        },
        {
            icon: 'call-outline',
            title: "Enjoy fast support assistance",
            description: "Get help anytoime during your house search"
        }
    ];

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Activate Your Eden Account</Text>
                    <Text style={styles.subtitle}>Pay a one-time fee of N2,000 to unlock full{'\n'}house-hunting access</Text>
                </View>

                <View style={styles.benefitsContainer}>
                    {benefits.map((benefit, index) => (
                        <View key={index} style={styles.benefitItem}>
                            <View style={styles.iconWrapper}>
                                <Ionicons name={benefit.icon as any} size={24} color="#0047AB" />
                            </View>
                            <View style={styles.benefitText}>
                                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                                <Text style={styles.benefitDescription}>{benefit.description}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.footer}>
                    <CustomButton
                        title="Activate for N2,000"
                        onPress={() => router.push('/subscription/payment-method')}
                        style={styles.activateButton}
                    />
                    <Text style={styles.footerNote}>
                        No hidden charges, Renew only after renting a house
                    </Text>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        gap: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#333',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    benefitsContainer: {
        gap: 24,
        marginBottom: 40,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E6EEFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    benefitText: {
        flex: 1,
    },
    benefitTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    benefitDescription: {
        fontSize: 14,
        color: '#888',
        lineHeight: 20,
    },
    footer: {
        gap: 16,
        alignItems: 'center',
    },
    activateButton: {
        width: '100%',
    },
    footerNote: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default ActivateScreen;
