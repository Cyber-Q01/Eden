import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

// Full-app takeover shown while app_settings.maintenance_mode = 'on'.
// Intentionally has NO dismiss button — it disappears automatically the
// moment the database flag is flipped back to 'off' (the root layout polls).
const MaintenanceModeView = () => {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? '#020617' : '#F8FAFC',
                    paddingTop: insets.top + 40,
                    paddingBottom: insets.bottom + 20,
                },
            ]}
        >
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="construct" size={46} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Under Maintenance</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Eden is being updated so it runs even better for you. Your data is safe and nothing is lost. Back online shortly.
            </Text>

            <View style={styles.checkRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.checkText, { color: colors.textSecondary }]}>
                    Checking automatically — no need to reload
                </Text>
            </View>

            <Text style={[styles.foot, { color: colors.textSecondary + '99' }]}>
                {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14.5,
        lineHeight: 22,
        textAlign: 'center',
        marginTop: 12,
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 36,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: 'rgba(100, 116, 139, 0.08)',
    },
    checkText: {
        fontSize: 12.5,
        fontWeight: '600',
    },
    foot: {
        fontSize: 12,
        marginTop: 28,
    },
});

export default MaintenanceModeView;
