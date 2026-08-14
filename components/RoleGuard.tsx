import { useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRole: 'TENANT' | 'LANDLORD' | 'ADMIN' | 'AGENT';
}

/**
 * RoleGuard prevents users from accessing routes that don't match their assigned role.
 * If a user tries to cross over, it redirects them to their correct dashboard.
 */
export default function RoleGuard({ children, allowedRole }: RoleGuardProps) {
    const { role, loading, session } = useAuth();
    const router = useRouter();
    const { colors } = useTheme();

    useEffect(() => {
        if (loading) return;

        // If not logged in, RootLayout already handles redirect to login
        if (!session) return;

        // Determine if user is authorized for this route
        let isAuthorized = role === allowedRole;
        
        // Special case: AGENTs are allowed on LANDLORD routes
        if (allowedRole === 'LANDLORD' && role === 'AGENT') {
            isAuthorized = true;
        }

        // If user has a role and it's not authorized
        if (role && !isAuthorized) {
            console.log(`[RoleGuard] User role (${role}) not allowed for ${allowedRole} route. Redirecting...`);
            
            // Redirect to appropriate dashboard
            if (role === 'LANDLORD' || role === 'AGENT') {
                router.replace('/landlord');
            } else if (role === 'TENANT') {
                router.replace('/(tabs)');
            }
        }
    }, [loading, role, session, allowedRole]);

    // Show loader while checking role or if mismatching (to prevent flash of wrong content)
    const isAuthorized = role === allowedRole || (allowedRole === 'LANDLORD' && role === 'AGENT');
    if (loading || (session && !isAuthorized)) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return <>{children}</>;
}
