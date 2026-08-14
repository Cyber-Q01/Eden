import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Notification, NotificationType } from '../hooks/useNotifications';

type Props = {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onDelete: (notificationId: string) => void;
  onMarkRead: (notificationId: string) => void;
};

const ICON_CONFIG: Record<NotificationType, { icon: string; color: string; bgColor: string }> = {
  new_application: { icon: 'document-text-outline', color: '#EF4444', bgColor: '#FEE2E2' },
  application_accepted: { icon: 'checkmark-circle-outline', color: '#10B981', bgColor: '#D1FAE5' },
  application_declined: { icon: 'close-circle-outline', color: '#EF4444', bgColor: '#FEE2E2' },
  payment_received: { icon: 'card-outline', color: '#F59E0B', bgColor: '#FEF3C7' },
  rental_confirmed: { icon: 'home-outline', color: '#3B82F6', bgColor: '#DBEAFE' },
  agreement_signed: { icon: 'pencil-outline', color: '#8B5CF6', bgColor: '#EDE9FE' },
  system: { icon: 'calendar-outline', color: '#10B981', bgColor: '#D1FAE5' },
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const NotificationCard = ({ notification, onPress, onDelete, onMarkRead }: Props) => {
  const { colors, isDark } = useTheme();
  const config = ICON_CONFIG[notification.type] || ICON_CONFIG.system;

  const isApplication = notification.type === 'new_application';
  // In dark mode, soften the icon background so it doesn't clash
  const iconBg = isDark ? config.color + '28' : config.bgColor;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}
      onPress={() => {
        if (!notification.read) onMarkRead(notification.id);
        onPress(notification);
      }}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: iconBg },
        ]}
      >
        <Ionicons name={config.icon as any} size={20} color={config.color} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontWeight: notification.read ? '500' : '700',
              },
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          {!notification.read && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          )}
        </View>

        <Text
          style={[styles.message, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {notification.message}
        </Text>

        <Text style={[styles.time, { color: colors.textSecondary + 'AA' }]}>
          {formatTime(notification.created_at)}
        </Text>

        {isApplication && !notification.read && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => onPress(notification)}
          >
            <Text style={styles.actionButtonText}>Review App</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  content: { flex: 1, gap: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 15 },
  time: { fontSize: 12, marginTop: 2 },
  message: { fontSize: 13, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  actionButton: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: { padding: 4 },
});

export default NotificationCard;
