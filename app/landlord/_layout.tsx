import { Tabs } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BiodataGuard from '@/components/BiodataGuard';
import RoleGuard from '@/components/RoleGuard';
import { useTheme } from '../../context/ThemeContext';

export default function LandlordLayout() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    return (
        <RoleGuard allowedRole="LANDLORD">
            <BiodataGuard>
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
        </BiodataGuard>
        </RoleGuard>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        borderTopWidth: 1,
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
