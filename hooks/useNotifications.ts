import { useEffect } from 'react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
      console.log('Failed to get push token for push notification!');
      return;
    }

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      console.warn('Project ID not found in expo config');
    }

    try {
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo Push Token:', token);

      if (user) {
        const { error } = await supabase
          .from('users')
          .update({ push_token: token })
          .eq('id', user.id);
        
        if (error) {
          console.error('Error saving push token to Supabase:', error);
        }
      }
      return token;
    } catch (e) {
      console.error('Error getting push token:', e);
    }
  };

  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync();
    }
  }, [user]);

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

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