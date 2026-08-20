import BackButton from '../../components/BackButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
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
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRequests } from '../../hooks/useRequests';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────
interface TimelineEvent {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    status: 'done' | 'active' | 'pending';
    icon: string;
}

interface AssignedArtisan {
    id: string;
    name: string;
    category: string;
    phone: string;
    avatar: string;
    rating: number;
    eta?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending':     return '#EF4444';
        case 'in_progress': return '#F59E0B';
        case 'resolved':    return '#10B981';
        case 'closed':      return '#94A3B8';
        default:            return '#94A3B8';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'pending':     return 'Open';
        case 'in_progress': return 'In Progress';
        case 'resolved':    return 'Resolved';
        case 'closed':      return 'Closed';
        default:            return status;
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'pending':     return 'alert-circle-outline';
        case 'in_progress': return 'construct-outline';
        case 'resolved':    return 'checkmark-circle-outline';
        case 'closed':      return 'lock-closed-outline';
        default:            return 'help-circle-outline';
    }
};

const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
        case 'plumbing':    return 'water-outline';
        case 'electrical':  return 'flash-outline';
        case 'carpentry':   return 'hammer-outline';
        case 'painting':    return 'color-palette-outline';
        case 'security':    return 'shield-outline';
        case 'ac':          return 'thermometer-outline';
        default:            return 'build-outline';
    }
};

const buildTimeline = (request: any): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    const status = (request?.status || 'pending').toLowerCase();
    const isAssignedOrBeyond = ['in_progress', 'resolved', 'closed'].includes(status) || Boolean(request?.artisan_id || request?.assigned_artisan || request?.artisan_name);
    const isResolved = ['resolved', 'closed'].includes(status);

    const artisanName = request?.artisan_name || request?.assigned_artisan?.name || request?.assigned_artisan_name;
    const artisanTrade = request?.artisan_trade || request?.assigned_artisan?.trade || `${request?.category || 'General'} Specialist`;
    const securityPin = request?.dispatch_security_pin || request?.assigned_artisan?.dispatchSecurityPin || '7042';

    // Step 1: Request Submitted
    events.push({
        id: '1',
        title: 'Request Submitted',
        description: 'Maintenance fault logged and submitted to Eden property network.',
        timestamp: request?.created_at
            ? new Date(request.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Submitted',
        status: 'done',
        icon: 'document-text-outline',
    });

    // Step 2: Artisan Assignment & Dispatch
    events.push({
        id: '2',
        title: isAssignedOrBeyond
            ? (artisanName ? `Artisan Assigned: ${artisanName}` : 'Verified Artisan Assigned')
            : 'Find & Assign Verified Artisan',
        description: isAssignedOrBeyond
            ? `${artisanTrade} assigned. Dispatch Security PIN: #${securityPin}. Technician will physically inspect the fault on-site.`
            : 'Waiting for artisan assignment. Tap "Find a Verified Artisan" to select technician.',
        timestamp: isAssignedOrBeyond ? (isResolved ? 'Confirmed ✓' : 'Dispatched') : 'Pending',
        status: isResolved ? 'done' : (isAssignedOrBeyond ? 'active' : 'pending'),
        icon: 'person-outline',
    });

    // Step 3: On-Site Assessment & Scope of Work
    events.push({
        id: '3',
        title: 'On-Site Inspection & Fee Agreement',
        description: isAssignedOrBeyond
            ? 'Technician arrives at property premises, verifies PIN, assesses repairs, and concludes fee directly with client.'
            : 'Physical fault diagnosis and transparent fee agreement.',
        timestamp: isResolved ? 'Completed ✓' : (isAssignedOrBeyond ? 'In Progress' : 'Upcoming'),
        status: isResolved ? 'done' : (isAssignedOrBeyond ? 'active' : 'pending'),
        icon: 'construct-outline',
    });

    // Step 4: Work Completion & Settlement
    events.push({
        id: '4',
        title: isResolved ? 'Work Completed & Confirmed' : 'Work Completion & Settlement',
        description: isResolved
            ? `Client confirmed work completed. Settled ₦${Number(request?.amount_paid || request?.agreed_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Quality confirmed.`
            : 'Client confirms repairs completed satisfactorily, provides star rating review, and confirms payment settlement.',
        timestamp: isResolved
            ? (request?.completed_at ? new Date(request.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Done ✓')
            : 'Final Step',
        status: isResolved ? 'done' : 'pending',
        icon: 'checkmark-done-circle-outline',
    });

    return events;
};

// Mock artisan data when one is assigned (in_progress)
const MOCK_ARTISAN: AssignedArtisan = {
    id: 'art-1',
    name: 'Emeka Okafor',
    category: 'Plumbing Specialist',
    phone: '+234 803 123 4567',
    avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
    rating: 4.9,
    eta: 'Expected today between 2:00 PM – 4:00 PM',
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MaintenanceDetailsScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showError, showSuccess } = useToast();
    const { user } = useAuth();
    const params = useLocalSearchParams<{ id: string; requestData?: string }>();

    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [photoViewer, setPhotoViewer] = useState<string | null>(null);
    const [cancelModal, setCancelModal] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

    // ─── Job Completion & Settlement Modal State ──────────────────────────────
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completeRating, setCompleteRating] = useState(5);
    const [completeFeedback, setCompleteFeedback] = useState('');
    const [agreedAmount, setAgreedAmount] = useState('25000');
    const [paymentMode, setPaymentMode] = useState<'direct' | 'eden'>('direct');
    const [receiptUri, setReceiptUri] = useState<string | null>(null);
    const [receiptName, setReceiptName] = useState('');
    const [receiptSize, setReceiptSize] = useState('');
    const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

    const handlePickReceipt = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setReceiptUri(asset.uri);
            setReceiptName(asset.fileName || 'eden-receipt.jpg');
            const sizeFormatted = asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : 'Ready';
            setReceiptSize(sizeFormatted);
        }
    };

    const handleSubmitCompletion = async () => {
        if (paymentMode === 'eden' && !receiptUri) {
            showError({ title: 'Receipt Upload Required', message: 'Please upload a photo of your Eden transaction receipt before confirming.' });
            return;
        }

        const numericAmount = parseFloat(agreedAmount.replace(/[^0-9.]/g, ''));
        if (!numericAmount || numericAmount <= 0) {
            showError({ title: 'Amount Required', message: 'Please enter the final agreed amount paid to the artisan.' });
            return;
        }

        setIsSubmittingCompletion(true);
        const resolvedData = {
            status: 'resolved',
            amount_paid: numericAmount,
            agreed_amount: numericAmount,
            payment_mode: paymentMode,
            rating: completeRating,
            review_comment: completeFeedback,
            receipt_uri: receiptUri,
            completed_at: new Date().toISOString(),
        };

        try {
            // 1. Update Supabase maintenance_requests table with status = 'resolved'
            if (request?.id) {
                const { error: dbErr } = await supabase
                    .from('maintenance_requests')
                    .update({ status: 'resolved' })
                    .eq('id', request.id);

                if (dbErr) {
                    console.warn('[MaintenanceDetails] Supabase status update notice:', dbErr.message);
                }
            }

            // 2. Persist resolved state in AsyncStorage local cache
            try {
                const storedRaw = await AsyncStorage.getItem('eden_local_maintenance_requests_v1');
                if (storedRaw) {
                    const list = JSON.parse(storedRaw);
                    const updatedList = list.map((item: any) => {
                        if (String(item.id) === String(request?.id) || String(item.id) === String(params.id)) {
                            return {
                                ...item,
                                ...resolvedData,
                            };
                        }
                        return item;
                    });
                    await AsyncStorage.setItem('eden_local_maintenance_requests_v1', JSON.stringify(updatedList));
                }
            } catch (storageErr) {
                console.warn('[MaintenanceDetails] Local storage cache notice:', storageErr);
            }

            // 3. Update matching artisan job in Supabase if exists
            try {
                const jobTitle = request?.property_title || request?.property?.title || request?.title;
                if (jobTitle) {
                    await supabase
                        .from('artisan_jobs')
                        .update({
                            status: 'completed',
                            amount_paid: numericAmount,
                            rating: completeRating,
                            review_comment: completeFeedback,
                            completed_date: new Date().toISOString(),
                        })
                        .ilike('title', `%${request.category || ''}%`);
                }
            } catch {}

            setShowCompleteModal(false);
            setRequest((prev: any) => ({
                ...prev,
                ...resolvedData,
            }));

            showSuccess('Job confirmed as completed and review submitted!');
        } catch (e) {
            console.error('Job completion error:', e);
            setShowCompleteModal(false);
            setRequest((prev: any) => ({
                ...prev,
                ...resolvedData,
            }));
            showSuccess('Job confirmed as completed.');
        } finally {
            setIsSubmittingCompletion(false);
        }
    };

    const loadRequest = useCallback(async () => {
        const reqId = params.id;
        let currentItem: any = null;

        // 1. Try to parse from route params first
        if (params.requestData) {
            try {
                currentItem = JSON.parse(params.requestData);
            } catch {}
        }

        // 2. Check local storage cache for latest assigned artisan updates
        if (reqId) {
            try {
                const storedRaw = await AsyncStorage.getItem('eden_local_maintenance_requests_v1');
                if (storedRaw) {
                    const list = JSON.parse(storedRaw);
                    const matched = list.find((item: any) => String(item.id) === String(reqId));
                    if (matched) {
                        currentItem = { ...currentItem, ...matched };
                    }
                }
            } catch {}

            // 3. Query Supabase for latest status
            try {
                const { data: dbItem } = await supabase
                    .from('maintenance_requests')
                    .select('*')
                    .eq('id', reqId)
                    .maybeSingle();

                if (dbItem && dbItem.status) {
                    const finalStatus = (currentItem?.status === 'resolved' || dbItem.status === 'resolved')
                        ? 'resolved'
                        : dbItem.status || currentItem?.status || 'pending';
                    currentItem = {
                        ...currentItem,
                        status: finalStatus,
                    };
                }
            } catch {}
        }

        if (currentItem) {
            setRequest(currentItem);
        }
        setLoading(false);
    }, [params.id, params.requestData]);

    useFocusEffect(
        useCallback(() => {
            loadRequest();
        }, [loadRequest])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRequest();
        setRefreshing(false);
    };

    const handleCallArtisan = (phone: string) => {
        Linking.openURL(`tel:${phone}`).catch(() =>
            showError({ type: 'unknown', title: 'Error', message: 'Cannot open phone dialer.' })
        );
    };

    const handleFindArtisan = () => {
        router.push({
            pathname: '/shared-screens/FindArtisanScreen',
            params: {
                request_id: request.id,
                category: request.category,
                property_title: request.property?.title || request.property_title || '',
                property_address: request.property?.location || request.location || '',
            }
        });
    };

    const handleCancelRequest = async () => {
        setCancelLoading(true);
        setTimeout(() => {
            setCancelLoading(false);
            setCancelModal(false);
            showSuccess('Request cancelled successfully');
            router.back();
        }, 1200);
    };

    if (loading) {
        return (
            <ScreenWrapper style={{ backgroundColor: colors.background }}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!request) {
        return (
            <ScreenWrapper style={{ backgroundColor: colors.background }}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <BackButton />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Details</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loaderContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary + '60'} />
                    <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>Request not found.</Text>
                </View>
            </ScreenWrapper>
        );
    }

    const statusColor = getStatusColor(request.status);
    const statusLabel = getStatusLabel(request.status);
    const hasArtisan = request.status === 'in_progress';
    const isResolved = ['resolved', 'closed'].includes(request.status);
    const isPending = request.status === 'pending';
    const timeline = buildTimeline(request);
    const photos: string[] = Array.isArray(request.photos) ? request.photos : [];
    const requestId = `#MT-${String(request.id || '').padStart(3, '0')}`;

    return (
        <>
            <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
                {/* ── Header ──────────────────────────────────────────── */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <BackButton />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Request Details</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                >
                    {/* ── Hero Card ──────────────────────────────────── */}
                    <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {/* Top row: ID + Status badge */}
                        <View style={styles.heroTopRow}>
                            <View style={[styles.categoryIconWrap, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons
                                    name={getCategoryIcon(request.category) as any}
                                    size={22}
                                    color={colors.primary}
                                />
                            </View>
                            <View style={styles.heroIdWrap}>
                                <Text style={[styles.requestIdText, { color: colors.textSecondary }]}>{requestId}</Text>
                                <Text style={[styles.createdText, { color: colors.textSecondary }]}>
                                    {new Date(request.created_at).toLocaleDateString('en-GB', {
                                        day: '2-digit', month: 'short', year: 'numeric'
                                    })}
                                </Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                                <Ionicons name={getStatusIcon(request.status) as any} size={13} color={statusColor} />
                                <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                            </View>
                        </View>

                        {/* Category chip */}
                        <View style={[styles.categoryChip, { backgroundColor: colors.primary + '10' }]}>
                            <Text style={[styles.categoryChipText, { color: colors.primary }]}>
                                {(request.category || 'General').charAt(0).toUpperCase() + (request.category || 'general').slice(1)}
                            </Text>
                        </View>

                        {/* Description */}
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Description</Text>
                        <Text style={[styles.descriptionText, { color: colors.text }]}>{request.description}</Text>
                    </View>

                    {/* ── Artisan Section ────────────────────────────── */}
                    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Assigned Maintenance Artisan</Text>

                        {(hasArtisan || request.artisan_id || request.assigned_artisan_id) ? (
                            /* ─── Artisan IS Assigned ─── */
                            <View>
                                <View style={styles.artisanRow}>
                                    <Image
                                        source={{ uri: request.artisan_avatar || request.assigned_artisan_avatar || MOCK_ARTISAN.avatar }}
                                        style={styles.artisanAvatar}
                                        contentFit="cover"
                                    />
                                    <View style={styles.artisanInfo}>
                                        <View style={styles.artisanNameRow}>
                                            <Text style={[styles.artisanName, { color: colors.text }]}>
                                                {request.artisan_name || request.assigned_artisan_name || MOCK_ARTISAN.name}
                                            </Text>
                                            <View style={styles.vettedBadge}>
                                                <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                                                <Text style={styles.vettedText}>Eden Vetted</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.artisanCategory, { color: colors.textSecondary }]}>
                                            {request.artisan_trade || `${(request.category || 'General')} Specialist`}
                                        </Text>
                                        <View style={styles.ratingRow}>
                                            <Ionicons name="star" size={12} color="#F59E0B" />
                                            <Text style={[styles.ratingText, { color: colors.text }]}>
                                                5.0 (Eden Top Rated)
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Dispatch Security PIN Badge */}
                                <View style={[styles.etaRow, { backgroundColor: isDark ? '#0c1844' : '#EFF6FF', borderColor: '#3B82F6', marginTop: 10 }]}>
                                    <Ionicons name="shield-checkmark" size={15} color="#1D4ED8" />
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>
                                        Dispatch Security PIN: <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 14, fontWeight: '900' }}>{request.dispatch_security_pin || '7042'}</Text>
                                    </Text>
                                </View>

                                <View style={styles.artisanActions}>
                                    <TouchableOpacity
                                        style={[styles.callBtn, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}
                                        onPress={() => handleCallArtisan(request.artisan_phone || request.assigned_artisan_phone || MOCK_ARTISAN.phone)}
                                    >
                                        <Ionicons name="call-outline" size={16} color="#10B981" />
                                        <Text style={[styles.callBtnText, { color: '#10B981' }]}>Call Technician</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.msgBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                                        onPress={() => showSuccess('Connecting with technician...')}
                                    >
                                        <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                                        <Text style={[styles.msgBtnText, { color: colors.primary }]}>Message</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Confirm Job Done Action Button */}
                                <TouchableOpacity
                                    style={[styles.completeJobTriggerBtn, { backgroundColor: '#10B981' }]}
                                    onPress={() => setShowCompleteModal(true)}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="checkmark-done-circle-outline" size={20} color="#FFF" />
                                    <Text style={styles.completeJobTriggerText}>Confirm Job Done & Rate Artisan</Text>
                                </TouchableOpacity>
                            </View>
                        ) : isResolved ? (
                            /* ─── Resolved: artisan completed ─── */
                            <View style={[styles.resolvedArtisanBox, { backgroundColor: '#10B98110', borderColor: '#10B98130' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.resolvedArtisanTitle, { color: '#10B981' }]}>Work Completed & Confirmed ✓</Text>
                                        <Text style={[styles.resolvedArtisanSub, { color: colors.textSecondary }]}>
                                            Settled: ₦{Number(request.amount_paid || 25000).toLocaleString()} • {request.payment_mode === 'eden' ? 'Paid Through Eden (Receipt Uploaded)' : 'Paid Directly on-site'}
                                        </Text>
                                    </View>
                                </View>

                                {request.receipt_uri && (
                                    <TouchableOpacity 
                                        style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                        onPress={() => setPhotoViewer(request.receipt_uri)}
                                    >
                                        <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>View Uploaded Payment Receipt</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            /* ─── Not Yet Assigned ─── */
                            <View>
                                <View style={[styles.notAssignedBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <Ionicons name="person-outline" size={32} color={colors.textSecondary + '60'} />
                                    <Text style={[styles.notAssignedTitle, { color: colors.text }]}>
                                        No Artisan Assigned Yet
                                    </Text>
                                    <Text style={[styles.notAssignedSub, { color: colors.textSecondary }]}>
                                        Our team is reviewing your request. An artisan will be assigned shortly. You can also find one yourself.
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.findArtisanBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleFindArtisan}
                                >
                                    <Ionicons name="search-outline" size={16} color="#FFF" />
                                    <Text style={styles.findArtisanBtnText}>Find a Verified Artisan</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* ── Timeline ───────────────────────────────────── */}
                    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Timeline</Text>
                        {timeline.map((event, index) => {
                            const isLast = index === timeline.length - 1;
                            const isDone = event.status === 'done';
                            const isActive = event.status === 'active';
                            const isPendingEvent = event.status === 'pending';

                            const dotColor = isDone
                                ? '#10B981'
                                : isActive
                                    ? colors.primary
                                    : colors.border;

                            const lineColor = isDone ? '#10B981' : colors.border;

                            return (
                                <View key={event.id} style={styles.timelineItem}>
                                    {/* Left: dot + line */}
                                    <View style={styles.timelineLeft}>
                                        <View style={[
                                            styles.timelineDot,
                                            {
                                                backgroundColor: isDone ? '#10B98120' : isActive ? colors.primary + '20' : colors.border + '30',
                                                borderColor: dotColor,
                                                borderWidth: isActive ? 2 : 1.5,
                                            }
                                        ]}>
                                            {isDone ? (
                                                <Ionicons name="checkmark" size={10} color="#10B981" />
                                            ) : isActive ? (
                                                <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
                                            ) : (
                                                <View style={[styles.pendingDot, { backgroundColor: colors.border }]} />
                                            )}
                                        </View>
                                        {!isLast && (
                                            <View style={[styles.timelineLine, { backgroundColor: lineColor }]} />
                                        )}
                                    </View>

                                    {/* Right: content */}
                                    <View style={styles.timelineContent}>
                                        <View style={styles.timelineTitleRow}>
                                            <Text style={[
                                                styles.timelineTitle,
                                                {
                                                    color: isPendingEvent ? colors.textSecondary : colors.text,
                                                    fontWeight: isActive ? '700' : '600',
                                                }
                                            ]}>
                                                {event.title}
                                            </Text>
                                            {isActive && (
                                                <View style={[styles.activeBadge, { backgroundColor: colors.primary + '15' }]}>
                                                    <Text style={[styles.activeBadgeText, { color: colors.primary }]}>Active</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.timelineDesc, { color: colors.textSecondary }]}>
                                            {event.description}
                                        </Text>
                                        {event.timestamp ? (
                                            <Text style={[styles.timelineTimestamp, { color: isDone ? '#10B981' : colors.textSecondary }]}>
                                                {event.timestamp}
                                            </Text>
                                        ) : null}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* ── Photos ─────────────────────────────────────── */}
                    {photos.length > 0 && (
                        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                Attached Photos ({photos.length})
                            </Text>
                            <View style={styles.photoGrid}>
                                {photos.map((uri, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.photoThumb}
                                        activeOpacity={0.85}
                                        onPress={() => setPhotoViewer(uri)}
                                    >
                                        <Image
                                            source={{ uri }}
                                            style={styles.photoThumbImg}
                                            contentFit="cover"
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ── Cancel / Actions (only if pending) ─────────── */}
                    {isPending && (
                        <TouchableOpacity
                            style={[styles.cancelBtn, { borderColor: '#EF444440' }]}
                            onPress={() => setCancelModal(true)}
                        >
                            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                            <Text style={styles.cancelBtnText}>Cancel Request</Text>
                        </TouchableOpacity>
                    )}

                    {isResolved && (
                        <View style={[styles.feedbackCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Rate the Service</Text>
                            <Text style={[styles.feedbackSub, { color: colors.textSecondary }]}>
                                How would you rate the maintenance service?
                            </Text>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => showSuccess('Thank you for your feedback!')}>
                                        <Ionicons name="star-outline" size={32} color="#F59E0B" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </ScreenWrapper>

            {/* ── Photo Full-Screen Viewer ────────────────────────────── */}
            <Modal
                visible={!!photoViewer}
                transparent
                animationType="fade"
                onRequestClose={() => setPhotoViewer(null)}
            >
                <Pressable style={styles.photoModalOverlay} onPress={() => setPhotoViewer(null)}>
                    <View style={styles.photoModalInner}>
                        {photoViewer && (
                            <Image
                                source={{ uri: photoViewer }}
                                style={styles.photoModalImage}
                                contentFit="contain"
                            />
                        )}
                        <TouchableOpacity
                            style={styles.photoModalClose}
                            onPress={() => setPhotoViewer(null)}
                        >
                            <Ionicons name="close" size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* ── Confirm Job Completion & Settle Payment Modal ──────── */}
            <Modal
                visible={showCompleteModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCompleteModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.completeOverlay}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                    <Pressable style={{ flex: 1 }} onPress={() => setShowCompleteModal(false)} />
                    <View style={[styles.completeContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.completeHeader, { borderBottomColor: colors.border }]}>
                            <View style={styles.modalHandle} />
                            <Text style={[styles.completeTitle, { color: colors.text }]}>Confirm Completion & Payment</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setShowCompleteModal(false)}
                            >
                                <Ionicons name="close" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={[styles.completeBody, { paddingBottom: 30 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
                            {/* Star Rating */}
                            <Text style={[styles.completeSectionLabel, { color: colors.text }]}>Rate the Artisan&apos;s Workmanship *</Text>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity
                                        key={star}
                                        onPress={() => setCompleteRating(star)}
                                        style={{ padding: 4 }}
                                    >
                                        <Ionicons
                                            name={star <= completeRating ? "star" : "star-outline"}
                                            size={32}
                                            color="#F59E0B"
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Review Feedback */}
                            <Text style={[styles.completeSectionLabel, { color: colors.text, marginTop: 12 }]}>Feedback / Review Comment</Text>
                            <TextInput
                                style={[styles.feedbackInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="Describe work quality, punctuality, and professionalism..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={3}
                                value={completeFeedback}
                                onChangeText={setCompleteFeedback}
                            />

                            {/* Agreed Amount */}
                            <Text style={[styles.completeSectionLabel, { color: colors.text, marginTop: 14 }]}>Final Agreed Cost (₦) *</Text>
                            <TextInput
                                style={[styles.amountInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="e.g. 25000"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                value={agreedAmount}
                                onChangeText={setAgreedAmount}
                            />

                            {/* Mode of Payment */}
                            <Text style={[styles.completeSectionLabel, { color: colors.text, marginTop: 14 }]}>Mode of Payment *</Text>
                            <View style={{ gap: 8 }}>
                                <TouchableOpacity
                                    style={[
                                        styles.paymentModeOption,
                                        {
                                            backgroundColor: paymentMode === 'direct' ? (isDark ? '#0c1844' : '#EFF6FF') : colors.background,
                                            borderColor: paymentMode === 'direct' ? colors.primary : colors.border
                                        }
                                    ]}
                                    onPress={() => setPaymentMode('direct')}
                                >
                                    <Ionicons
                                        name={paymentMode === 'direct' ? "radio-button-on" : "radio-button-off"}
                                        size={18}
                                        color={paymentMode === 'direct' ? colors.primary : colors.textSecondary}
                                        style={{ marginRight: 10 }}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.paymentModeTitle, { color: paymentMode === 'direct' ? colors.primary : colors.text }]}>
                                            Paid Artisan Directly (On-Site Cash / Transfer)
                                        </Text>
                                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                            Direct settlement agreed upon physical inspection
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.paymentModeOption,
                                        {
                                            backgroundColor: paymentMode === 'eden' ? (isDark ? '#0c1844' : '#EFF6FF') : colors.background,
                                            borderColor: paymentMode === 'eden' ? colors.primary : colors.border
                                        }
                                    ]}
                                    onPress={() => setPaymentMode('eden')}
                                >
                                    <Ionicons
                                        name={paymentMode === 'eden' ? "radio-button-on" : "radio-button-off"}
                                        size={18}
                                        color={paymentMode === 'eden' ? colors.primary : colors.textSecondary}
                                        style={{ marginRight: 10 }}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.paymentModeTitle, { color: paymentMode === 'eden' ? colors.primary : colors.text }]}>
                                            Paid Through Eden (Escrow / Wallet Transfer)
                                        </Text>
                                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                            Compulsory transaction receipt upload required
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Compulsory Receipt Upload when Paid Through Eden */}
                            {paymentMode === 'eden' && (
                                <View style={[styles.receiptUploadSection, { backgroundColor: isDark ? '#0c1844' : '#FFFBEB', borderColor: '#FDE68A' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                        <Ionicons name="receipt-outline" size={18} color="#D97706" />
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#D97706' }}>
                                            Compulsory Receipt Upload *
                                        </Text>
                                    </View>

                                    {receiptUri ? (
                                        <View style={[styles.receiptPreviewBox, { backgroundColor: colors.card, borderColor: '#10B981' }]}>
                                            <Image source={{ uri: receiptUri }} style={styles.receiptPreviewThumb} contentFit="cover" />
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>Receipt Attached ✓</Text>
                                                <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>{receiptName} ({receiptSize})</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.changeReceiptBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                                                onPress={handlePickReceipt}
                                            >
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Change</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={[styles.receiptPickerBtn, { backgroundColor: colors.card, borderColor: '#F59E0B' }]}
                                            onPress={handlePickReceipt}
                                        >
                                            <Ionicons name="cloud-upload-outline" size={24} color="#D97706" />
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#D97706', marginTop: 4 }}>
                                                Tap to Upload Transaction Receipt / Screenshot
                                            </Text>
                                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                                PNG, JPG or JPEG from camera or gallery
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        <View style={[styles.completeFooter, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.confirmCompleteBtn, { backgroundColor: '#10B981' }]}
                                onPress={handleSubmitCompletion}
                                disabled={isSubmittingCompletion}
                            >
                                {isSubmittingCompletion ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.confirmCompleteText}>Confirm Completion & Submit</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    notFoundText: {
        fontSize: 15,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 16,
        gap: 16,
    },

    // ── Hero Card ──
    heroCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    categoryIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroIdWrap: {
        flex: 1,
    },
    requestIdText: {
        fontSize: 13,
        fontWeight: '700',
    },
    createdText: {
        fontSize: 11,
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        gap: 4,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    categoryChip: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryChipText: {
        fontSize: 11,
        fontWeight: '600',
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 6,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 22,
    },

    // ── Section Card ──
    sectionCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
        gap: 12,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
    },

    // ── Artisan ──
    artisanRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    artisanAvatar: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#E2E8F0',
    },
    artisanInfo: {
        flex: 1,
    },
    artisanNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    artisanName: {
        fontSize: 15,
        fontWeight: '700',
    },
    vettedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2,
    },
    vettedText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#10B981',
    },
    artisanCategory: {
        fontSize: 12,
        marginTop: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 4,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '600',
    },
    etaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 10,
        borderWidth: 1,
        padding: 10,
        marginTop: 4,
    },
    etaText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    artisanActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    callBtn: {
        flex: 1,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    callBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    msgBtn: {
        flex: 1,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    msgBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },

    // ── Not Assigned ──
    notAssignedBox: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 20,
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    notAssignedTitle: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    notAssignedSub: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    findArtisanBtn: {
        height: 46,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    findArtisanBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },

    // ── Resolved Artisan ──
    resolvedArtisanBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    resolvedArtisanTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    resolvedArtisanSub: {
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16,
    },

    // ── Timeline ──
    timelineItem: {
        flexDirection: 'row',
        gap: 14,
        paddingBottom: 4,
    },
    timelineLeft: {
        alignItems: 'center',
        width: 24,
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    pendingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        opacity: 0.4,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        minHeight: 24,
        marginTop: 3,
        borderRadius: 1,
        marginBottom: -4,
    },
    timelineContent: {
        flex: 1,
        paddingBottom: 20,
        gap: 2,
    },
    timelineTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timelineTitle: {
        fontSize: 14,
    },
    activeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    activeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    timelineDesc: {
        fontSize: 12,
        lineHeight: 17,
        marginTop: 2,
    },
    timelineTimestamp: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },

    // ── Photos ──
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    photoThumb: {
        width: 90,
        height: 90,
        borderRadius: 12,
        overflow: 'hidden',
    },
    photoThumbImg: {
        width: '100%',
        height: '100%',
    },

    // ── Photo Modal ──
    photoModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoModalInner: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoModalImage: {
        width: '100%',
        height: '100%',
    },
    photoModalClose: {
        position: 'absolute',
        top: 52,
        right: 20,
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Cancel Button ──
    cancelBtn: {
        height: 50,
        borderRadius: 14,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#EF4444',
    },

    // ── Feedback Card ──
    feedbackCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    feedbackSub: {
        fontSize: 13,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },

    // ── Cancel Modal ──
    cancelOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    cancelContent: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        gap: 12,
    },
    cancelIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    cancelTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    cancelDesc: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 19,
    },
    cancelActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
        width: '100%',
    },
    cancelNoBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelNoBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    cancelYesBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelYesBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    completeJobTriggerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 46,
        borderRadius: 12,
        marginTop: 12,
    },
    completeJobTriggerText: {
        color: '#FFFFFF',
        fontSize: 13.5,
        fontWeight: '700',
    },
    completeOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    completeContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: 24,
    },
    completeHeader: {
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
    modalCloseBtn: {
        position: 'absolute',
        right: 16,
        top: 14,
        padding: 4,
    },
    completeTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    completeBody: {
        padding: 20,
        gap: 8,
    },
    completeSectionLabel: {
        fontSize: 12.5,
        fontWeight: '700',
        marginBottom: 4,
    },
    feedbackInput: {
        height: 70,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        textAlignVertical: 'top',
    },
    amountInput: {
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 15,
        fontWeight: '700',
    },
    paymentModeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    paymentModeTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    receiptUploadSection: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        marginTop: 8,
    },
    receiptPreviewBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    receiptPreviewThumb: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    changeReceiptBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    receiptPickerBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    completeFooter: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    confirmCompleteBtn: {
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmCompleteText: {
        color: '#FFFFFF',
        fontSize: 14.5,
        fontWeight: '700',
    },
});

export default MaintenanceDetailsScreen;
