import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface SupportMessage {
    id: string;
    ticket_id: string;
    sender_id?: string | null;
    sender_type: 'user' | 'admin' | 'system';
    sender_name?: string | null;
    message: string;
    attachments?: string[];
    created_at: string;
}

export interface SupportTicket {
    id: string;
    ticket_number: string;
    user_id: string;
    subject: string;
    category: string;
    priority: 'urgent' | 'normal' | 'low';
    status: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
    assigned_to?: string | null;
    created_at: string;
    updated_at: string;
    user?: {
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        role?: string;
    };
    messages?: SupportMessage[];
    last_message?: string;
    last_message_at?: string;
    unread_count?: number;
}

export function useSupportTickets() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const pollingTimer = useRef<NodeJS.Timeout | null>(null);

    const fetchTickets = useCallback(async (isRefresh = false) => {
        if (!user) {
            setTickets([]);
            setLoading(false);
            return;
        }

        if (isRefresh) setRefreshing(true);
        else if (tickets.length === 0) setLoading(true);

        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select(`
                    *,
                    messages:support_messages(*)
                `)
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) {
                console.warn('Error fetching support tickets:', error.message);
            } else if (data) {
                const mapped: SupportTicket[] = data.map((t: any) => {
                    const sortedMsgs: SupportMessage[] = (t.messages || []).sort(
                        (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                    const lastMsg = sortedMsgs[sortedMsgs.length - 1];

                    return {
                        id: t.id,
                        ticket_number: t.ticket_number || `#TK-${t.id.slice(0, 4)}`,
                        user_id: t.user_id,
                        subject: t.subject || 'Support Request',
                        category: t.category || 'General',
                        priority: (t.priority || 'normal').toLowerCase() as any,
                        status: (t.status || 'open').toLowerCase() as any,
                        assigned_to: t.assigned_to,
                        created_at: t.created_at || new Date().toISOString(),
                        updated_at: t.updated_at || t.created_at || new Date().toISOString(),
                        messages: sortedMsgs,
                        last_message: lastMsg?.message || t.subject,
                        last_message_at: lastMsg?.created_at || t.created_at,
                    };
                });
                setTickets(mapped);
            }
        } catch (err) {
            console.error('useSupportTickets error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, tickets.length]);

    useEffect(() => {
        fetchTickets();

        // Polling interval for live ticket updates (every 5 seconds)
        pollingTimer.current = setInterval(() => {
            fetchTickets();
        }, 5000);

        return () => {
            if (pollingTimer.current) clearInterval(pollingTimer.current);
        };
    }, [fetchTickets]);

    // Create a new support ticket
    const createTicket = async (params: {
        subject: string;
        category: string;
        message: string;
        priority?: 'urgent' | 'normal' | 'low';
    }): Promise<{ success: boolean; ticket?: SupportTicket; error?: string }> => {
        if (!user) return { success: false, error: 'User is not logged in' };

        try {
            const ticketNum = `#TK-${Math.floor(1000 + Math.random() * 9000)}`;
            const priorityVal = (params.priority || 'normal').toLowerCase();

            const { data: ticketData, error: ticketError } = await supabase
                .from('support_tickets')
                .insert([
                    {
                        ticket_number: ticketNum,
                        user_id: user.id,
                        subject: params.subject.trim(),
                        category: params.category || 'General',
                        priority: priorityVal,
                        status: 'open',
                    },
                ])
                .select()
                .single();

            if (ticketError || !ticketData) {
                throw new Error(ticketError?.message || 'Failed to insert ticket');
            }

            // Insert initial message
            const userName = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email?.split('@')[0] || 'User';

            const { data: msgData, error: msgError } = await supabase
                .from('support_messages')
                .insert([
                    {
                        ticket_id: ticketData.id,
                        sender_id: user.id,
                        sender_type: 'user',
                        sender_name: userName,
                        message: params.message.trim(),
                        attachments: [],
                    },
                ])
                .select()
                .single();

            if (msgError) {
                console.warn('Initial message insert warning:', msgError);
            }

            // Insert instant automated helpdesk SLA auto-reply
            const autoReplyText = `👋 Hello ${userName}! Thank you for reaching out to Eden Central Support.\n\nYour request has been received by our help desk (Ticket ${ticketData.ticket_number}). An Eden support representative has been notified and will attend to your inquiry in less than 10–20 minutes.\n\nIf you have any screenshots or additional reference details, feel free to send them here in the meantime.`;

            const { data: autoReplyData } = await supabase
                .from('support_messages')
                .insert([
                    {
                        ticket_id: ticketData.id,
                        sender_id: null,
                        sender_type: 'system',
                        sender_name: 'Eden Automated Support',
                        message: autoReplyText,
                        attachments: [],
                    },
                ])
                .select()
                .single();

            const initialMessages = [msgData, autoReplyData].filter(Boolean) as SupportMessage[];

            const newTicketObj: SupportTicket = {
                id: ticketData.id,
                ticket_number: ticketData.ticket_number,
                user_id: ticketData.user_id,
                subject: ticketData.subject,
                category: ticketData.category,
                priority: ticketData.priority,
                status: ticketData.status,
                assigned_to: ticketData.assigned_to,
                created_at: ticketData.created_at,
                updated_at: ticketData.updated_at,
                messages: initialMessages,
                last_message: autoReplyText,
                last_message_at: ticketData.created_at,
            };

            setTickets((prev) => [newTicketObj, ...prev]);
            return { success: true, ticket: newTicketObj };
        } catch (err: any) {
            console.error('createTicket error:', err);
            return { success: false, error: err.message || 'Could not submit support ticket.' };
        }
    };

    return {
        tickets,
        loading,
        refreshing,
        refetch: () => fetchTickets(true),
        createTicket,
    };
}

// Hook for a single ticket conversation
export function useSingleSupportTicket(ticketId: string | undefined | null) {
    const { user } = useAuth();
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    const fetchTicketDetails = useCallback(async () => {
        if (!ticketId) {
            setLoading(false);
            return;
        }

        try {
            const [tRes, mRes] = await Promise.all([
                supabase.from('support_tickets').select('*').eq('id', ticketId).maybeSingle(),
                supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
            ]);

            if (tRes.data) {
                const rawTicket = tRes.data;
                const sortedMsgs: SupportMessage[] = (mRes.data || [])
                    .filter((m: any) => {
                        // Filter out internal admin staff assignment & collision notices from mobile customer chat
                        if (m.sender_type === 'system') {
                            const text = (m.message || '').toLowerCase();
                            if (
                                text.includes('assigned to') ||
                                text.includes('claimed by') ||
                                text.includes('taken over') ||
                                text.includes('[internal') ||
                                text.includes('reassigned') ||
                                text.includes('staff collision')
                            ) {
                                return false;
                            }
                        }
                        return true;
                    })
                    .map((m: any) => ({
                        id: m.id,
                        ticket_id: m.ticket_id,
                        sender_id: m.sender_id,
                        sender_type: m.sender_type,
                        sender_name: m.sender_name,
                        message: m.message,
                        attachments: m.attachments || [],
                        created_at: m.created_at,
                    }));

                setTicket({
                    id: rawTicket.id,
                    ticket_number: rawTicket.ticket_number,
                    user_id: rawTicket.user_id,
                    subject: rawTicket.subject,
                    category: rawTicket.category,
                    priority: rawTicket.priority,
                    status: rawTicket.status,
                    assigned_to: rawTicket.assigned_to,
                    created_at: rawTicket.created_at,
                    updated_at: rawTicket.updated_at,
                    messages: sortedMsgs,
                });
                setMessages(sortedMsgs);
            }
        } catch (err) {
            console.error('fetchTicketDetails error:', err);
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    useEffect(() => {
        fetchTicketDetails();

        // Realtime poll for new support replies every 3.5 seconds
        pollInterval.current = setInterval(() => {
            fetchTicketDetails();
        }, 3500);

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [fetchTicketDetails]);

    // Send a reply message in the ticket
    const sendMessage = async (text: string): Promise<boolean> => {
        if (!ticketId || !text.trim() || !user) return false;

        const optimisticId = `opt-${Date.now()}`;
        const userName = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email?.split('@')[0] || 'User';

        const optimisticMsg: SupportMessage = {
            id: optimisticId,
            ticket_id: ticketId,
            sender_id: user.id,
            sender_type: 'user',
            sender_name: userName,
            message: text.trim(),
            attachments: [],
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimisticMsg]);
        setSending(true);

        try {
            const { error: mError } = await supabase.from('support_messages').insert([
                {
                    ticket_id: ticketId,
                    sender_id: user.id,
                    sender_type: 'user',
                    sender_name: userName,
                    message: text.trim(),
                    attachments: [],
                },
            ]);

            if (mError) throw mError;

            // Update ticket updated_at
            await supabase
                .from('support_tickets')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', ticketId);

            fetchTicketDetails();
            return true;
        } catch (err) {
            console.error('sendMessage error:', err);
            // Revert optimistic msg on failure
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            return false;
        } finally {
            setSending(false);
        }
    };

    // Close or resolve ticket
    const closeTicket = async (): Promise<boolean> => {
        if (!ticketId || !user) return false;
        try {
            await supabase
                .from('support_tickets')
                .update({ status: 'closed', updated_at: new Date().toISOString() })
                .eq('id', ticketId);

            await supabase.from('support_messages').insert([
                {
                    ticket_id: ticketId,
                    sender_id: user.id,
                    sender_type: 'system',
                    sender_name: 'System',
                    message: 'Ticket closed by customer.',
                },
            ]);

            fetchTicketDetails();
            return true;
        } catch (err) {
            console.error('closeTicket error:', err);
            return false;
        }
    };

    return {
        ticket,
        messages,
        loading,
        sending,
        sendMessage,
        closeTicket,
        refetch: fetchTicketDetails,
    };
}
