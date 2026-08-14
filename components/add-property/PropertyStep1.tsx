import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ThemedTextInput from '../ThemedTextInput';
import { DropdownButton, FieldLabel } from './Common';

export const PropertyStep1 = ({ form, setField, openModal }: any) => {
    const { colors, isDark } = useTheme();

    // Protection banner colors for Light and Dark modes
    const bannerBg = isDark ? '#172554' : '#EFF6FF';
    const bannerBorder = isDark ? '#1E3A8B' : '#DBEAFE';
    const lockIconBg = isDark ? '#1E3A8B' : '#DBEAFE';
    const lockIconColor = isDark ? '#60A5FA' : '#1D4ED8';
    const titleColor = isDark ? '#60A5FA' : '#1E3A8A';
    const textColor = isDark ? '#93C5FD' : '#1D4ED8';

    return (
        <View style={styles.stepContent}>
            {/* Location Section */}
            <View style={styles.sectionContainer}>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>Location</Text>

                <View style={styles.inputGroup}>
                    <FieldLabel colors={colors}>State</FieldLabel>
                    <DropdownButton
                        value={form.state}
                        placeholder="Select State"
                        onPress={() => openModal('state')}
                        colors={colors}
                        style={[styles.dropdownStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <FieldLabel colors={colors}>LGA/Area</FieldLabel>
                    <DropdownButton
                        value={form.lga}
                        placeholder={form.state ? 'Select LGA' : 'Select state first'}
                        onPress={() => form.state && openModal('lga')}
                        colors={colors}
                        style={[styles.dropdownStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <FieldLabel colors={colors}>Street Address</FieldLabel>
                    <ThemedTextInput
                        value={form.location}
                        onChangeText={(v: string) => setField('location', v)}
                        placeholder="e.g. 3, Abebi street, Lekki phase 1, Lagos"
                        containerStyle={[styles.textInputStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <FieldLabel colors={colors}>Nearest Landmark</FieldLabel>
                    <ThemedTextInput
                        value={form.landmark}
                        onChangeText={(v: string) => setField('landmark', v)}
                        placeholder="Beside ShopRite Lekki"
                        containerStyle={[styles.textInputStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
                    />
                </View>

                {/* Protection Banner */}
                <View style={[styles.protectionBanner, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
                    <View style={[styles.lockIconContainer, { backgroundColor: lockIconBg }]}>
                        <Ionicons name="lock-closed" size={20} color={lockIconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.protectionTitle, { color: titleColor }]}>Your address is protected</Text>
                        <Text style={[styles.protectionText, { color: textColor }]}>
                            Full address only revealed to applicants after confirmed inspection booking
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    stepContent: {
        paddingBottom: 40,
    },
    sectionContainer: {
        marginTop: 10,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    textInputStyle: {
        borderWidth: 1,
        borderRadius: 14,
        height: 52,
    },
    dropdownStyle: {
        borderWidth: 1,
        borderRadius: 14,
        height: 52,
    },
    protectionBanner: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    lockIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    protectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    protectionText: {
        fontSize: 13,
        lineHeight: 18,
    },
});
