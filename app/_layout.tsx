import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from 'expo-notifications';
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "../components/Toast";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { NetworkProvider } from "../context/NetworkContext";
import { ThemeProvider } from "../context/ThemeContext";
import { UserProvider } from "../context/UserContext";
import { useNotifications } from "../hooks/useNotifications";
import { useAppSettings, compareVersions } from "../hooks/useAppSettings";
import Constants from "expo-constants";
import MaintenanceModeView from "../components/MaintenanceModeView";
import UpdateBanner from "../components/UpdateBanner";

// Handle notifications when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

if (typeof window === 'undefined') {
  global.window = {} as any;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

function InitialLayout() {
  const { session, loading, role, completedBiodata } = useAuth();

  // Initialize notifications
  useNotifications();

  // ── Global app settings: maintenance-mode takeover + store update banner ──
  const { settings } = useAppSettings();
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const currentVersion = Constants.expoConfig?.version || "0.0.0";
  const updateAvailable = settings.checked && compareVersions(settings.latestVersion, currentVersion) > 0;

  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (loading) return;
    if (!rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    const firstSegment = segments[0] as string | undefined;
    const segmentCount = segments.length as number;
    const isIndex = segmentCount === 0 || firstSegment === 'index' || firstSegment === undefined || firstSegment === '(index)';

    if (session) {
      const segList = segments as string[];
      const isAcceptInvite = segList[0] === 'auth' && segList[1] === 'accept-invite';
      const isNewPassword = segList[0] === 'auth' && segList[1] === 'new-password';
      const isForgotPasswordVerification = segList[0] === 'auth' && segList[1] === 'forgot-password-verification';

      if ((inAuthGroup || inOnboarding) && !isAcceptInvite && !isNewPassword && !isForgotPasswordVerification) {
        // Enforce NIN verification gate: If unverified or incomplete, route to registration biodata setup
        if (!completedBiodata) {
          router.replace('/profilesetup/biodata');
        } else if (role === 'LANDLORD' || role === 'AGENT') {
          router.replace('/landlord');
        } else {
          router.replace('/(tabs)');
        }
      }
    } else {
      if (!inAuthGroup && !inOnboarding && !isIndex) {
        router.replace('/auth/login');
      }
    }
  }, [session, loading, role, completedBiodata, segments, rootNavigationState?.key]);

  useEffect(() => {
    const handleBackPress = () => {
      if (session) {
        // Navigate within the app first — only exit when there is nothing left to go back to
        if (router.canGoBack()) {
          router.back();
          return true;
        }

        // True home screens: pressing back exits the app (standard Android behavior)
        const currentSegment = segments[0];
        if (currentSegment === '(tabs)' || currentSegment === 'landlord' || currentSegment === 'profilesetup') {
          BackHandler.exitApp();
          return true;
        }
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      subscription.remove();
    };
  }, [session, segments, router]);

  // Maintenance mode: full-app takeover, no dismiss — clears itself the moment
  // the DB flag flips back to 'off' (settings keep polling in the background)
  if (settings.checked && settings.maintenance) {
    return <MaintenanceModeView />;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade'
        }}
      >
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="landlord" options={{ gestureEnabled: false }} />
        <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="shared-screens/ApplicationScreen" options={{ gestureEnabled: false, headerShown: false }} />

      </Stack>

      {/* Store update banner — newest build in DB is ahead of this build */}
      {updateAvailable && !updateDismissed && (
        <UpdateBanner settings={settings} onDismiss={() => setUpdateDismissed(true)} />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export { ErrorBoundary } from '../components/ErrorBoundary';
