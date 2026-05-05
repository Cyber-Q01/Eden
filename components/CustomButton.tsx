import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

import { ActivityIndicator } from 'react-native';

interface CustomButtonProps {
    title: string;
    onPress: () => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
    disabled?: boolean;
    loading?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({ title, onPress, style, textStyle, disabled, loading }) => {
    const { colors, isDark } = useTheme();

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.wrapper, style, disabled && { opacity: 0.7 }]} disabled={disabled || loading}>
            <LinearGradient
                colors={isDark ? ['#407BFF', '#003CB3'] : ['#003CB3', '#407BFF']}
                style={styles.gradient}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
            >
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={[styles.text, textStyle]}>{title}</Text>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        height: 56,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CustomButton;
