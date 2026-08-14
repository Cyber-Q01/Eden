import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ViewStyle, ActivityIndicator, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SectionTitleProps {
    children: string;
    colors: any;
}

export const SectionTitle = ({ children, colors }: SectionTitleProps) => (
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{children}</Text>
);

interface FieldLabelProps {
    children: React.ReactNode;
    colors: any;
}

export const FieldLabel = ({ children, colors }: FieldLabelProps) => (
    <Text style={[styles.label, { color: colors.textSecondary }]}>{children}</Text>
);

interface DropdownButtonProps {
    value: string;
    placeholder: string;
    onPress: () => void;
    colors: any;
    style?: StyleProp<ViewStyle>;
}

export const DropdownButton = ({
    value,
    placeholder,
    onPress,
    colors,
    style,
}: DropdownButtonProps) => (
    <TouchableOpacity
        style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.card }, style]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[styles.dropdownText, { color: value ? colors.text : colors.textSecondary }]}>
            {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
);

interface CounterProps {
    label: string;
    icon: string;
    value: number;
    onChange: (v: number) => void;
    colors: any;
}

export const Counter = ({
    label,
    icon,
    value,
    onChange,
    colors,
}: CounterProps) => (
    <View style={[styles.counterRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.counterLeft}>
            <View style={[styles.counterIcon, { backgroundColor: colors.background }]}>
                <Ionicons name={icon as any} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.counterLabel, { color: colors.text }]}>{label}</Text>
        </View>
        <View style={styles.counterControls}>
            <TouchableOpacity
                style={[styles.counterBtn, { borderColor: colors.border }]}
                onPress={() => onChange(Math.max(0, value - 1))}
            >
                <Ionicons name="remove" size={16} color={value === 0 ? colors.border : colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.counterValue, { color: colors.text }]}>{value}</Text>
            <TouchableOpacity
                style={[styles.counterBtn, { borderColor: colors.border, backgroundColor: colors.primary }]}
                onPress={() => onChange(Math.min(20, value + 1))}
            >
                <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
        </View>
    </View>
);

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 24,
        marginTop: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 52,
    },
    dropdownText: {
        fontSize: 15,
    },
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    counterLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    counterIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    counterLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    counterControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    counterBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterValue: {
        width: 40,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '700',
    },
});
