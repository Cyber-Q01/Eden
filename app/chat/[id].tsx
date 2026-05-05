import { callEdgeFunction } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useMessages } from '../../hooks/useChat';
import { supabase } from '../../lib/supabase';

const ChatDetailScreen = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const { user } = useAuth();
    const { messages, loading, sendMessage, markRead } = useMessages(id);
    const [messageText, setMessageText] = useState('');
    const [contactName, setContactName] = useState('User');
    const [contactAvatar, setContactAvatar] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // Fetch the other participant's details
    useEffect(() => {
        if (!id || !user) return;
        
        const fetchConversation = async () => {
            try {
                const data = await callEdgeFunction<any>('conversations', 'GET', null, { id });
                if (!data) return;

                const isA = data.participant_a_id === user.id;
                const other = isA ? data.participant_b : data.participant_a;
                
                setContactName(other?.first_name ?? 'User');
                setContactAvatar(other?.user_biodata?.profile_photo || null);
            } catch (e) {
                console.error('Error fetching conversation:', e);
            }
        };

        fetchConversation();
        markRead();
    }, [id, user]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    const handleSend = async () => {
        if (!messageText.trim()) return;
        const text = messageText;
        setMessageText('');
        await sendMessage(text);
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMe = item.sender_id === user?.id;
        return (
            <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
                <View style={[
                    styles.messageBubble,
                    isMe
                        ? [styles.myBubble, { backgroundColor: colors.primary }]
                        : [styles.otherBubble, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]
                ]}>
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : [styles.otherMessageText, { color: colors.text }]]}>
                        {item.content}
                    </Text>
                </View>
                <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.headerLeft}>
                    <BackButton />
                    {contactAvatar ? (
                        <Image source={{ uri: contactAvatar }} style={styles.headerAvatar} />
                    ) : (
                        <Image source={require('../../assets/icon/profiles/profile1.png')} style={styles.headerAvatar} />
                    )}
                    <View>
                        <Text style={[styles.headerName, { color: colors.text }]}>{contactName}</Text>
                        <Text style={styles.statusText}>Online</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="call-outline" size={22} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.headerIcon}
                        onPress={() => router.push({
                            pathname: '/shared-screens/AgreementScreen',
                            params: { rental_id: 'temp-rental-id' } // Will be wired to real ID later
                        })}
                    >
                        <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Keyboard-avoiding wrapper — keeps input above keyboard */}
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Tap messages area to dismiss keyboard */}
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.messageList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    />
                </TouchableWithoutFeedback>

                {/* Input Bar — always sits just above keyboard */}
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <TouchableOpacity style={[styles.attachButton, { backgroundColor: colors.background }]}>
                        <Ionicons name="add" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <ThemedTextInput
                        placeholder="Type a message..."
                        value={messageText}
                        onChangeText={setMessageText}
                        containerStyle={styles.chatInputContainer}
                        onSubmitEditing={handleSend}
                        returnKeyType="send"
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: messageText.trim() ? colors.primary : colors.border }]}
                        onPress={handleSend}
                        disabled={!messageText.trim()}
                    >
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
    },
    flex: {
        flex: 1,
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
