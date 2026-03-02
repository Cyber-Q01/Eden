import { Tabs } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        height: 70 + insets.bottom,
                        paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
                        marginBottom: Platform.OS === 'ios' ? 0 : 10,
                        backgroundColor: colors.tabBar,
                        borderTopColor: colors.border,
                    }
                ],
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.tabInactive,
                tabBarLabelStyle: styles.tabBarLabel,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../../assets/icon/tab/home.png')}
                                style={[styles.icon, { tintColor: color }]}
                                resizeMode="contain"
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: 'Explore',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../../assets/icon/tab/explore.png')}
                                style={[styles.icon, { tintColor: color }]}
                                resizeMode="contain"
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="saved"
                options={{
                    title: 'Saved',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../../assets/icon/tab/saved.png')}
                                style={[styles.icon, { tintColor: color }]}
                                resizeMode="contain"
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'Chat',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../../assets/icon/tab/chat.png')}
                                style={[styles.icon, { tintColor: color }]}
                                resizeMode="contain"
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../../assets/icon/tab/profile.png')}
                                style={[styles.icon, { tintColor: color }]}
                                resizeMode="contain"
                            />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 10,
        // Elevation for Android, Shadow for iOS
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    tabBarLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        width: 24,
        height: 24,
    },
});
