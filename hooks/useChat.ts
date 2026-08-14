import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

export const useChat = () => {
    const { user } = useAuth();
    const { showError } = useToast();
    const queryClient = useQueryClient();

    const { data: conversations, isLoading: loading, isError: error, refetch: fetchConversations } = useQuery({
        queryKey: ['conversations', user?.id],
        queryFn: async () => {
            if (!user) return [];
            try {
                const data = await callEdgeFunction<Conversation[]>('conversations', 'GET');
                return data ?? [];
            } catch (e) {
                const err = await handleError(e);
                showError(err);
                throw e;
            }
        },
        enabled: !!user
    });

    const startConversation = async (otherUserId: string) => {
        if (!user) return null;
        try {
            const data = await callEdgeFunction<{ id: string }>('conversations', 'POST', {
                other_user_id: otherUserId,
            });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            return data?.id ?? null;
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return null;
        }
    };

    return { conversations: conversations ?? [], loading, error, startConversation, refetch: fetchConversations };
};

export const useMessages = (conversationId: string) => {
    const { user } = useAuth();
    const { showError } = useToast();
    const queryClient = useQueryClient();

    const { data: messages, isLoading: loading, isError: error, refetch: fetchMessages } = useQuery({
        queryKey: ['messages', conversationId],
        queryFn: async () => {
            if (!conversationId) return [];
            try {
                const data = await callEdgeFunction<Message[]>('messages', 'GET', null, {
                    conversation_id: conversationId,
                });
                return data ?? [];
            } catch (e) {
                const err = await handleError(e);
                showError(err);
                throw e;
            }
        },
        enabled: !!conversationId
    });

    useEffect(() => {
        if (!conversationId) return;

        // Supabase Realtime subscription
        const channel = supabase
            .channel(`messages:${conversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
            }, (payload) => {
                queryClient.setQueryData(['messages', conversationId], (old: Message[] | undefined) => {
                    return [...(old || []), payload.new as Message];
                });
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [conversationId, queryClient]);

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
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } catch (e) {
            // Silently fail
        }
    };

    return { messages: messages ?? [], loading, error, sendMessage, markRead, refetch: fetchMessages };
};
