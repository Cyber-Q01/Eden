import BackButton from '@/components/BackButton';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    LayoutAnimation,
    Linking,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

const FAQ_DATA: FAQItem[] = [
    {
        id: '1',
        question: 'How do i book an inspection',
        answer: 'Tap Book inspection on any listings. Select your preferred date and time. 2 credits are required per booking.',
    },
    {
        id: '2',
        question: 'How are credits used',
        answer: 'Credits are used to book inspections (1 credit/unit per booking) and unlock properties for direct viewing of landlord contact details.',
    },
    {
        id: '3',
        question: 'How does escrow payment work',
        answer: 'Your payment is held securely in escrow and is released to the landlord once you confirm the property.',
    },
    {
        id: '4',
        question: 'which document do i need',
        answer: 'You will need a valid government-issued ID (NIN, Driver\'s License, or International Passport) and proof of income/employment for tenant verification.',
    },
    {
        id: '5',
        question: 'how do you report a fake listing',
        answer: 'Tap on the flag or report button on the property listing page, or contact our support team directly with the details of the listing.',
    },
];

const HelpSupportScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const { tickets, loading: ticketsLoading, refreshing, refetch, createTicket } = useSupportTickets();

    // Active View Tab: 'faq' | 'tickets'
    const [activeTab, setActiveTab] = useState<'faq' | 'tickets'>('faq');
    const [ticketFilter, setTicketFilter] = useState<'All' | 'Open' | 'In Progress' | 'Resolved'>('All');

    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Support Ticket Form State
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [ticketCategory, setTicketCategory] = useState('Escrow & Payment');
    const [ticketPriority, setTicketPriority] = useState<'urgent' | 'normal' | 'low'>('normal');
    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketMessage, setTicketMessage] = useState('');
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

    const categories = [
        'Escrow & Payment',
        'Inspection & Bookings',
        'Property Listing / Moderation',
        'Artisan & Maintenance',
        'KYC Identity Verification',
        'General Inquiry'
    ];

    const toggleExpand = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    const handleWhatsApp = async () => {
        const url = 'https://wa.me/2348111783575?text=Hello%20Eden%20Support%20Team';
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Notice', 'Opening WhatsApp. If not installed, you can call us at 08111783575.');
        }
    };

    const handleCallHotline = () => {
        Linking.openURL('tel:08111783575');
    };

    const handleEmail = () => {
        Linking.openURL('mailto:support@eden.ng?subject=Eden%20Support%20Request');
    };

    const handleSubmitTicket = async () => {
        if (!ticketSubject.trim() || !ticketMessage.trim()) {
            Alert.alert('Required Fields', 'Please provide a subject and description of your inquiry.');
            return;
        }

        setIsSubmittingTicket(true);
        try {
            const res = await createTicket({
                subject: ticketSubject.trim(),
                category: ticketCategory,
                message: ticketMessage.trim(),
                priority: ticketPriority,
            });

            if (res.success && res.ticket) {
                setShowTicketModal(false);
                setTicketSubject('');
                setTicketMessage('');
                // Navigate directly to the live Support Chat for this ticket
                router.push({
                    pathname: '/shared-screens/SupportChatScreen',
                    params: { ticketId: res.ticket.id }
                });
            } else {
                Alert.alert('Submission Error', res.error || 'Failed to submit support ticket.');
            }
        } catch (e: any) {
            console.error('Support ticket error:', e);
            Alert.alert('Error', 'An unexpected error occurred while creating your ticket.');
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    const getStatusStyle = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'resolved' || s === 'closed') {
            return { bg: '#DCFCE7', text: '#15803D', label: s === 'closed' ? 'Closed' : 'Resolved' };
        }
        if (s === 'pending' || s === 'in_progress') {
            return { bg: '#FEF3C7', text: '#B45309', label: 'In Progress' };
        }
        return { bg: '#FEE2E2', text: '#DC2626', label: 'Open' };
    };

    const filteredFAQs = FAQ_DATA.filter(item =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredTickets = tickets.filter(t => {
        const matchesSearch =
            t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesTab = true;
        if (ticketFilter === 'Open') matchesTab = t.status === 'open';
        else if (ticketFilter === 'In Progress') matchesTab = t.status === 'pending' || t.status === 'in_progress';
        else if (ticketFilter === 'Resolved') matchesTab = t.status === 'resolved' || t.status === 'closed';

        return matchesSearch && matchesTab;
    });

    const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'pending' || t.status === 'in_progress').length;

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} withScrollView={true}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Support Desk</Text>
                <TouchableOpacity
                    onPress={() => setShowTicketModal(true)}
                    style={styles.newTicketHeaderBtn}
                >
                    <Ionicons name="add" size={20} color="#1D4ED8" />
                </TouchableOpacity>
            </View>

            {/* Top Main Tab Navigation (FAQs vs My Tickets) */}
            <View style={[styles.tabBarWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.mainTabBtn, activeTab === 'faq' && styles.mainTabBtnActive]}
                    onPress={() => setActiveTab('faq')}
                >
                    <Ionicons
                        name="help-buoy-outline"
                        size={17}
                        color={activeTab === 'faq' ? '#1D4ED8' : colors.textSecondary}
                    />
                    <Text style={[styles.mainTabText, activeTab === 'faq' ? styles.mainTabTextActive : { color: colors.textSecondary }]}>
                        FAQs & Hotline
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.mainTabBtn, activeTab === 'tickets' && styles.mainTabBtnActive]}
                    onPress={() => setActiveTab('tickets')}
                >
                    <Ionicons
                        name="chatbubbles-outline"
                        size={17}
                        color={activeTab === 'tickets' ? '#1D4ED8' : colors.textSecondary}
                    />
                    <Text style={[styles.mainTabText, activeTab === 'tickets' ? styles.mainTabTextActive : { color: colors.textSecondary }]}>
                        My Tickets ({tickets.length})
                    </Text>
                    {openTicketsCount > 0 && (
                        <View style={styles.openBadge}>
                            <Text style={styles.openBadgeText}>{openTicketsCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} colors={['#1D4ED8']} />}
                keyboardShouldPersistTaps="handled"
            >
                {/* How can we help banner */}
                <LinearGradient
                    colors={['#1D4ED8', '#1E3A8A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.heroBanner}
                >
                    <View style={styles.decorCircle1} />
                    <View style={styles.decorCircle2} />

                    <View style={styles.heroLeft}>
                        <View style={styles.supportIconBg}>
                            <Ionicons name="headset-outline" size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.heroTextContainer}>
                            <Text style={styles.heroTitle}>Eden Support Desk</Text>
                            <Text style={styles.heroSubtitle}>Live Chat & Technical Assistance 24/7</Text>
                        </View>
                    </View>

                    <View style={styles.statusContainer}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Online</Text>
                    </View>
                </LinearGradient>

                {/* Search input */}
                <View style={[
                    styles.searchContainer,
                    {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                    }
                ]}>
                    <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder={activeTab === 'faq' ? "Search for help topics..." : "Search your tickets..."}
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* ══════════════ TAB 1: FAQS & CONTACT CHANNELS ══════════════ */}
                {activeTab === 'faq' && (
                    <>
                        {/* Contact Section */}
                        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>CONTACT US & HELP DESK</Text>
                        <View style={styles.contactGrid}>
                            <TouchableOpacity
                                style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => setShowTicketModal(true)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.contactIconBg, { backgroundColor: '#EFF6FF' }]}>
                                    <Ionicons name="chatbubbles-outline" size={22} color="#1D4ED8" />
                                </View>
                                <Text style={[styles.contactLabel, { color: colors.text }]}>New Ticket</Text>
                                <Text style={[styles.contactSub, { color: '#1D4ED8', fontWeight: '700' }]}>Chat with Admin</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => setActiveTab('tickets')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.contactIconBg, { backgroundColor: '#FDF4FF' }]}>
                                    <Ionicons name="receipt-outline" size={22} color="#A855F7" />
                                </View>
                                <Text style={[styles.contactLabel, { color: colors.text }]}>View My Tickets</Text>
                                <Text style={[styles.contactSub, { color: '#A855F7', fontWeight: '700' }]}>{tickets.length} Logged</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={handleCallHotline}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.contactIconBg, { backgroundColor: '#ECFDF5' }]}>
                                    <Ionicons name="call-outline" size={22} color="#059669" />
                                </View>
                                <Text style={[styles.contactLabel, { color: colors.text }]}>Call Hotline</Text>
                                <Text style={[styles.contactSub, { color: '#059669', fontWeight: '700' }]}>08111783575</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={handleWhatsApp}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.contactIconBg, { backgroundColor: '#F0FDF4' }]}>
                                    <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
                                </View>
                                <Text style={[styles.contactLabel, { color: colors.text }]}>WhatsApp</Text>
                                <Text style={[styles.contactSub, { color: colors.textSecondary }]}>08111783575</Text>
                            </TouchableOpacity>
                        </View>

                        {/* FAQ Section */}
                        <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: 24 }]}>
                            FREQUENTLY ASKED QUESTIONS
                        </Text>

                        <View style={[styles.faqGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            {filteredFAQs.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={{ color: colors.textSecondary }}>No match found for your search.</Text>
                                </View>
                            ) : (
                                filteredFAQs.map((item, index) => {
                                    const isExpanded = expandedId === item.id;
                                    const isLastItem = index === filteredFAQs.length - 1;

                                    return (
                                        <View
                                            key={item.id}
                                            style={[
                                                styles.faqItem,
                                                !isLastItem && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
                                            ]}
                                        >
                                            <TouchableOpacity
                                                style={styles.faqHeader}
                                                onPress={() => toggleExpand(item.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.faqQuestion, { color: colors.text }]}>
                                                    {item.question}
                                                </Text>
                                                <Ionicons
                                                    name={isExpanded ? "remove-circle-outline" : "add-circle-outline"}
                                                    size={22}
                                                    color="#1D4ED8"
                                                />
                                            </TouchableOpacity>

                                            {isExpanded && (
                                                <View style={styles.faqContent}>
                                                    <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                                                        {item.answer}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </>
                )}

                {/* ══════════════ TAB 2: MY TICKETS & CHATS ══════════════ */}
                {activeTab === 'tickets' && (
                    <View style={styles.ticketsSection}>
                        {/* Filter Tabs */}
                        <View style={styles.filterPillsRow}>
                            {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((tab) => {
                                const isSelected = ticketFilter === tab;
                                return (
                                    <TouchableOpacity
                                        key={tab}
                                        style={[
                                            styles.ticketPill,
                                            {
                                                backgroundColor: isSelected ? '#1D4ED8' : colors.card,
                                                borderColor: isSelected ? '#1D4ED8' : colors.border,
                                            }
                                        ]}
                                        onPress={() => setTicketFilter(tab)}
                                    >
                                        <Text style={[styles.ticketPillText, { color: isSelected ? '#FFF' : colors.text }]}>
                                            {tab}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Tickets List */}
                        {ticketsLoading && tickets.length === 0 ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator size="large" color="#1D4ED8" />
                                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading tickets...</Text>
                            </View>
                        ) : filteredTickets.length === 0 ? (
                            <View style={[styles.emptyTicketsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="chatbubbles-outline" size={44} color="#94A3B8" />
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Support Tickets Found</Text>
                                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                                    {searchQuery ? "No tickets matching your filter." : "You have not submitted any support tickets yet."}
                                </Text>
                                <TouchableOpacity
                                    style={styles.createTicketEmptyBtn}
                                    onPress={() => setShowTicketModal(true)}
                                >
                                    <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                                    <Text style={styles.createTicketEmptyBtnText}>Submit New Ticket</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.ticketsList}>
                                {filteredTickets.map((t: SupportTicket) => {
                                    const statusStyle = getStatusStyle(t.status);
                                    return (
                                        <TouchableOpacity
                                            key={t.id}
                                            style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                            onPress={() =>
                                                router.push({
                                                    pathname: '/shared-screens/SupportChatScreen',
                                                    params: { ticketId: t.id }
                                                })
                                            }
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.ticketCardTop}>
                                                <View style={styles.ticketNumWrap}>
                                                    <Text style={styles.ticketCode}>{t.ticket_number}</Text>
                                                    <View style={[styles.catBadge, { backgroundColor: isDark ? '#0c1844' : '#EFF6FF' }]}>
                                                        <Text style={styles.catBadgeText}>{t.category}</Text>
                                                    </View>
                                                </View>

                                                <View style={[styles.ticketStatusBadge, { backgroundColor: statusStyle.bg }]}>
                                                    <Text style={[styles.ticketStatusText, { color: statusStyle.text }]}>
                                                        {statusStyle.label}
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text style={[styles.ticketSubject, { color: colors.text }]} numberOfLines={2}>
                                                {t.subject}
                                            </Text>

                                            {t.last_message && (
                                                <Text style={[styles.ticketLastMsg, { color: colors.textSecondary }]} numberOfLines={2}>
                                                    {t.last_message}
                                                </Text>
                                            )}

                                            <View style={[styles.ticketCardFooter, { borderTopColor: colors.border }]}>
                                                <View style={styles.timeWrap}>
                                                    <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                                                    <Text style={[styles.ticketTimeText, { color: colors.textSecondary }]}>
                                                        {new Date(t.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </Text>
                                                </View>

                                                <View style={styles.openChatCta}>
                                                    <Text style={styles.openChatCtaText}>Open Chat</Text>
                                                    <Ionicons name="chevron-forward" size={14} color="#1D4ED8" />
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* ─── CREATE SUPPORT TICKET MODAL WITH KEYBOARD AVOIDING ─────────────────────────────── */}
            <Modal
                visible={showTicketModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTicketModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                    <Pressable style={{ flex: 1 }} onPress={() => setShowTicketModal(false)} />
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <View style={styles.modalHandle} />
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Submit Support Ticket</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setShowTicketModal(false)}
                            >
                                <Ionicons name="close" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Inquiry Category *</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                                {categories.map((cat) => {
                                    const isSelected = ticketCategory === cat;
                                    return (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[
                                                styles.catPill,
                                                {
                                                    backgroundColor: isSelected ? '#1D4ED8' : colors.background,
                                                    borderColor: isSelected ? '#1D4ED8' : colors.border
                                                }
                                            ]}
                                            onPress={() => setTicketCategory(cat)}
                                        >
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#FFF' : colors.text }}>
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                                <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 0 }]}>Priority Level</Text>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {(['normal', 'urgent', 'low'] as const).map((p) => {
                                        const isSel = ticketPriority === p;
                                        return (
                                            <TouchableOpacity
                                                key={p}
                                                style={[
                                                    styles.priorityPill,
                                                    {
                                                        backgroundColor: isSel
                                                            ? (p === 'urgent' ? '#DC2626' : '#1D4ED8')
                                                            : colors.background,
                                                        borderColor: isSel ? 'transparent' : colors.border,
                                                    }
                                                ]}
                                                onPress={() => setTicketPriority(p)}
                                            >
                                                <Text style={[styles.priorityPillText, { color: isSel ? '#FFF' : colors.text }]}>
                                                    {p.toUpperCase()}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Subject / Issue Title *</Text>
                            <TextInput
                                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="e.g. Cannot unlock property, escrow payout inquiry..."
                                placeholderTextColor={colors.textSecondary}
                                value={ticketSubject}
                                onChangeText={setTicketSubject}
                            />

                            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Description & Details *</Text>
                            <TextInput
                                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="Describe your issue with property ID or reference details if applicable..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={4}
                                value={ticketMessage}
                                onChangeText={setTicketMessage}
                            />

                            <View style={[styles.hotlineNote, { backgroundColor: isDark ? '#0c1844' : '#EFF6FF', borderColor: isDark ? '#1e3a8a' : '#BFDBFE' }]}>
                                <Ionicons name="chatbox-ellipses" size={16} color="#1D4ED8" />
                                <Text style={[styles.hotlineNoteText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                                    Submitting will immediately open a live chat conversation with an Eden Support agent.
                                </Text>
                            </View>
                        </ScrollView>

                        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: '#1D4ED8' }]}
                                onPress={handleSubmitTicket}
                                disabled={isSubmittingTicket}
                            >
                                {isSubmittingTicket ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Submit & Open Live Chat</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    newTicketHeaderBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabBarWrap: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    mainTabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    mainTabBtnActive: {
        borderBottomColor: '#1D4ED8',
    },
    mainTabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    mainTabTextActive: {
        color: '#1D4ED8',
        fontWeight: '700',
    },
    openBadge: {
        backgroundColor: '#DC2626',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    openBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    heroBanner: {
        borderRadius: 20,
        padding: 20,
        height: 96,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        marginBottom: 20,
    },
    decorCircle1: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -20,
        left: 100,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    heroLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    supportIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroTextContainer: {
        flex: 1,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 2,
    },
    heroSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 11,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
    },
    statusText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
        fontWeight: '500',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        fontSize: 13.5,
        fontWeight: '500',
        padding: 0,
    },
    sectionHeader: {
        fontSize: 11.5,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    contactGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    contactCard: {
        width: '48%',
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    contactIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    contactLabel: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    contactSub: {
        fontSize: 10.5,
    },
    faqGroup: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
    },
    faqItem: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    },
    faqQuestion: {
        fontSize: 13.5,
        fontWeight: '700',
        flex: 1,
    },
    faqContent: {
        marginTop: 10,
        paddingRight: 16,
    },
    faqAnswer: {
        fontSize: 12.5,
        lineHeight: 18,
    },
    emptyContainer: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ticketsSection: {},
    filterPillsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    ticketPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
    },
    ticketPillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    loadingBox: {
        paddingVertical: 40,
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
    },
    emptyTicketsCard: {
        padding: 30,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 4,
    },
    emptySub: {
        fontSize: 12.5,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: '85%',
        marginBottom: 8,
    },
    createTicketEmptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1D4ED8',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 14,
        marginTop: 6,
    },
    createTicketEmptyBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
    ticketsList: {
        gap: 12,
    },
    ticketCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        gap: 8,
    },
    ticketCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ticketNumWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ticketCode: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        color: '#1D4ED8',
    },
    catBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    catBadgeText: {
        fontSize: 10.5,
        fontWeight: '600',
        color: '#2563EB',
    },
    ticketStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    ticketStatusText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    ticketSubject: {
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 19,
    },
    ticketLastMsg: {
        fontSize: 12,
        lineHeight: 16,
    },
    ticketCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 10,
        marginTop: 2,
    },
    timeWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ticketTimeText: {
        fontSize: 11,
    },
    openChatCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    openChatCtaText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1D4ED8',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingBottom: 24,
    },
    modalHeader: {
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        position: 'relative',
    },
    modalHandle: {
        width: 36,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    modalCloseBtn: {
        position: 'absolute',
        right: 16,
        top: 14,
        padding: 4,
    },
    modalBody: {
        padding: 20,
        gap: 8,
    },
    inputLabel: {
        fontSize: 12.5,
        fontWeight: '700',
        marginBottom: 4,
    },
    catPill: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 14,
        borderWidth: 1,
    },
    priorityPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
    },
    priorityPillText: {
        fontSize: 10,
        fontWeight: '700',
    },
    textInput: {
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 13,
    },
    textArea: {
        height: 85,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        textAlignVertical: 'top',
    },
    hotlineNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 10,
    },
    hotlineNoteText: {
        fontSize: 11,
        lineHeight: 15,
        flex: 1,
    },
    modalFooter: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    submitBtn: {
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});

export default HelpSupportScreen;
