import { useEffect } from 'react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { AppState, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ── Session-level push bookkeeping ───────────────────────────────────────────
// useNotifications() is instantiated by several screens at once, so these
// flags make sure permission prompts / foreground re-registration only fire
// once per app session regardless of how many hook instances exist.
let pushSettingsPromptShown = false;
let foregroundPushWatcherStarted = false;
let lastForegroundRegisterAt = 0;
const FOREGROUND_REGISTER_MIN_GAP_MS = 90 * 1000; // max 1 re-registration per 90s
let lastSavedToken: string | null = null;
// Always points at the most recent registerForPushNotificationsAsync so the
// single app-scoped AppState watcher registers the token for the current user.
let latestRegisterPush: (() => Promise<unknown>) | null = null;

export type NotificationType =
  | 'new_application'
  | 'application_accepted'
  | 'application_declined'
  | 'payment_received'
  | 'rental_confirmed'
  | 'agreement_signed'
  | 'system';

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any> | null;
  read: boolean;
  action_url: string | null;
  created_at: string;
};

export const useNotifications = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { showError } = useToast();
  const queryClient = useQueryClient();

  // ── Fetch notifications ──────────────────────────────────────────────────
  const { data: notifications = [], isLoading: loading, refetch: fetchNotifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const data = await callEdgeFunction<Notification[]>(
          'notifications',
          'POST',
          { action: 'list', limit: 50 }
        );
        return data ?? [];
      } catch (e) {
        const err = await handleError(e);
        console.error('Error fetching notifications:', err);
        return [];
      }
    },
    enabled: !!user
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Mark as read ────────────────────────────────────────────────────────
  const markAsRead = async (notificationId: string) => {
    try {
      await callEdgeFunction('notifications', 'POST', {
        action: 'mark_as_read',
        notification_id: notificationId
      });
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] = []) => 
        old.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (e) {
      const err = await handleError(e);
      showError(err);
    }
  };

  // ── Mark all as read ────────────────────────────────────────────────────
  const markAllAsRead = async () => {
    try {
      await callEdgeFunction('notifications', 'POST', { action: 'mark_all_as_read' });
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] = []) => 
        old.map(n => ({ ...n, read: true }))
      );
    } catch (e) {
      const err = await handleError(e);
      showError(err);
    }
  };

  // ── Delete notification ─────────────────────────────────────────────────
  const deleteNotification = async (notificationId: string) => {
    try {
      await callEdgeFunction('notifications', 'POST', {
        action: 'delete',
        notification_id: notificationId
      });
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] = []) => 
        old.filter(n => n.id !== notificationId)
      );
    } catch (e) {
      const err = await handleError(e);
      showError(err);
    }
  };

  // ── Real-time subscription to new notifications ──────────────────────────
  useEffect(() => {
    if (!user) return;

    const channelName = `notifications:${user.id}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.setQueryData(['notifications', user.id], (old: Notification[] = []) => {
            if (payload.eventType === 'INSERT') {
              return [payload.new as Notification, ...old];
            } else if (payload.eventType === 'UPDATE') {
              return old.map(n => n.id === payload.new.id ? payload.new as Notification : n);
            } else if (payload.eventType === 'DELETE') {
              return old.filter(n => n.id !== payload.old.id);
            }
            return old;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // ── Handle Tapping Notifications (Background/Closed State) ───────────────
  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.screen) {
        if (data.screen === 'InspectionDetails' || data.screen === 'LandlordInspections') {
          router.push('/shared-screens/InspectionsScreen');
        } else if (data.screen === 'LandlordApplications' || data.screen === 'MyApplications') {
          router.push('/shared-screens/ApplicationsScreen');
        } else if (data.screen === 'Profile') {
          router.push('/(tabs)/profile');
        } else if (data.screen === 'Chat' && data.conversation_id) {
          router.push(`/chat/${data.conversation_id}`);
        }
      }
    });

    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        const data = response.notification.request.content.data;
        if (data?.screen === 'InspectionDetails' || data.screen === 'LandlordInspections') {
          router.push('/shared-screens/InspectionsScreen');
        } else if (data.screen === 'LandlordApplications' || data.screen === 'MyApplications') {
          router.push('/shared-screens/ApplicationsScreen');
        } else if (data.screen === 'Profile') {
          router.push('/(tabs)/profile');
        }
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, [router]);

  // ── Push Registration ────────────────────────────────────────────────────
  const registerForPushNotificationsAsync = async () => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('push_notifications_enabled')
        .eq('id', user.id)
        .single();
      
      if (userData && userData.push_notifications_enabled === false) {
        console.log('Push notifications are disabled in settings');
        return;
      }
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[Push] Permission not granted:', finalStatus);
      // On Android a "denied" POST_NOTIFICATIONS permission can only be
      // fixed from the system app-settings screen — take the user there
      // (once per session) instead of failing silently.
      if (Platform.OS === 'android' && finalStatus === 'denied' && !pushSettingsPromptShown) {
        pushSettingsPromptShown = true;
        showError({
          type: 'unknown',
          title: 'Notifications Blocked',
          message: 'Push notifications are turned off for Eden. Enable them in the screen that opens, then come back.',
        });
        try {
          await Linking.openSettings();
        } catch (e) {
          console.warn('[Push] Could not open app settings:', e);
        }
      }
      return;
    }

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      console.warn('Project ID not found in expo config');
    }

    try {
      let token: string | undefined;
      let tokenType: 'expo' | 'fcm' = 'expo';

      try {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch (expoTokenErr) {
        console.warn('[Push] Expo push token failed, trying device token:', expoTokenErr);
        // Fallback: get native FCM token (works on physical Android outside Expo Go)
        if (Platform.OS === 'android') {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          token = deviceToken.data;
          if (token) tokenType = 'fcm';
        }
      }

      if (!token) {
        console.warn('[Push] Could not obtain any push token');
        return;
      }

      // Nothing changed — skip the DB write (this runs on every foreground)
      if (token === lastSavedToken) {
        return token;
      }

      console.log(`[Push] ${tokenType === 'expo' ? 'Expo push' : 'FCM'} token obtained: ${token.slice(0, 12)}...`);

      if (user) {
        const { error } = await supabase
          .from('users')
          .update({ push_token: token })
          .eq('id', user.id);

        if (error) {
          console.error('[Push] Error saving push token:', error);
        } else {
          lastSavedToken = token;
          console.log(`[Push] ${tokenType} token saved to Supabase successfully`);
        }
      }
      return token;
    } catch (e) {
      console.error('[Push] Error in registerForPushNotificationsAsync:', e);
    }
  };

  // Keep the app-scoped foreground watcher pointed at the latest registrar
  // (the hook is instantiated by several screens; this is idempotent).
  latestRegisterPush = registerForPushNotificationsAsync;

  // ── Set Android notification channel (once on mount) ────────────────────
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Eden Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#407BFF',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    registerForPushNotificationsAsync();

    // Re-register on every return to foreground (throttled to 1/90s).
    // Expo push tokens are tied to the running app build/bundle and go stale
    // after code updates or dev-server restarts — refreshing the token when
    // the app comes back to life keeps the stored token valid. This is the
    // usual reason push stops arriving on a device (e.g. Android keeps the
    // app process alive while a new bundle is loaded, leaving a dead token
    // in the database).
    if (!foregroundPushWatcherStarted) {
      foregroundPushWatcherStarted = true;
      let prev = AppState.currentState;
      AppState.addEventListener('change', (next) => {
        if (next === 'active' && prev !== 'active') {
          const now = Date.now();
          if (now - lastForegroundRegisterAt >= FOREGROUND_REGISTER_MIN_GAP_MS && latestRegisterPush) {
            lastForegroundRegisterAt = now;
            latestRegisterPush().catch(() => {});
          }
        }
        prev = next;
      });
    }
  }, [user]);

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    registerForPushNotificationsAsync,
  };
};