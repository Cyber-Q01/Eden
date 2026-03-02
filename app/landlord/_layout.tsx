import { Tabs } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LandlordLayout() {
    const insets = useSafeAreaInsets();

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
                    }
                ],
                tabBarActiveTintColor: '#0047AB',
                tabBarInactiveTintColor: '#999',
                tabBarLabelStyle: styles.tabBarLabel,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => (
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
                name="listings"
                options={{
                    title: 'Listings',
                    tabBarIcon: ({ color }) => (
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../../assets/icon/tab/listing.png')}
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
                    tabBarIcon: ({ color }) => (
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
                    tabBarIcon: ({ color }) => (
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
