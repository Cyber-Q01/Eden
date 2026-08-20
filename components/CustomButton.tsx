import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CustomButtonProps {
    title: string;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    disabled?: boolean;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const CustomButton: React.FC<CustomButtonProps> = ({ title, onPress, style, textStyle, disabled, loading, leftIcon, rightIcon }) => {
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
                    <React.Fragment>
                        {leftIcon}
                        <Text style={[styles.text, textStyle, !!leftIcon && { marginLeft: 8 }]}>{title}</Text>
                        {rightIcon}
                    </React.Fragment>
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
