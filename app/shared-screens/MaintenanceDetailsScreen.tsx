import BackButton from '../../components/BackButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRequests } from '../../hooks/useRequests';
import { useToast } from '../../components/Toast';

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
    const status = request?.status;

    // Step 1: Request submitted
    events.push({
        id: '1',
        title: 'Request Submitted',
        description: 'Your maintenance request was received and is being reviewed.',
        timestamp: request?.created_at
            ? new Date(request.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '',
        status: 'done',
        icon: 'document-text-outline',
    });

    // Step 2: Under Review
    const isReviewed = ['in_progress', 'resolved', 'closed'].includes(status);
    events.push({
        id: '2',
        title: 'Under Review',
        description: 'Our team is reviewing your request and assigning an artisan.',
        timestamp: isReviewed ? 'Completed' : '',
        status: status === 'pending' ? 'active' : (isReviewed ? 'done' : 'pending'),
        icon: 'eye-outline',
    });

    // Step 3: Artisan Assigned
    const isAssigned = ['in_progress', 'resolved', 'closed'].includes(status);
    events.push({
        id: '3',
        title: 'Artisan Assigned',
        description: isAssigned
            ? 'A verified artisan has been assigned to your request.'
            : 'Waiting for an available artisan to be assigned.',
        timestamp: isAssigned ? 'Completed' : '',
        status: status === 'in_progress' ? 'active' : (isAssigned ? 'done' : 'pending'),
        icon: 'person-outline',
    });

    // Step 4: Work In Progress
    const isInProgress = ['in_progress', 'resolved', 'closed'].includes(status);
    events.push({
        id: '4',
        title: 'Work In Progress',
        description: isInProgress
            ? 'The artisan is actively working on your issue.'
            : 'Work will begin once an artisan is assigned.',
        timestamp: ['resolved', 'closed'].includes(status) ? 'Completed' : '',
        status: status === 'in_progress'
            ? 'active'
            : (['resolved', 'closed'].includes(status) ? 'done' : 'pending'),
        icon: 'construct-outline',
    });

    // Step 5: Resolved
    const isResolved = ['resolved', 'closed'].includes(status);
    events.push({
        id: '5',
        title: 'Issue Resolved',
        description: isResolved
            ? 'The maintenance issue has been resolved successfully.'
            : 'Pending completion of work.',
        timestamp: isResolved
            ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : '',
        status: isResolved ? 'done' : 'pending',
        icon: 'checkmark-circle-outline',
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
    const params = useLocalSearchParams<{ id: string; requestData?: string }>();

    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [photoViewer, setPhotoViewer] = useState<string | null>(null);
    const [cancelModal, setCancelModal] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

    const loadRequest = useCallback(async () => {
        // Try to parse from params first (passed from MaintenanceScreen)
        if (params.requestData) {
            try {
                const parsed = JSON.parse(params.requestData);
                setRequest(parsed);
                setLoading(false);
                return;
            } catch {}
        }
        setLoading(false);
    }, [params.requestData]);

    useEffect(() => {
        loadRequest();
    }, [loadRequest]);

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
        router.push('/shared-screens/FindArtisanScreen');
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
            <ScreenWrapper withScrollView={false} style={{ backgroundColor: colors.background }}>
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
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Assigned Artisan</Text>

                        {hasArtisan ? (
                            /* ─── Artisan IS Assigned ─── */
                            <View>
                                <View style={styles.artisanRow}>
                                    <Image
                                        source={{ uri: MOCK_ARTISAN.avatar }}
                                        style={styles.artisanAvatar}
                                        contentFit="cover"
                                    />
                                    <View style={styles.artisanInfo}>
                                        <View style={styles.artisanNameRow}>
                                            <Text style={[styles.artisanName, { color: colors.text }]}>
                                                {MOCK_ARTISAN.name}
                                            </Text>
                                            <View style={styles.vettedBadge}>
                                                <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                                                <Text style={styles.vettedText}>Vetted</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.artisanCategory, { color: colors.textSecondary }]}>
                                            {MOCK_ARTISAN.category}
                                        </Text>
                                        <View style={styles.ratingRow}>
                                            <Ionicons name="star" size={12} color="#F59E0B" />
                                            <Text style={[styles.ratingText, { color: colors.text }]}>
                                                {MOCK_ARTISAN.rating}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {MOCK_ARTISAN.eta && (
                                    <View style={[styles.etaRow, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B30' }]}>
                                        <Ionicons name="time-outline" size={14} color="#F59E0B" />
                                        <Text style={[styles.etaText, { color: '#F59E0B' }]}>{MOCK_ARTISAN.eta}</Text>
                                    </View>
                                )}

                                <View style={styles.artisanActions}>
                                    <TouchableOpacity
                                        style={[styles.callBtn, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}
                                        onPress={() => handleCallArtisan(MOCK_ARTISAN.phone)}
                                    >
                                        <Ionicons name="call-outline" size={16} color="#10B981" />
                                        <Text style={[styles.callBtnText, { color: '#10B981' }]}>Call Artisan</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.msgBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                                        onPress={() => showSuccess('Chat coming soon!')}
                                    >
                                        <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                                        <Text style={[styles.msgBtnText, { color: colors.primary }]}>Message</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : isResolved ? (
                            /* ─── Resolved: artisan completed ─── */
                            <View style={[styles.resolvedArtisanBox, { backgroundColor: '#10B98110', borderColor: '#10B98130' }]}>
                                <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={[styles.resolvedArtisanTitle, { color: '#10B981' }]}>Work Completed</Text>
                                    <Text style={[styles.resolvedArtisanSub, { color: colors.textSecondary }]}>
                                        The artisan has resolved your issue successfully.
                                    </Text>
                                </View>
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

            {/* ── Cancel Confirm Modal ────────────────────────────────── */}
            <Modal
                visible={cancelModal}
                transparent
                animationType="fade"
                onRequestClose={() => setCancelModal(false)}
            >
                <View style={styles.cancelOverlay}>
                    <View style={[styles.cancelContent, { backgroundColor: colors.card }]}>
                        <View style={styles.cancelIconWrap}>
                            <Ionicons name="alert-circle" size={40} color="#EF4444" />
                        </View>
                        <Text style={[styles.cancelTitle, { color: colors.text }]}>Cancel Request?</Text>
                        <Text style={[styles.cancelDesc, { color: colors.textSecondary }]}>
                            Are you sure you want to cancel this maintenance request? This action cannot be undone.
                        </Text>
                        <View style={styles.cancelActions}>
                            <TouchableOpacity
                                style={[styles.cancelNoBtn, { borderColor: colors.border }]}
                                onPress={() => setCancelModal(false)}
                            >
                                <Text style={[styles.cancelNoBtnText, { color: colors.text }]}>Keep Request</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cancelYesBtn}
                                onPress={handleCancelRequest}
                                disabled={cancelLoading}
                            >
                                {cancelLoading
                                    ? <ActivityIndicator color="#FFF" size="small" />
                                    : <Text style={styles.cancelYesBtnText}>Yes, Cancel</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
});

export default MaintenanceDetailsScreen;
