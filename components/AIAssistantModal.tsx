import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    PanResponder,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../context/ThemeContext';
import { useAI } from '../hooks/useAI';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Message = { role: 'user' | 'assistant' | 'error'; content: string };

type Props = {
    visible: boolean;
    onClose: () => void;
};

const AIAssistantModal = ({ visible, onClose }: Props) => {
    const { colors } = useTheme();
    const { chatWithAssistant, loading } = useAI();

    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hi! 👋 I'm your Eden assistant. Ask me anything about renting in Nigeria — areas, prices, what to look out for, tenant rights, or how the app works!",
        },
    ]);
    const [input, setInput] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
            onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
            onPanResponderRelease: (_, g) => {
                if (g.dy > 80 || g.vy > 0.5) closeModal();
                else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }).start();
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
                Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    // Track keyboard height and scroll to end when keyboard opens
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                if (e?.endCoordinates?.height) {
                    setKeyboardHeight(e.endCoordinates.height);
                }
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
            }
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const closeModal = () => {
        Animated.parallel([
            Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onClose());
    };

    const handleSend = async (retryText?: string) => {
        const text = retryText || input.trim();
        if (!text || loading) return;

        let updatedMessages = [...messages];

        if (retryText) {
            // Remove previous error message
            updatedMessages = updatedMessages.filter(m => m.role !== 'error');
        } else {
            // Add user message
            updatedMessages.push({ role: 'user', content: text });
            setInput('');
        }

        setMessages(updatedMessages);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            // Build history (exclude initial greeting and errors)
            const history = updatedMessages.slice(1).map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }));

            const reply = await chatWithAssistant(history);

            if (reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            } else {
                throw new Error('Empty response');
            }
        } catch (e) {
            setMessages(prev => [...prev, {
                role: 'error',
                content: "I'm having trouble connecting. Check your internet and try again."
            }]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const quickQuestions = [
        'Is Lekki a good area?',
        'What is caution fee?',
        'Average rent in Abuja?',
        'Tenant rights in Nigeria',
    ];

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
                {!isUser && (
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                        <Ionicons name="sparkles" size={12} color="#fff" />
                    </View>
                )}
                <View style={[
                    styles.bubble,
                    isUser
                        ? [styles.userBubble, { backgroundColor: colors.primary }]
                        : [styles.aiBubble, { backgroundColor: colors.card }],
                    item.role === 'error' && { borderColor: '#FF4D4D', borderWidth: 1 }
                ]}>
                    {item.role === 'error' ? (
                        <View>
                            <Text style={[styles.bubbleText, { color: '#FF4D4D', marginBottom: 8 }]}>
                                {item.content}
                            </Text>
                            <TouchableOpacity
                                style={styles.retryBtn}
                                onPress={() => {
                                    // Find last user message to retry
                                    const userMsgs = messages.filter(m => m.role === 'user');
                                    const lastText = userMsgs[userMsgs.length - 1]?.content;
                                    if (lastText) handleSend(lastText);
                                }}
                            >
                                <Ionicons name="refresh" size={14} color={colors.primary} />
                                <Text style={[styles.retryText, { color: colors.primary }]}>Retry last message</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        isUser ? (
                            <Text style={[styles.bubbleText, { color: '#fff' }]}>{item.content}</Text>
                        ) : (
                            <Markdown style={{
                                body: { color: colors.text, fontSize: 14, lineHeight: 20 },
                                strong: { fontWeight: 'bold' },
                            }}>
                                {item.content}
                            </Markdown>
                        )
                    )}
                </View>
            </View>
        );
    };

    if (!visible) return null;

    return (
        <View style={styles.overlayContainer} pointerEvents="box-none">
            <TouchableWithoutFeedback onPress={closeModal}>
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
            </TouchableWithoutFeedback>

            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.background,
                            transform: [{ translateY }],
                        },
                    ]}
                >
                    {/* Drag handle */}
                    <View {...panResponder.panHandlers} style={styles.dragArea}>
                        <View style={[styles.handle, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
                                <Ionicons name="sparkles" size={16} color="#fff" />
                            </View>
                            <View>
                                <Text style={[styles.headerTitle, { color: colors.text }]}>Eden AI</Text>
                                <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                                    {loading ? 'Thinking...' : 'Online'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Messages */}
                    <FlatList
                        ref={flatListRef}
                        style={{ flex: 1 }}
                        data={messages}
                        keyExtractor={(_, i) => i.toString()}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.messageList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        ListFooterComponent={
                            loading ? (
                                <View style={[styles.messageRow]}>
                                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                        <Ionicons name="sparkles" size={12} color="#fff" />
                                    </View>
                                    <View style={[styles.bubble, styles.aiBubble, { backgroundColor: colors.card }]}>
                                        <Text style={[styles.bubbleText, { color: colors.textSecondary }]}>•••</Text>
                                    </View>
                                </View>
                            ) : null
                        }
                    />

                    {/* Quick questions (only show if just started) */}
                    {messages.length === 1 && (
                        <View style={styles.quickRow}>
                            {quickQuestions.map(q => (
                                <TouchableOpacity
                                    key={q}
                                    style={[styles.quickChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                                    onPress={() => { setInput(q); }}
                                >
                                    <Text style={[styles.quickChipText, { color: colors.primary }]}>{q}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Input */}
                    <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                            placeholder="Ask anything about renting..."
                            placeholderTextColor={colors.textSecondary}
                            value={input}
                            onChangeText={setInput}
                            onSubmitEditing={() => handleSend()}
                            returnKeyType="send"
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.border }]}
                            onPress={() => handleSend()}
                            disabled={!input.trim() || loading}
                        >
                            <Ionicons name="send" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 99999,
        elevation: 99999,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    keyboardAvoid: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 20 : 44,
    },
    sheet: {
        width: '100%',
        flex: 1,
        maxHeight: SCREEN_HEIGHT * 0.82,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 20,
        overflow: 'hidden',
    },
    dragArea: { paddingVertical: 12, alignItems: 'center' },
    handle: { width: 40, height: 4, borderRadius: 2 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 15, fontWeight: '700' },
    headerSub: { fontSize: 11, marginTop: 1 },
    closeBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    messageList: { padding: 16, gap: 12, paddingBottom: 8 },
    messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
    messageRowUser: { flexDirection: 'row-reverse' },
    avatar: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    bubble: { maxWidth: '78%', borderRadius: 16, padding: 12 },
    userBubble: { borderBottomRightRadius: 4 },
    aiBubble: { borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 14, lineHeight: 20 },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255, 77, 77, 0.2)',
    },
    retryText: {
        fontSize: 12,
        fontWeight: '700',
    },
    quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
    quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    quickChipText: { fontSize: 12, fontWeight: '500' },
    inputRow: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 10,
        paddingHorizontal: 16, paddingVertical: 10,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});

export default AIAssistantModal;
