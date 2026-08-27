import { Tabs } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import BiodataGuard from '../../components/BiodataGuard';
import RoleGuard from '../../components/RoleGuard';
import { useTabBadges } from '../../hooks/useTabBadges';

const TabBadge = ({ count }: { count: number }) => {
    if (!count) return null;
    return (
        <View style={styles.tabBadge} pointerEvents="none">
            <Text style={styles.tabBadgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
    );
};

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const { pendingApplications, unreleasedEscrow } = useTabBadges();

    return (
        <RoleGuard allowedRole="TENANT">
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
                    name="applications"
                    options={{
                        title: 'Applications',
                        tabBarIcon: ({ color, focused }) => (
                            <View style={styles.iconContainer}>
                                <Ionicons
                                    name={focused ? 'document-text' : 'document-text-outline'}
                                    size={24}
                                    color={color}
                                />
                                <TabBadge count={pendingApplications} />
                            </View>
                        ),
                    }}
                />
                <Tabs.Screen
                    name="escrow"
                    options={{
                        title: 'Escrow',
                        tabBarIcon: ({ color, focused }) => (
                            <View style={styles.iconContainer}>
                                <Ionicons
                                    name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
                                    size={24}
                                    color={color}
                                />
                                <TabBadge count={unreleasedEscrow} />
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
        </BiodataGuard>
        </RoleGuard>
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
    tabBadge: {
        position: 'absolute',
        top: -6,
        right: -10,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        shadowColor: '#EF4444',
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 6,
    },
    tabBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        lineHeight: 13,
    },
});
