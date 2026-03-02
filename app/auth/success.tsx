import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';

const SuccessScreen = () => {
    const router = useRouter();

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.content}>
                <View style={styles.imageContainer}>
                    <Image
                        source={require('../../assets/images/AccountCreated.png')}
                        style={styles.illustration}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Your account{'\n'}was successfully created!</Text>
                </View>

                <View style={styles.footer}>
                    <CustomButton
                        title="Login"
                        onPress={() => router.push('/subscription/activate')}
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
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    imageContainer: {
        marginBottom: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustration: {
        width: 150,
        height: 150,
    },
    textContainer: {
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0047AB',
        textAlign: 'center',
        lineHeight: 36,
    },
    footer: {
        width: '100%',
    },
});

export default SuccessScreen;
