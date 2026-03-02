import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';

const CHATS = [
    {
        id: '1',
        name: 'Design team',
        lastMessage: 'Awesome',
        time: 'Today, 12:25',
        unreadCount: 5,
        avatar: require('../../assets/icon/profiles/profile1.png'),
        emoji: '🔥'
    },
    {
        id: '2',
        name: 'Daily planning',
        lastMessage: 'Ok!',
        time: 'February, 2019',
        unreadCount: 2,
        avatar: require('../../assets/icon/profiles/profile2.png'),
        emoji: '🙋'
    },
    {
        id: '3',
        name: 'Kristin Watson',
        lastMessage: 'Sounds gooood!',
        time: 'February, 2019',
        avatar: require('../../assets/icon/profiles/profile3.png'),
    },
    {
        id: '4',
        name: 'Marvin McKinney',
        lastMessage: 'Got it)',
        time: 'Desember, 2019',
        avatar: require('../../assets/icon/profiles/profile1.png'),
    },
    {
        id: '5',
        name: 'Darrell Steward',
        lastMessage: 'See you soon bro',
        time: 'March, 2014',
        avatar: require('../../assets/icon/profiles/profile2.png'),
    },
    {
        id: '6',
        name: 'Cameron Williamson',
        lastMessage: "Can't wait)",
        time: 'September, 2017',
        avatar: require('../../assets/icon/profiles/profile3.png'),
    },
    {
        id: '7',
        name: 'Jerome Bell',
        lastMessage: 'Go',
        time: 'March 6, 2018',
        avatar: require('../../assets/icon/profiles/profile1.png'),
    },
];

const ChatScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();

    const renderChatItem = ({ item }: { item: typeof CHATS[0] }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => router.push(`/chat/${item.id}`)}
        >
            <View style={styles.avatarContainer}>
                <Image source={item.avatar} style={[styles.avatar, { backgroundColor: colors.border }]} />
                {item.emoji && (
                    <View style={[styles.emojiBadge, { backgroundColor: colors.card }]}>
                        <Text style={styles.emojiText}>{item.emoji}</Text>
                    </View>
                )}
            </View>
            <View style={styles.chatInfo}>
                <View style={styles.chatHeaderRow}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.time, { color: colors.textSecondary }]}>{item.time}</Text>
                </View>
                <View style={styles.chatFooterRow}>
                    <View style={styles.messageRow}>
                        {item.emoji && <Text style={styles.lastMessageEmoji}>{item.emoji} </Text>}
                        <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>{item.lastMessage}</Text>
                    </View>
                    {item.unreadCount && (
                        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.unreadCount}>{item.unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper style={styles.screen}>
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Image
                        source={require('../../assets/icon/profiles/profile1.png')}
                        style={[styles.userAvatar, { backgroundColor: colors.border }]}
                    />
                    <View>
                        <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Good morning</Text>
                        <Text style={[styles.userName, { color: colors.text }]}>Alex bender</Text>
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
                    <TouchableOpacity>
                        <Text style={[styles.manageText, { color: colors.primary }]}>Manage</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={CHATS}
                    renderItem={renderChatItem}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
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
