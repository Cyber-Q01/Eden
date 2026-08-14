import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleProp,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
    ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSegments } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import AIAssistantTrigger from './AIAssistantTrigger';

interface ScreenWrapperProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    /** Set to false on screens that have no text inputs (e.g. pure list screens) */
    keyboardAware?: boolean;
    /** Set to true on screens that contain a ScrollView to prevent TouchableWithoutFeedback from intercepting scroll gestures */
    withScrollView?: boolean;
    /** Disable KeyboardAvoidingView for screens like WebView where it might interfere with touches */
    disableKeyboardAvoidingView?: boolean;
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ 
    children, 
    style, 
    keyboardAware = true, 
    withScrollView = false,
    disableKeyboardAvoidingView = false
}) => {
    const insets = useSafeAreaInsets();
    const segments = useSegments();
    const { colors, isDark } = useTheme();

    const isTabScreen = segments[0] === '(tabs)';

    // Ensure the status bar height is respected on Android even if safe area insets are zero or tiny
    const paddingTop = Platform.OS === 'android'
        ? Math.max(insets.top, StatusBar.currentHeight || 24)
        : insets.top;
    const paddingBottom = insets.bottom;

    return (
        <View style={styles.container}>
            <StatusBar 
                barStyle={isDark ? 'light-content' : 'dark-content'} 
                backgroundColor="transparent"
                translucent={true}
                hidden={false}
            />
            <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={[styles.container, { paddingTop, paddingBottom }]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            >
                {disableKeyboardAvoidingView ? (
                    <View style={styles.container}>
                        {children}
                    </View>
                ) : (
                    <KeyboardAvoidingView
                        style={styles.container}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        enabled={keyboardAware}
                    >
                        {withScrollView ? (
                            <View style={[styles.content, style]}>
                                {children}
                            </View>
                        ) : (
                            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                                <View style={[styles.content, style]}>
                                    {children}
                                </View>
                            </TouchableWithoutFeedback>
                        )}
                    </KeyboardAvoidingView>
                )}
                {isTabScreen && <AIAssistantTrigger />}
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
    },
});

export default ScreenWrapper;

