import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

const UserTypeScreen = () => {
    const router = useRouter();
    const { setUserType } = useUser();
    const { colors } = useTheme();

    const handleSelectType = (type: 'tenant' | 'landlord') => {
        setUserType(type);
        router.push('/auth/signup');
    };

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.content}>
                <View style={styles.topSection}>
                    <Image
                        source={require('../../assets/images/EdenIcon.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                    <Text style={[styles.title, { color: colors.primary }]}>User Type</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Choose how you will use Eden Home
                    </Text>
                </View>

                <View style={styles.optionsContainer}>
                    <TouchableOpacity
                        style={[styles.optionCard, { backgroundColor: colors.card }]}
                        onPress={() => handleSelectType('tenant')}
                    >
                        <Image
                            source={require('../../assets/images/userType/tenant.png')}
                            style={styles.optionImage}
                            resizeMode="contain"
                        />
                        <Text style={[styles.optionTitle, { color: colors.primary }]}>I'm a Tenant</Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                            Find homes, connect directly with landlords, make secure payments.
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.optionCard, { backgroundColor: colors.card }]}
                        onPress={() => handleSelectType('landlord')}
                    >
                        <Image
                            source={require('../../assets/images/userType/landlord.png')}
                            style={styles.optionImage}
                            resizeMode="contain"
                        />
                        <Text style={[styles.optionTitle, { color: colors.primary }]}>I'm a Landlord</Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                            List properties, manage tenants, and collect rent securely.
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
    },
    content: {
        flex: 1,
        paddingVertical: 40,
    },
    topSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    icon: {
        width: 80,
        height: 80,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0047AB',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    optionsContainer: {
        gap: 20,
    },
    optionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    optionImage: {
        width: 60,
        height: 60,
        marginBottom: 16,
    },
    optionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0047AB',
        marginBottom: 12,
    },
    optionDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default UserTypeScreen;
