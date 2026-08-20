import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSingleSupportTicket, SupportMessage } from '@/hooks/useSupportTickets';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SupportChatScreen() {
    const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);

    const { ticket, messages, loading, sending, sendMessage, closeTicket } = useSingleSupportTicket(ticketId);
    const [inputText, setInputText] = useState('');

    const paddingTop = Platform.OS === 'android'
        ? Math.max(insets.top, StatusBar.currentHeight || 24)
        : insets.top;
    const paddingBottom = insets.bottom;

    // Auto scroll on new messages
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    const handleSend = async () => {
        if (!inputText.trim() || sending) return;
        const text = inputText;
        setInputText('');
        const success = await sendMessage(text);
        if (!success) {
            setInputText(text);
            Alert.alert('Error', 'Could not send message. Please try again.');
        }
    };

    const handleClose = () => {
        Alert.alert(
            'Close Ticket',
            'Are you sure you want to mark this support ticket as resolved and close it?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Close Ticket',
                    style: 'destructive',
                    onPress: async () => {
                        await closeTicket();
                        Alert.alert('Ticket Closed', 'Your ticket has been marked as closed.');
                    }
                }
            ]
        );
    };

    const handleCallHotline = () => {
        Linking.openURL('tel:08111783575');
    };

    const handleWhatsApp = () => {
        Linking.openURL('https://wa.me/2348111783575?text=Hello%20Eden%20Support%20Team%20regarding%20ticket%20' + (ticket?.ticket_number || ''));
    };

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'resolved' || s === 'closed') {
            return { label: s === 'closed' ? 'Closed' : 'Resolved', bg: '#DCFCE7', text: '#15803D' };
        }
        if (s === 'pending' || s === 'in_progress') {
            return { label: 'In Progress', bg: '#FEF3C7', text: '#B45309' };
        }
        return { label: 'Open', bg: '#FEE2E2', text: '#DC2626' };
    };

    const renderMessage = ({ item }: { item: SupportMessage }) => {
        if (item.sender_type === 'system') {
            const text = (item.message || '').toLowerCase();
            // Hide internal admin assignment and collision logs from tenant/landlord chat
            if (
                text.includes('assigned to') ||
                text.includes('claimed by') ||
                text.includes('taken over') ||
                text.includes('[internal') ||
                text.includes('reassigned') ||
                text.includes('staff collision')
            ) {
                return null;
            }

            return (
                <View style={styles.systemMsgWrap}>
                    <View style={[styles.systemMsgPill, { backgroundColor: isDark ? '#1e293b' : '#F1F5F9' }]}>
                        <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                        <Text style={[styles.systemMsgText, { color: colors.textSecondary }]}>{item.message}</Text>
                    </View>
                </View>
            );
        }

        const isMe = item.sender_type === 'user';
        return (
            <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
                {!isMe && (
                    <View style={styles.adminAvatarWrap}>
                        <View style={styles.adminAvatar}>
                            <Ionicons name="headset" size={14} color="#1D4ED8" />
                        </View>
                    </View>
                )}

                <View style={styles.bubbleContent}>
                    {!isMe && (
                        <View style={styles.senderHeader}>
                            <Text style={styles.adminSenderName}>{item.sender_name || 'Eden Support Desk'}</Text>
                            <View style={styles.adminBadge}>
                                <Text style={styles.adminBadgeText}>Support Agent</Text>
                            </View>
                        </View>
                    )}

                    <View
                        style={[
                            styles.messageBubble,
                            isMe
                                ? [styles.myBubble, { backgroundColor: colors.primary }]
                                : [styles.otherBubble, { backgroundColor: colors.card, borderColor: colors.border }]
                        ]}
                    >
                        <Text style={[styles.messageText, isMe ? styles.myMessageText : [styles.otherMessageText, { color: colors.text }]]}>
                            {item.message}
                        </Text>
                    </View>

                    <Text style={[styles.messageTime, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }, { color: colors.textSecondary }]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    const statusInfo = getStatusBadge(ticket?.status || 'open');

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop, paddingBottom }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor="transparent"
                translucent={true}
            />

            {/* Top Navigation Bar */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.headerLeft}>
                    <BackButton />
                    <View style={styles.supportHeaderAvatar}>
                        <Ionicons name="headset" size={20} color="#FFFFFF" />
                        <View style={styles.onlineDot} />
                    </View>
                    <View style={styles.headerTitleWrap}>
                        <View style={styles.titleWithBadge}>
                            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                                {ticket?.ticket_number || 'Support Ticket'}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                                <Text style={[styles.statusBadgeText, { color: statusInfo.text }]}>
                                    {statusInfo.label}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
                            {ticket?.subject || 'Eden Customer Help Desk'}
                        </Text>
                    </View>
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#ECFDF5' }]}
                        onPress={handleCallHotline}
                    >
                        <Ionicons name="call" size={16} color="#059669" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#F0FDF4' }]}
                        onPress={handleWhatsApp}
                    >
                        <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
                    </TouchableOpacity>
                    {ticket?.status !== 'closed' && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
                            onPress={handleClose}
                        >
                            <Ionicons name="checkmark-circle-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Ticket Information Ribbon */}
            {ticket && (
                <View style={[styles.ticketInfoRibbon, { backgroundColor: isDark ? '#0c1844' : '#EFF6FF', borderBottomColor: colors.border }]}>
                    <View style={styles.ribbonItem}>
                        <Text style={[styles.ribbonLabel, { color: colors.textSecondary }]}>Category:</Text>
                        <Text style={[styles.ribbonValue, { color: colors.primary }]}>{ticket.category}</Text>
                    </View>
                    <View style={styles.ribbonDivider} />
                    <View style={styles.ribbonItem}>
                        <Text style={[styles.ribbonLabel, { color: colors.textSecondary }]}>Priority:</Text>
                        <Text style={[styles.ribbonValue, { color: ticket.priority === 'urgent' ? '#DC2626' : '#2563EB', textTransform: 'capitalize' }]}>
                            {ticket.priority}
                        </Text>
                    </View>
                    <View style={styles.ribbonDivider} />
                    <View style={styles.ribbonItem}>
                        <Text style={[styles.ribbonLabel, { color: colors.textSecondary }]}>Hotline:</Text>
                        <TouchableOpacity onPress={handleCallHotline}>
                            <Text style={[styles.ribbonValue, { color: '#059669', fontWeight: '700' }]}>08111783575</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Keyboard Avoiding Chat View */}
            <KeyboardAvoidingView
                style={styles.chatArea}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View style={{ flex: 1 }}>
                        {loading && messages.length === 0 ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading conversation...</Text>
                            </View>
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                data={messages}
                                renderItem={renderMessage}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.messagesList}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                            />
                        )}
                    </View>
                </TouchableWithoutFeedback>

                {/* Bottom Chat Input Bar */}
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    {ticket?.status === 'closed' ? (
                        <View style={styles.closedBar}>
                            <Ionicons name="lock-closed" size={16} color="#64748B" />
                            <Text style={styles.closedText}>This support ticket is closed.</Text>
                        </View>
                    ) : (
                        <View style={styles.inputRow}>
                            <TextInput
                                style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, maxHeight: 100 }]}
                                placeholder="Type your message to support..."
                                placeholderTextColor={colors.textSecondary}
                                value={inputText}
                                onChangeText={setInputText}
                                multiline={true}
                                returnKeyType="default"
                            />
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    { backgroundColor: inputText.trim() ? colors.primary : colors.border }
                                ]}
                                onPress={handleSend}
                                disabled={!inputText.trim() || sending}
                            >
                                {sending ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Ionicons name="send" size={18} color="#FFF" />
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    chatArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    supportHeaderAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1D4ED8',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    headerTitleWrap: {
        flex: 1,
    },
    titleWithBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    statusBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    headerSub: {
        fontSize: 11.5,
        marginTop: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ticketInfoRibbon: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
    },
    ribbonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ribbonLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    ribbonValue: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    ribbonDivider: {
        width: 1,
        height: 14,
        backgroundColor: '#CBD5E1',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
    },
    messagesList: {
        padding: 16,
        paddingBottom: 24,
    },
    systemMsgWrap: {
        alignItems: 'center',
        marginVertical: 10,
    },
    systemMsgPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#CBD5E1',
    },
    systemMsgText: {
        fontSize: 11.5,
        fontWeight: '500',
    },
    messageRow: {
        flexDirection: 'row',
        marginVertical: 6,
        maxWidth: '82%',
    },
    myMessageRow: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
    },
    otherMessageRow: {
        alignSelf: 'flex-start',
        justifyContent: 'flex-start',
        gap: 8,
    },
    adminAvatarWrap: {
        marginTop: 2,
    },
    adminAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bubbleContent: {
        flex: 1,
    },
    senderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 3,
        marginLeft: 2,
    },
    adminSenderName: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#1D4ED8',
    },
    adminBadge: {
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
    },
    adminBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#1E40AF',
    },
    messageBubble: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 18,
    },
    myBubble: {
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        borderBottomLeftRadius: 4,
        borderWidth: 1,
    },
    messageText: {
        fontSize: 13.5,
        lineHeight: 19,
    },
    myMessageText: {
        color: '#FFFFFF',
    },
    otherMessageText: {},
    messageTime: {
        fontSize: 10,
        marginTop: 3,
        marginHorizontal: 4,
    },
    inputContainer: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: 1,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
    },
    textInput: {
        flex: 1,
        minHeight: 42,
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13.5,
    },
    sendButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closedBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
    },
    closedText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
});
