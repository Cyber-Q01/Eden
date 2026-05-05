import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function BiodataGuard({ children }: { children: React.ReactNode }) {
    const { completedBiodata, loading } = useAuth();
    const router = useRouter();
    const { colors } = useTheme();

    useEffect(() => {
        // If auth finishes loading and user has not completed biodata, redirect to form
        if (!loading && !completedBiodata) {
            // Use setTimeout to ensure this runs in the next tick, avoiding layout conflict errors
            setTimeout(() => {
                router.replace('/profilesetup/biodata');
            }, 0);
        }
    }, [loading, completedBiodata]);

    // Prevent rendering the protected children if biodata is incomplete
    if (loading || !completedBiodata) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return <>{children}</>;
}
