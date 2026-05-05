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
  new_application: { icon: 'person-add-outline', color: '#3b82f6', bgColor: '#3b82f615' },
  application_accepted: { icon: 'checkmark-circle-outline', color: '#22c55e', bgColor: '#22c55e15' },
  application_declined: { icon: 'close-circle-outline', color: '#ef4444', bgColor: '#ef444415' },
  payment_received: { icon: 'cash-outline', color: '#f59e0b', bgColor: '#f59e0b15' },
  rental_confirmed: { icon: 'home-outline', color: '#8b5cf6', bgColor: '#8b5cf615' },
  agreement_signed: { icon: 'document-outline', color: '#06b6d4', bgColor: '#06b6d415' },
  system: { icon: 'notifications-outline', color: '#6b7280', bgColor: '#6b728015' },
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const NotificationCard = ({ notification, onPress, onDelete, onMarkRead }: Props) => {
  const { colors } = useTheme();
  const config = ICON_CONFIG[notification.type];

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: notification.read ? colors.background : colors.card,
          borderColor: colors.border,
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
          { backgroundColor: config.bgColor },
        ]}
      >
        <Ionicons name={config.icon as any} size={18} color={config.color} />
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
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatTime(notification.created_at)}
          </Text>
        </View>

        <Text
          style={[styles.message, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {notification.message}
        </Text>

        {/* Unread indicator */}
        {!notification.read && (
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
        )}
      </View>

      {/* Delete button */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  content: { flex: 1, gap: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { fontSize: 14, flex: 1 },
  time: { fontSize: 11, flexShrink: 0 },
  message: { fontSize: 12, lineHeight: 16 },
  unreadDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  deleteBtn: { padding: 4 },
});

export default NotificationCard;
