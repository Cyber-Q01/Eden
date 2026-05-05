import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';
import { callEdgeFunction } from '../lib/api';

export type Message = {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
};

export type Conversation = {
    id: string;
    participant_a_id: string;
    participant_b_id: string;
    last_message_text: string | null;
    last_message_at: string;
    created_at: string;
    // joined user info
    participant_a: { 
        id: string;
        first_name: string; 
        last_name: string;
        email: string;
        user_biodata: { profile_photo: string | null } | null;
    } | null;
    participant_b: { 
        id: string;
        first_name: string; 
        last_name: string;
        email: string;
        user_biodata: { profile_photo: string | null } | null;
    } | null;
};

// ── Conversation list hook ──────────────────────────────────────────────────
export const useChat = () => {
    const { user } = useAuth();
    const { showError } = useToast();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchConversations = async () => {
        if (!user) return;
        setLoading(true);
        setError(false);
        try {
            const data = await callEdgeFunction<Conversation[]>('conversations', 'GET');
            setConversations(data ?? []);
        } catch (e) {
            setError(true);
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, [user]);

    // Start or get existing conversation with another user
    const startConversation = async (otherUserId: string) => {
        if (!user) return null;
        try {
            const data = await callEdgeFunction<{ id: string }>('conversations', 'POST', {
                other_user_id: otherUserId,
            });
            return data?.id ?? null;
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return null;
        }
    };

    return { conversations, loading, error, startConversation, refetch: fetchConversations };
};

// ── Messages hook (used inside a chat room screen) ─────────────────────────
export const useMessages = (conversationId: string) => {
    const { user } = useAuth();
    const { showError } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchMessages = async () => {
        if (!conversationId) return;
        setLoading(true);
        setError(false);
        try {
            const data = await callEdgeFunction<Message[]>('messages', 'GET', null, {
                conversation_id: conversationId,
            });
            setMessages(data ?? []);
        } catch (e) {
            setError(true);
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!conversationId) return;

        // Initial fetch via edge function
        fetchMessages();

        // Supabase Realtime subscription (stays client-side — WebSocket)
        const channel = supabase
            .channel(`messages:${conversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
            }, (payload) => {
                setMessages((prev) => [...prev, payload.new as Message]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [conversationId]);

    const sendMessage = async (content: string) => {
        if (!user || !content.trim() || !conversationId) return;
        try {
            await callEdgeFunction('messages', 'POST', {
                conversation_id: conversationId,
                content: content.trim(),
            });
        } catch (e) {
            const err = await handleError(e);
            showError(err);
        }
    };

    const markRead = async () => {
        if (!user || !conversationId) return;
        try {
            await callEdgeFunction('messages', 'PUT', {
                conversation_id: conversationId,
            });
        } catch (e) {
            // Silently fail — marking read is non-critical
        }
    };

    return { messages, loading, error, sendMessage, markRead, refetch: fetchMessages };
};
