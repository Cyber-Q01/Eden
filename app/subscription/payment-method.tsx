import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';

const PaymentMethodScreen = () => {
    const router = useRouter();
    const [selectedMethod, setSelectedMethod] = useState('paystack');

    const methods = [
        {
            id: 'paystack',
            name: 'Paystack',
            description: 'Pay with card, transfer or ussd',
            icon: require('../../assets/icon/payment/paystack.png')
        },
        {
            id: 'flutterwave',
            name: 'Flutterwave',
            description: 'Use card, transfer, barter, or bank option',
            icon: require('../../assets/icon/payment/fluttterwaave.png')
        },
        {
            id: 'manual',
            name: 'Manual',
            description: 'Send money directly from your bank',
            icon: require('../../assets/icon/payment/manual.png')
        }
    ];

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Choose Payment Method</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.subtitle}>Select how you want to pay your N2,000 Activation fee</Text>

                <View style={styles.methodsContainer}>
                    {methods.map((method) => (
                        <TouchableOpacity
                            key={method.id}
                            style={[
                                styles.methodCard,
                                selectedMethod === method.id && styles.selectedCard
                            ]}
                            onPress={() => setSelectedMethod(method.id)}
                        >
                            <View style={styles.methodInfo}>
                                <Image
                                    source={method.icon}
                                    style={styles.methodIcon}
                                    resizeMode="contain"
                                />
                                <View>
                                    <Text style={styles.methodName}>{method.name}</Text>
                                    <Text style={styles.methodDescription}>{method.description}</Text>
                                </View>
                            </View>
                            <View style={[
                                styles.radioButton,
                                selectedMethod === method.id && styles.radioActiveBorder
                            ]}>
                                {selectedMethod === method.id && <View style={styles.radioActiveInner} />}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.footer}>
                    <CustomButton
                        title="Activate for N2,000"
                        onPress={() => router.push('/subscription/activated')}
                        style={styles.activateButton}
                    />
                    <Text style={styles.footerNote}>
                        Activation helps keep eden secure and fee from agent fraud
                    </Text>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
        marginTop: 10,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    content: {
        flex: 1,
        paddingTop: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    methodsContainer: {
        gap: 16,
        marginBottom: 40,
    },
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#FFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    selectedCard: {
        borderColor: '#E5E5E5',
    },
    methodInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    methodIcon: {
        width: 32,
        height: 32,
    },
    methodName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    methodDescription: {
        fontSize: 14,
        color: '#999',
    },
    radioButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D0D0D0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioActiveBorder: {
        borderColor: '#0047AB',
    },
    radioActiveInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#0047AB',
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
        marginTop: 10,
    },
});

export default PaymentMethodScreen;
