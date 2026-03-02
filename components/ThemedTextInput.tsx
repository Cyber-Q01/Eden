import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ThemedTextInputProps extends TextInputProps {
    containerStyle?: ViewStyle;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const ThemedTextInput = React.forwardRef<TextInput, ThemedTextInputProps>(
    ({ style, containerStyle, leftIcon, rightIcon, placeholderTextColor, ...props }, ref) => {
        const { colors } = useTheme();

        return (
            <View style={[
                styles.container,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                },
                containerStyle
            ]}>
                {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
                <TextInput
                    ref={ref}
                    style={[
                        styles.input,
                        { color: colors.text },
                        style
                    ]}
                    placeholderTextColor={placeholderTextColor || colors.textSecondary}
                    {...props}
                />
                {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
            </View>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ThemedTextInput;
