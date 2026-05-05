import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';

const { height } = Dimensions.get('window');

// Scale down on small phones (< 700px tall)
const isSmallScreen = height < 700;

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
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Top Section */}
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

                {/* Cards */}
                <View style={styles.optionsContainer}>
                    <TouchableOpacity
                        style={[styles.optionCard, { backgroundColor: colors.card }]}
                        onPress={() => handleSelectType('tenant')}
                        activeOpacity={0.8}
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
                        activeOpacity={0.8}
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
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
    },
    scrollContent: {
        // Ensure it always fills the screen but can also grow
        flexGrow: 1,
        paddingTop: isSmallScreen ? 20 : 40,
        paddingBottom: 40,
        justifyContent: 'center',
    },
    topSection: {
        alignItems: 'center',
        marginBottom: isSmallScreen ? 24 : 40,
    },
    icon: {
        width: isSmallScreen ? 60 : 80,
        height: isSmallScreen ? 60 : 80,
        marginBottom: 16,
    },
    title: {
        fontSize: isSmallScreen ? 24 : 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
    },
    optionsContainer: {
        gap: isSmallScreen ? 14 : 20,
    },
    optionCard: {
        borderRadius: 20,
        padding: isSmallScreen ? 18 : 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    optionImage: {
        width: isSmallScreen ? 48 : 60,
        height: isSmallScreen ? 48 : 60,
        marginBottom: 12,
    },
    optionTitle: {
        fontSize: isSmallScreen ? 16 : 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    optionDescription: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default UserTypeScreen;


