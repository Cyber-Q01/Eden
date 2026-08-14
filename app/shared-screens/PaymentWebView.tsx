import BackButton from '@/components/BackButton';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useTheme } from '@/context/ThemeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const PaymentWebView = () => {
    const { url, type, property_id } = useLocalSearchParams<{
        url: string;
        type: string;
        property_id?: string;
    }>();
    const router = useRouter();
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);

    const handleNavigationStateChange = (navState: any) => {
        const { url: currentUrl } = navState;

        // Check for success callbacks
        if (currentUrl.includes('inspection/verify') || currentUrl.includes('credits/verify')) {
            // Give it a moment to process
            setTimeout(() => {
                if (type === 'inspection') {
                    router.replace({
                        pathname: '/shared-screens/BookingConfirmationScreen',
                        params: { property_id }
                    });
                } else {
                    router.back();
                }
            }, 2000);
        }
    };

    return (
        <ScreenWrapper
            disableKeyboardAvoidingView
            style={{ backgroundColor: colors.background }}
        >
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Secure Payment</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <WebView
                    source={{ uri: url }}
                    onNavigationStateChange={handleNavigationStateChange}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    setSupportMultipleWindows={false}
                    javaScriptCanOpenWindowsAutomatically={true}
                    mixedContentMode="compatibility"
                    style={styles.webview}
                />
                {loading && (
                    <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Secure Checkout...</Text>
                    </View>
                )}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    content: { flex: 1 },
    webview: { flex: 1 },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '500',
    },
});

export default PaymentWebView;
