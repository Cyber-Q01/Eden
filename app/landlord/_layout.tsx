import { Tabs } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BiodataGuard from '@/components/BiodataGuard';
import RoleGuard from '@/components/RoleGuard';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function LandlordLayout() {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const { role } = useAuth();

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
                            borderTopColor: isDark ? 'transparent' : colors.border,
                            borderTopWidth: isDark ? 0 : 1,
                            elevation: isDark ? 0 : 10,
                            shadowOpacity: isDark ? 0 : 0.05,
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
                    name="requests"
                    options={{
                        title: 'Requests',
                        tabBarIcon: ({ color }) => (
                            <View style={styles.iconContainer}>
                                <Ionicons name="document-text-outline" size={22} color={color} />
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
