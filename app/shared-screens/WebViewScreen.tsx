import BackButton from '../../components/BackButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const WebViewScreen = () => {
    const { url, title } = useLocalSearchParams<{ 
        url: string; 
        title: string;
    }>();
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);

    return (
        <ScreenWrapper 
            disableKeyboardAvoidingView
            style={{ backgroundColor: colors.background }}
        >
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>{title || 'Document'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <WebView
                    source={{ uri: url }}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    style={styles.webview}
                />
                {loading && (
                    <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
                        <ActivityIndicator size="large" color={colors.primary} />
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
    },
});

export default WebViewScreen;
