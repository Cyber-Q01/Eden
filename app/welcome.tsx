import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import ScreenWrapper from '../components/ScreenWrapper';

const { width } = Dimensions.get('window');

const WelcomeScreen = () => {
    const router = useRouter();

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.content}>
                <View style={styles.topSection}>
                    <Image
                        source={require('../assets/images/EdenIcon.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Welcome to Eden</Text>
                    <Text style={styles.subtitle}>
                        Find your next home directly from trusted Landlords. No agents .No stress
                    </Text>
                </View>

                <View style={styles.imageContainer}>
                    <Image
                        source={require('../assets/images/house.png')}
                        style={styles.illustration}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.buttonContainer}>
                    <CustomButton
                        title="Get Started"
                        onPress={() => router.push('/auth/user-type')}
                    />

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => router.push('/auth/login')}
                    >
                        <Text style={styles.loginText}>Log In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 40,
    },
    topSection: {
        alignItems: 'center',
        gap: 16,
    },
    icon: {
        width: 80,
        height: 80,
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0047AB', // Eden Blue
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    imageContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustration: {
        width: width * 0.8,
        height: width * 0.6,
    },
    buttonContainer: {
        gap: 16,
        width: '100%',
    },
    getStartedButton: {
        backgroundColor: '#1E56D0',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    getStartedText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    loginButton: {
        backgroundColor: '#FFFFFF',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    loginText: {
        color: '#1E56D0',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default WelcomeScreen;
