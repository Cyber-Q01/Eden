import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useChat } from '../../hooks/useChat';
import { useProfile } from '../../hooks/useProfile';

const ChatScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { conversations, loading } = useChat();
    const { profile } = useProfile();

    const renderChatItem = ({ item }: { item: any }) => {
        // Determine the other participant's details
        const otherUser = item.participant_a?.id === profile?.id
            ? item.participant_b
            : item.participant_a;
        
        const name = otherUser?.first_name 
            ? `${otherUser.first_name} ${otherUser.last_name || ''}`.trim() 
            : 'User';
        const avatar = otherUser?.user_biodata?.profile_photo;

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => router.push(`/chat/${item.id}`)}
            >
                <View style={styles.avatarContainer}>
                    {avatar ? (
                        <Image source={{ uri: avatar }} style={[styles.avatar, { backgroundColor: colors.border }]} />
                    ) : (
                        <Image source={require('../../assets/icon/profiles/profile1.png')} style={[styles.avatar, { backgroundColor: colors.border }]} />
                    )}
                </View>
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeaderRow}>
                        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
                        <Text style={[styles.time, { color: colors.textSecondary }]}>
                            {item.last_message_at ? new Date(item.last_message_at).toLocaleDateString() : ''}
                        </Text>
                    </View>
                    <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.last_message_text ?? 'No messages yet'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };


    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    {profile?.user_biodata?.profile_photo ? (
                         <Image
                            source={{ uri: profile.user_biodata.profile_photo }}
                            style={[styles.userAvatar, { backgroundColor: colors.border }]}
                        />
                    ) : (
                        <Image
                            source={require('../../assets/icon/profiles/profile1.png')}
                            style={[styles.userAvatar, { backgroundColor: colors.border }]}
                        />
                    )}
                    <View>
                        <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Chat</Text>
                        <Text style={[styles.userName, { color: colors.text }]}>{profile?.first_name} {profile?.last_name}</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.card }]}>
                        <Ionicons name="search" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, styles.plusButton, { backgroundColor: colors.primary }]}>
                        <Ionicons name="add" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.content, { backgroundColor: colors.card }]}>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: colors.text }]}>Chats</Text>
                </View>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                ) : conversations.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40 }}>No conversations yet.</Text>
                ) : (
                    <FlatList
                        data={conversations}
                        renderItem={renderChatItem}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    screen: {
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    greetingText: {
        fontSize: 12,
        fontWeight: '500',
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    plusButton: {
    },
    content: {
        flex: 1,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        paddingHorizontal: 24,
        paddingTop: 30,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
    },
    manageText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 20,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 16,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    emojiBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    emojiText: {
        fontSize: 10,
    },
    chatInfo: {
        flex: 1,
    },
    chatHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
    },
    time: {
        fontSize: 12,
    },
    chatFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    lastMessageEmoji: {
        fontSize: 14,
    },
    lastMessage: {
        fontSize: 14,
        fontWeight: '500',
    },
    unreadBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    unreadCount: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
});

export default ChatScreen;
