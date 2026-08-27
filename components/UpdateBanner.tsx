import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppSettings } from '../hooks/useAppSettings';

type Props = {
    settings: AppSettings;
    onDismiss: () => void;
};

// Slim top banner: shown while the installed build is older than
// app_settings.latest_version. Dismissing hides it for this app session only.
const UpdateBanner = ({ settings, onDismiss }: Props) => {
    const insets = useSafeAreaInsets();

    const storeUrl =
        Platform.OS === 'ios'
            ? settings.storeUrlIos || settings.storeUrlAndroid
            : settings.storeUrlAndroid || settings.storeUrlIos;

    const openStore = async () => {
        if (!storeUrl) return;
        try {
            await Linking.openURL(storeUrl);
        } catch (e) {
            console.warn('[UpdateBanner] open store notice:', e);
        }
    };

    return (
        <View
            pointerEvents="box-none"
            style={[styles.wrapper, { top: insets.top, zIndex: 9999 }]}
        >
            <View style={[styles.banner, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="cloud-download-outline" size={18} color="#451A03" />
                <Text style={styles.text} numberOfLines={2}>
                    {settings.releaseNotes
                        ? `Update available: ${settings.releaseNotes}`
                        : 'A new version of Eden is available'}
                </Text>
                <View style={{ flexShrink: 0 }}>
                    {storeUrl && (
                        <TouchableOpacity
                            style={[styles.updateBtn, { backgroundColor: '#451A03' }]}
                            onPress={openStore}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.updateBtnText}>Update</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={onDismiss}
                        style={styles.dismissBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={18} color="#451A03" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: 576,
        width: '100%',
        borderRadius: 14,
        paddingVertical: 10,
        paddingLeft: 12,
        paddingRight: 8,
        shadowColor: '#451A03',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    text: {
        flex: 1,
        fontSize: 12.5,
        fontWeight: '700',
        color: '#451A03',
        lineHeight: 16,
    },
    updateBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 10,
    },
    updateBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
    },
    dismissBtn: {
        padding: 6,
        marginLeft: 2,
    },
});

export default UpdateBanner;
