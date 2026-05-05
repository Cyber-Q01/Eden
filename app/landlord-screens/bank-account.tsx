import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useBankDetails } from '../../hooks/useBankDetails';

const BankAccountScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { bankDetails, loading } = useBankDetails();

    return (
        <ScreenWrapper style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <BackButton />
                <Text style={styles.headerTitle}>Bank Account</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                ) : bankDetails ? (
                    <View style={styles.card}>
                        <Text style={[styles.title, { color: colors.text }]}>{bankDetails.bank_name}</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{bankDetails.account_number}</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{bankDetails.account_name}</Text>
                        <CustomButton
                            title="Update Bank Account"
                            onPress={() => router.push('/landlord-screens/add-bank')}
                            style={styles.button}
                        />
                    </View>
                ) : (
                    <View style={styles.card}>
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../../assets/images/bank.png')}
                                style={styles.bankIcon}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>No Bank Account Added Yet</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Add a bank account to receive payments</Text>
                        <CustomButton
                            title="Add Bank Account"
                            onPress={() => router.push('/landlord-screens/add-bank')}
                            style={styles.button}
                        />
                    </View>
                )}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F8FAF9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    iconContainer: {
        width: 80,
        height: 80,
        backgroundColor: '#F2F2F7',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    bankIcon: {
        width: 48,
        height: 48,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 32,
        textAlign: 'center',
    },
    button: {
        width: '100%',
    },
});

export default BankAccountScreen;
