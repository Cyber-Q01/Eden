import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

// ─── FieldLabel ───────────────────────────────────────────────────────────────
export const FieldLabel = ({ children }: { children: string }) => {
    const { colors } = useTheme();
    return <Text style={[styles.label, { color: colors.textSecondary }]}>{children}</Text>;
};

// ─── SectionTitle ─────────────────────────────────────────────────────────────
export const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => {
    const { colors } = useTheme();
    return (
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
    );
};

// ─── DropdownButton ───────────────────────────────────────────────────────────
type DropdownButtonProps = {
    value: string;
    placeholder: string;
    onPress: () => void;
    icon?: string;
};

export const DropdownButton = ({ value, placeholder, onPress, icon }: DropdownButtonProps) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.dropdownLeft}>
                {icon && (
                    <View style={[styles.dropdownIcon, { backgroundColor: colors.background }]}>
                        <Ionicons name={icon as any} size={16} color={colors.primary} />
                    </View>
                )}
                <Text style={[styles.dropdownText, { color: value ? colors.text : colors.textSecondary }]}>
                    {value || placeholder}
                </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
    );
};

// ─── InfoCard ─────────────────────────────────────────────────────────────────
type InfoCardProps = {
    icon: string;
    text: string;
    variant?: 'primary' | 'neutral';
};

export const InfoCard = ({ icon, text, variant = 'neutral' }: InfoCardProps) => {
    const { colors } = useTheme();
    const isPrimary = variant === 'primary';
    return (
        <View style={[
            styles.infoCard,
            {
                backgroundColor: isPrimary ? colors.primary + '10' : colors.card,
                borderColor: isPrimary ? colors.primary + '30' : colors.border,
            },
        ]}>
            <Ionicons name={icon as any} size={16} color={isPrimary ? colors.primary : colors.textSecondary} />
            <Text style={[styles.infoCardText, { color: isPrimary ? colors.primary : colors.textSecondary }]}>
                {text}
            </Text>
        </View>
    );
};

// ─── PhotoUploadBox ───────────────────────────────────────────────────────────
type PhotoUploadBoxProps = {
    label: string;
    uri: string;
    onPress: () => void;
    icon?: string;
};

export const PhotoUploadBox = ({ label, uri, onPress, icon = 'camera-outline' }: PhotoUploadBoxProps) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            style={[
                styles.photoUploadBox,
                { borderColor: uri ? colors.primary : colors.border, backgroundColor: colors.card },
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {uri ? (
                <Image source={{ uri }} style={styles.uploadedImage} />
            ) : (
                <>
                    <View style={[styles.uploadIconWrap, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name={icon as any} size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.uploadLabel, { color: colors.textSecondary }]}>{label}</Text>
                    <Text style={[styles.uploadHint, { color: colors.primary }]}>Tap to upload</Text>
                </>
            )}
            {uri && (
                <View style={[styles.uploadedBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
            )}
        </TouchableOpacity>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    label: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
    sectionHeader: { marginBottom: 24, marginTop: 8 },
    sectionTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    sectionSubtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 52,
    },
    dropdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    dropdownIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    dropdownText: { fontSize: 15 },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 4,
    },
    infoCardText: { fontSize: 13, flex: 1, lineHeight: 18 },
    photoUploadBox: {
        flex: 1,
        height: 120,
        borderRadius: 14,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        position: 'relative',
        overflow: 'hidden',
    },
    uploadIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    uploadLabel: { fontSize: 13, fontWeight: '600' },
    uploadHint: { fontSize: 11, fontWeight: '500' },
    uploadedImage: { width: '100%', height: '100%', borderRadius: 12 },
    uploadedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
