import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { ToastProvider } from "../components/Toast";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { NetworkProvider } from "../context/NetworkContext";
import { ThemeProvider } from "../context/ThemeContext";
import { UserProvider } from "../context/UserContext";

function InitialLayout() {
  const { session, loading, role, completedBiodata } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (loading) return;
    if (!rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    const inProfileSetup = segments[0] === 'profilesetup';
    const isIndex = segments.length === 0 as any;

    if (session) {
      // We no longer force biodata checks here. BiodataGuard handles it.
      // We only redirect them away from public pages (auth, onboarding, index) to their respective dashboards.
      if (inAuthGroup || inOnboarding || isIndex) {
        if (role === 'LANDLORD') {
          router.replace('/landlord');
        } else {
          router.replace('/(tabs)');
        }
      }
    } else {
      // If not signed in and trying to access protected routes, send to login
      if (!inAuthGroup && !inOnboarding && !isIndex) {
        router.replace('/auth/login');
      }
    }
  }, [session, loading, role, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade'
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <NetworkProvider>
            <ToastProvider>
              <InitialLayout />
            </ToastProvider>
          </NetworkProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
