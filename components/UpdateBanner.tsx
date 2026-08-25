import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

const PLAY_STORE_PACKAGE = 'com.eden.mobile';
const PLAY_STORE_URL = `market://details?id=${PLAY_STORE_PACKAGE}`;
const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
const DISMISSED_VERSION_KEY = 'eden_dismissed_update_version';

/**
 * Compare semantic versions ("1.0.1" > "1.0.0")
 */
const isNewerVersion = (latest: string, current: string): boolean => {
    try {
        const lParts = latest.trim().split('.').map((n) => parseInt(n, 10) || 0);
        const cParts = current.trim().split('.').map((n) => parseInt(n, 10) || 0);

        for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
            const l = lParts[i] ?? 0;
            const c = cParts[i] ?? 0;
            if (l > c) return true;
            if (l < c) return false;
        }
    } catch (e) {
        console.warn('[UpdateBanner] Version compare error:', e);
    }
    return false;
};

export const UpdateBanner = () => {
    const { isDark } = useTheme();
    const [showBanner, setShowBanner] = useState(false);
    const [latestVersion, setLatestVersion] = useState<string>('');
    const [slideAnim] = useState(new Animated.Value(-100)); // Animated banner slide-down

    useEffect(() => {
        const checkForUpdate = async () => {
            try {
                const currentVersion = Application.nativeApplicationVersion || '1.0.0';

                // Fetch latest version from Supabase 'app_config' table
                let remoteLatestVersion: string | null = null;
                try {
                    const { data, error } = await supabase
                        .from('app_config')
                        .select('latest_version')
                        .limit(1)
                        .maybeSingle();

                    if (!error && data?.latest_version) {
                        remoteLatestVersion = data.latest_version;
                    }
                } catch (dbErr) {
                    console.warn('[UpdateBanner] app_config query notice:', dbErr);
                }

                if (!remoteLatestVersion) return;

                setLatestVersion(remoteLatestVersion);

                // Check if user already dismissed this specific update version
                const dismissedVersion = await AsyncStorage.getItem(DISMISSED_VERSION_KEY);
                if (dismissedVersion === remoteLatestVersion) return;

                // Compare installed version with latest version
                if (isNewerVersion(remoteLatestVersion, currentVersion)) {
                    setShowBanner(true);
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }).start();
                }
            } catch (err) {
                console.warn('[UpdateBanner] Update check failed:', err);
            }
        };

        checkForUpdate();
    }, []);

    const handleDismiss = async () => {
        Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
        }).start(async () => {
            setShowBanner(false);
            if (latestVersion) {
                await AsyncStorage.setItem(DISMISSED_VERSION_KEY, latestVersion);
            }
        });
    };

    const handleUpdate = async () => {
        try {
            const canOpen = await Linking.canOpenURL(PLAY_STORE_URL);
            if (canOpen) {
                await Linking.openURL(PLAY_STORE_URL);
            } else {
                await Linking.openURL(PLAY_STORE_WEB_URL);
            }
        } catch {
            await Linking.openURL(PLAY_STORE_WEB_URL);
        }
    };

    if (!showBanner) return null;

    return (
        <Animated.View
            style={[
                styles.banner,
                {
                    transform: [{ translateY: slideAnim }],
                    backgroundColor: isDark ? '#1E3A8A' : '#1D4ED8',
                },
            ]}
        >
            <View style={styles.iconCircle}>
                <Ionicons name="cloud-download-outline" size={18} color="#FFF" />
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>Update Available (v{latestVersion})</Text>
                <Text style={styles.subtitle}>A new version is live on Google Play Store.</Text>
            </View>
            <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} activeOpacity={0.8}>
                <Text style={styles.updateBtnText}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleDismiss}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <Ionicons name="close-circle" size={20} color="#93C5FD" />
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 48 : 32,
        left: 12,
        right: 12,
        zIndex: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    subtitle: {
        color: '#BFDBFE',
        fontSize: 11,
        marginTop: 1,
    },
    updateBtn: {
        backgroundColor: '#F97316',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },
    updateBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 2,
    },
});

export default UpdateBanner;
