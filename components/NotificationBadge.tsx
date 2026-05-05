import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';

type Props = {
  size?: 'small' | 'large';
  color?: string;
};

const NotificationBadge = ({ size = 'small', color }: Props) => {
  const { colors } = useTheme();
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) {
    return (
      <Ionicons
        name="notifications-outline"
        size={size === 'large' ? 28 : 24}
        color={color ?? colors.text}
      />
    );
  }

  const badgeSize = size === 'large' ? 20 : 16;
  const iconSize = size === 'large' ? 28 : 24;

  return (
    <View style={styles.container}>
      <Ionicons
        name="notifications-outline"
        size={iconSize}
        color={color ?? colors.text}
      />
      <View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            minWidth: badgeSize,
            backgroundColor: colors.primary,
          },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            {
              fontSize: size === 'large' ? 10 : 8,
            },
          ]}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default NotificationBadge;
