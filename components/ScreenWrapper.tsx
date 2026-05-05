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
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ children, style, keyboardAware = true, withScrollView = false }) => {
    const insets = useSafeAreaInsets();
    const segments = useSegments();
    const { colors, isDark } = useTheme();

    const isTabScreen = segments[0] === '(tabs)';

    const paddingTop = Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight;

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={[styles.container, { paddingTop }]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            >
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
    },
});

export default ScreenWrapper;

