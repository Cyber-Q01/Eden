// hooks/useNotifications.ts

import { useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';

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
  const { showError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Fetch notifications ──────────────────────────────────────────────────
  const fetchNotifications = async (limit: number = 50) => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await callEdgeFunction<Notification[]>(
        'notifications',
        'POST',
        { action: 'list', limit }
      );
      setNotifications(data ?? []);
      const unread = (data ?? []).filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (e) {
      const err = await handleError(e);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Mark as read ────────────────────────────────────────────────────────
  const markAsRead = async (notificationId: string) => {
    try {
      await callEdgeFunction('notifications', 'POST', {
        action: 'mark_as_read',
        notification_id: notificationId
      });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      const err = await handleError(e);
      showError(err);
    }
  };

  // ── Mark all as read ────────────────────────────────────────────────────
  const markAllAsRead = async () => {
    try {
      await callEdgeFunction('notifications', 'POST', { action: 'mark_all_as_read' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
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
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      // Decrement unread count if the deleted notification was unread
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      const err = await handleError(e);
      showError(err);
    }
  };

  // ── Initial fetch on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  // ── Real-time subscription to new notifications ──────────────────────────
  useEffect(() => {
    if (!user) return;

    // Subscribe to INSERT events for this user
    // Append a random string to avoid channel collisions if the hook is used in multiple components simultaneously
    const channelName = `notifications:${user.id}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          // Add to top of list
          setNotifications(prev => [newNotification, ...prev]);
          // Increment unread count if not read
          if (!newNotification.read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};