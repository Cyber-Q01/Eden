import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useTheme } from '../../context/ThemeContext';

const PersonalInfoScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.primary }]}>Personal Information</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Tell us a bit about yourself before verification</Text>
                </View>

                <View style={styles.formContainer}>
                    <ThemedTextInput
                        placeholder="Enter your full name"
                    />

                    <ThemedTextInput
                        placeholder="0805008786"
                        keyboardType="phone-pad"
                    />

                    <ThemedTextInput
                        placeholder="akinola@gmail.com"
                        keyboardType="email-address"
                    />

                    <ThemedTextInput
                        placeholder="Select your birth date"
                        editable={false}
                        rightIcon={<Ionicons name="caret-down" size={20} color={colors.textSecondary} />}
                    />

                    <CustomButton
                        title="Next"
                        onPress={() => router.push('/profilesetup/id-verification')}
                        style={styles.nextButton}
                    />
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
        gap: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0047AB',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    formContainer: {
        gap: 16,
    },
    inputWrapper: {
        height: 56,
        borderWidth: 1,
        borderColor: '#0047AB',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    dropdownIcon: {
        marginLeft: 8,
    },
    nextButton: {
        marginTop: 24,
    },
});

export default PersonalInfoScreen;
