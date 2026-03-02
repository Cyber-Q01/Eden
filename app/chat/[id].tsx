import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useTheme } from '../../context/ThemeContext';

const MOCK_MESSAGES = [
    { id: '1', text: 'Hey Alex, how is the design coming along?', sender: 'other', time: '10:00 AM' },
    { id: '2', text: "It's going great! Just finished the chat screens.", sender: 'me', time: '10:02 AM' },
    { id: '3', text: 'Awesome! Can you show me the Property Gallery?', sender: 'other', time: '10:05 AM' },
    { id: '4', text: "Sure thing, I'll send it over now.", sender: 'me', time: '10:06 AM' },
    { id: '5', text: 'Looks very premium. Good job!', sender: 'other', time: '10:10 AM' },
];

const CHAT_CONTACTS: Record<string, any> = {
    '1': { name: 'Design team', avatar: require('../../assets/icon/profiles/profile1.png') },
    '2': { name: 'Daily planning', avatar: require('../../assets/icon/profiles/profile2.png') },
    '3': { name: 'Kristin Watson', avatar: require('../../assets/icon/profiles/profile3.png') },
};

const ChatDetailScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    const [message, setMessage] = useState('');

    // Fallback if ID is not in contacts
    const contact = CHAT_CONTACTS[id as string] || {
        name: 'User',
        avatar: require('../../assets/icon/profiles/profile1.png')
    };

    const renderMessage = ({ item }: { item: typeof MOCK_MESSAGES[0] }) => {
        const isMe = item.sender === 'me';
        return (
            <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
                <View style={[
                    styles.messageBubble,
                    isMe ? [styles.myBubble, { backgroundColor: colors.primary }] : [styles.otherBubble, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]
                ]}>
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : [styles.otherMessageText, { color: colors.text }]]}>
                        {item.text}
                    </Text>
                </View>
                <Text style={[styles.messageTime, { color: colors.textSecondary }]}>{item.time}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Image source={contact.avatar} style={styles.headerAvatar} />
                    <View>
                        <Text style={[styles.headerName, { color: colors.text }]}>{contact.name}</Text>
                        <Text style={styles.statusText}>Online</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="call-outline" size={22} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Message List */}
            <FlatList
                data={MOCK_MESSAGES}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messageList}
                showsVerticalScrollIndicator={false}
            />

            {/* Input Bar */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <TouchableOpacity style={[styles.attachButton, { backgroundColor: colors.background }]}>
                        <Ionicons name="add" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <ThemedTextInput
                        placeholder="Type a message..."
                        value={message}
                        onChangeText={setMessage}
                        containerStyle={styles.chatInputContainer}
                    />

                    <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]}>
                        <Ionicons name="send" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        padding: 4,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
    },
    headerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    statusText: {
        fontSize: 12,
        color: '#00C853',
        fontWeight: '500',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 16,
    },
    headerIcon: {
        padding: 4,
    },
    messageList: {
        padding: 20,
        paddingBottom: 40,
    },
    messageWrapper: {
        marginBottom: 20,
        maxWidth: '80%',
    },
    myMessageWrapper: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    otherMessageWrapper: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    messageBubble: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 4,
    },
    myBubble: {
        backgroundColor: '#4D80FF',
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: '#F2F2F7',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#FFF',
    },
    otherMessageText: {
        color: '#1C1C1E',
    },
    messageTime: {
        fontSize: 11,
        color: '#8E8E93',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        backgroundColor: '#FFF',
    },
    attachButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputWrapper: {
        flex: 1,
        marginHorizontal: 12,
        backgroundColor: '#F2F2F7',
        borderRadius: 20,
        paddingHorizontal: 16,
        height: 40,
        justifyContent: 'center',
    },
    input: {
        fontSize: 15,
        color: '#1C1C1E',
        padding: 0,
    },
    chatInputContainer: {
        flex: 1,
        marginHorizontal: 12,
        height: 40,
        borderRadius: 20,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#4D80FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ChatDetailScreen;
