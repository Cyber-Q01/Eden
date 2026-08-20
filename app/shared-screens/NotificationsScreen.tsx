import BackButton from '../../components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import NotificationCard from '../../components/NotificationCard';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { Notification, useNotifications } from '../../hooks/useNotifications';

const FILTERS = ['All', 'unread', 'Payments', 'Properties', 'System'];

const NotificationsScreen = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { notifications, loading, unreadCount, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'Payments':
        return notifications.filter(n => n.type === 'payment_received');
      case 'Properties':
        return notifications.filter(n =>
          ['new_application', 'application_accepted', 'application_declined', 'rental_confirmed', 'agreement_signed'].includes(n.type)
        );
      case 'System':
        return notifications.filter(n => n.type === 'system');
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { title: string; data: Notification[] }[] = [
      { title: 'TODAY', data: [] },
      { title: 'YESTERDAY', data: [] },
      { title: 'EARLIER', data: [] },
    ];

    filteredNotifications.forEach(n => {
      const date = new Date(n.created_at);
      if (date >= today) {
        groups[0].data.push(n);
      } else if (date >= yesterday) {
        groups[1].data.push(n);
      } else {
        groups[2].data.push(n);
      }
    });

    return groups.filter(g => g.data.length > 0);
  }, [filteredNotifications]);

  const handleNotificationPress = (notification: Notification) => {
    if (notification.data?.screen) {
      if (notification.data.screen === 'LandlordApplications') {
        router.push('/shared-screens/ApplicationsScreen');
      } else if (notification.data.screen === 'MyApplications') {
        router.push('/shared-screens/ApplicationsScreen');
      } else if (notification.data.screen === 'Profile') {
        router.push('/(tabs)/profile');
      } else if (
        notification.data.screen === 'LandlordInspections' || 
        notification.data.screen === 'InspectionDetails'
      ) {
        router.push('/shared-screens/InspectionsScreen');
      }
      return;
    }

    // Fallback: check if the notification type, title, or message is inspection related
    const isInspection = 
      notification.type === 'system' && (
        notification.title?.toLowerCase().includes('inspection') ||
        notification.title?.toLowerCase().includes('booking') ||
        notification.message?.toLowerCase().includes('inspection')
      );

    if (isInspection) {
      router.push('/shared-screens/InspectionsScreen');
      return;
    }

    switch (notification.type) {
      case 'new_application':
        router.push('/shared-screens/ApplicationsScreen');
        break;
      case 'payment_received':
        router.push('/(tabs)/profile');
        break;
      default:
        break;
    }
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? colors.primary + '20' : '#EFF6FF' }]}>
        <Ionicons name="notifications-off-outline" size={40} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Notifications Yet
      </Text>
      <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
        You're all caught up! We'll notify you when there's something new.
      </Text>
      <TouchableOpacity
        style={[styles.browseButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.browseButtonText}>Browse Properties</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => markAllAsRead()}>
          <Text style={[styles.markAllRead, { color: colors.primary }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {FILTERS.map(filter => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                activeFilter === filter && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.filterText,
                { color: colors.textSecondary },
                activeFilter === filter && styles.filterTextActive
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groupedNotifications}
          keyExtractor={(item) => item.title}
          renderItem={({ item: group }) => (
            <View>
              <View style={[styles.sectionHeader, { backgroundColor: isDark ? colors.card : '#F1F5F9' }]}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{group.title}</Text>
              </View>
              {group.data.map(item => (
                <NotificationCard
                  key={item.id}
                  notification={item}
                  onPress={handleNotificationPress}
                  onDelete={deleteNotification}
                  onMarkRead={markAsRead}
                />
              ))}
            </View>
          )}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={[
            styles.listContent,
            filteredNotifications.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  unreadBadge: {
    backgroundColor: '#EF4444',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  markAllRead: { fontSize: 15, fontWeight: '500' },

  filtersWrapper: { marginBottom: 10 },
  filtersScroll: { paddingHorizontal: 20, gap: 10, paddingBottom: 5 },
  filterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 14, fontWeight: '500' },
  filterTextActive: { color: '#fff' },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 40 },
  emptyListContent: { flex: 1, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', paddingHorizontal: 40, gap: 15 },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  browseButton: {
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  browseButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default NotificationsScreen;
