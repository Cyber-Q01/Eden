import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppErrorType } from '../lib/errorHandler';

// ─── Toast config per error type ───────────────────────────────────────────────
const TOAST_CONFIG: Record<AppErrorType | 'success', { icon: string; bg: string; accent: string }> = {
    no_internet: { icon: 'cloud-offline-outline', bg: '#F5F5F5', accent: '#555555' },
    network:     { icon: 'wifi-outline',          bg: '#F5F5F5', accent: '#555555' },
    server:      { icon: 'alert-circle-outline',  bg: '#FFF8F0', accent: '#B85C00' },
    auth:        { icon: 'lock-closed-outline',   bg: '#F0F4FF', accent: '#0047AB' },
    error:       { icon: 'alert-circle-outline',  bg: '#FEE2E2', accent: '#DC2626' },
    validation:  { icon: 'warning-outline',       bg: '#FEF3C7', accent: '#D97706' },
    unknown:     { icon: 'warning-outline',       bg: '#FFF8F0', accent: '#B85C00' },
    success:     { icon: 'checkmark-circle-outline', bg: '#F0FAF0', accent: '#1B7A1B' },
};

// ─── Context ──────────────────────────────────────────────────────────────────
interface ToastContextType {
    showToast: (title: string, message: string, type?: AppErrorType | 'success') => void;
    showError: (error: { type?: AppErrorType; title: string; message: string }) => void;
    showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
    showToast: () => {},
    showError: () => {},
    showSuccess: () => {},
});

export const useToast = () => useContext(ToastContext);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(-200)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const [visible, setVisible] = useState(false);
    const [toastData, setToastData] = useState({ title: '', message: '', type: 'unknown' as AppErrorType | 'success' });
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((title: string, message: string, type: AppErrorType | 'success' = 'unknown') => {
        // Clear any pending hide
        if (hideTimer.current) clearTimeout(hideTimer.current);

        setToastData({ title, message, type });
        setVisible(true);

        // Reset position before animating in
        translateY.setValue(-150);
        opacity.setValue(0);

        // Slide in + fade in
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 80,
                friction: 12,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto-hide after 4 seconds
        hideTimer.current = setTimeout(() => {
            hideToast();
        }, 4000);
    }, [translateY, opacity]);

    const hideToast = useCallback(() => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -150,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => setVisible(false));
    }, [translateY, opacity]);

    const showError = useCallback((error: { type?: AppErrorType; title: string; message: string }) => {
        showToast(error.title, error.message, error.type || 'error');
    }, [showToast]);

    const showSuccess = useCallback((message: string) => {
        showToast('Success', message, 'success');
    }, [showToast]);

    const config = TOAST_CONFIG[toastData.type] || TOAST_CONFIG.unknown;

    return (
        <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
            <View style={styles.root}>
                {children}
                {visible && (
                    <Animated.View
                        pointerEvents="box-none"
                        style={[
                            styles.container,
                            {
                                top: insets.top + 10,
                                backgroundColor: config.bg,
                                borderLeftColor: config.accent,
                                transform: [{ translateY }],
                                opacity,
                            },
                        ]}
                    >
                        <View style={styles.iconCircle}>
                            <Ionicons name={config.icon as any} size={22} color={config.accent} />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={[styles.title, { color: config.accent }]}>{toastData.title}</Text>
                            <Text style={styles.message} numberOfLines={2}>{toastData.message}</Text>
                        </View>
                        <TouchableOpacity onPress={hideToast} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                            <Ionicons name="close" size={18} color="#999" />
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 999,
        zIndex: 999999,
        gap: 12,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    message: {
        fontSize: 13,
        color: '#555',
        lineHeight: 18,
    },
});
