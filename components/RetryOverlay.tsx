import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface RetryOverlayProps {
    message?: string;
    onRetry: () => void;
}

/**
 * Reusable retry overlay shown when a fetch fails or times out.
 * Prevents the app from showing an infinite loading spinner.
 */
const RetryOverlay: React.FC<RetryOverlayProps> = ({
    message = 'Something went wrong. Please try again.',
    onRetry,
}) => {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onRetry}>
                <Ionicons name="refresh-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        gap: 12,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 8,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default RetryOverlay;
