import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import ScreenWrapper from '../components/ScreenWrapper';

const { width } = Dimensions.get('window');

const ONBOARDING_DATA = [
    {
        image: require('../assets/images/onboarding/step1.png'),
        title: 'Find Your Dream Home',
        description: 'Discover apartments, flats, and homes that fits your lifestyle, all in one place',
    },
    {
        image: require('../assets/images/onboarding/step2.png'),
        title: 'Connect With Landlords',
        description: 'No agents, No Stress. Chat and Schedule visits directly from the app',
    },
    {
        image: require('../assets/images/onboarding/step3.png'),
        title: 'Safe and Hassle Free rentals',
        description: 'All listings are verified and payments are securely protected',
    },
];

const OnboardingScreen = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const router = useRouter();

    const handleNext = () => {
        if (currentStep < ONBOARDING_DATA.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            router.replace('/welcome');
        }
    };

    const handleSkip = () => {
        router.replace('/welcome');
    };

    const stepData = ONBOARDING_DATA[currentStep];

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.imageContainer}>
                    <Image
                        source={stepData.image}
                        style={styles.illustration}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>{stepData.title}</Text>
                    <Text style={styles.description}>{stepData.description}</Text>
                </View>

                <View style={styles.footer}>
                    <View style={styles.pagination}>
                        {ONBOARDING_DATA.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    currentStep === index && styles.activeDot
                                ]}
                            />
                        ))}
                    </View>

                    <CustomButton
                        title={currentStep === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
                        onPress={handleNext}
                    />
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
    },
    header: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    skipButton: {
        padding: 8,
    },
    skipText: {
        color: '#1E56D0',
        fontSize: 16,
        fontWeight: '500',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingBottom: 40,
    },
    imageContainer: {
        flex: 0.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    illustration: {
        width: width * 0.8,
        height: width * 0.8,
    },
    textContainer: {
        flex: 0.3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0047AB',
        textAlign: 'center',
        marginBottom: 20,
    },
    description: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    footer: {
        gap: 30,
        alignItems: 'center',
    },
    pagination: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#D0ECF8',
    },
    activeDot: {
        backgroundColor: '#1E56D0',
        width: 10,
    },
    nextButton: {
        backgroundColor: '#1E56D0',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default OnboardingScreen;
