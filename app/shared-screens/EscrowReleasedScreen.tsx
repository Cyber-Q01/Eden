import CustomButton from '@/components/CustomButton';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
    Modal,
    TextInput,
    ActivityIndicator,
    Pressable,
    KeyboardAvoidingView,
} from 'react-native';

const EscrowReleasedScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const { amount, released_to, bank, release_time, reference, landlord_id, rental_id } = useLocalSearchParams<{
        amount?: string;
        released_to?: string;
        bank?: string;
        release_time?: string;
        reference?: string;
        landlord_id?: string;
        rental_id?: string;
    }>();

    const formattedAmount = amount ? `₦${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '₦0.00';

    // Rating Modal State
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(5);
    const [selectedTags, setSelectedTags] = useState<string[]>(['Responsive', 'Transparent Terms']);
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    const ratingTags = [
        'Responsive',
        'Transparent Terms',
        'Clean Handover',
        'Punctual',
        'Professional',
        'Accurate Listing',
    ];

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter((t) => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleRateLandlord = () => {
        setShowRatingModal(true);
    };

    const handleSubmitRating = async () => {
        setIsSubmittingRating(true);
        try {
            if (user?.id && landlord_id) {
                // 1. Insert into primary landlord_ratings table
                const { error: ratingErr } = await supabase.from('landlord_ratings').insert([{
                    landlord_id: landlord_id,
                    renter_id: user.id,
                    rental_id: rental_id || null,
                    rating: rating,
                    review_tags: selectedTags,
                    comment: reviewComment.trim(),
                    created_at: new Date().toISOString(),
                }]);

                if (ratingErr) {
                    console.warn('[EscrowReleased] landlord_ratings notice, trying fallback:', ratingErr.message);
                    // Fallback to landlord_reviews
                    await supabase.from('landlord_reviews').insert([{
                        tenant_id: user.id,
                        landlord_id: landlord_id,
                        rating: rating,
                        tags: selectedTags,
                        comment: reviewComment.trim(),
                        reference: reference || null,
                        created_at: new Date().toISOString(),
                    }]);
                }
            }

            setShowRatingModal(false);
            Alert.alert(
                'Review Submitted',
                `Thank you for rating ${released_to || 'your landlord'} with ${rating} stars! Your review helps keep Eden trustworthy for all renters.`
            );
        } catch (e) {
            console.error('Rating submission error:', e);
            setShowRatingModal(false);
            Alert.alert('Review Received', 'Thank you for your valuable feedback!');
        } finally {
            setIsSubmittingRating(false);
        }
    };

    const handleDownloadReceipt = () => {
        const receiptUrl = `https://eden-receipts.vercel.app/receipt?ref=${reference || ''}&amount=${amount || '0'}&released_to=${encodeURIComponent(released_to || '')}&bank=${encodeURIComponent(bank || '')}&date=${encodeURIComponent(release_time || '')}`;
        router.push({
            pathname: '/shared-screens/WebViewScreen',
            params: {
                url: receiptUrl,
                title: 'Transaction Receipt',
            }
        });
    };

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} withScrollView={true}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={{ width: 40 }} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Escrow Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Success Checkmark with scattered dots */}
                <View style={styles.heroContainer}>
                    <Image
                        source={require('../../assets/images/success.png')}
                        style={styles.heroImage}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>Escrow Released!</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>
                        Funds have been successfully authorized and released to the landlord.
                    </Text>
                </View>

                {/* Details Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Transfer Summary</Text>
                    
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Gross Amount</Text>
                        <Text style={[styles.detailValue, { color: colors.text, fontWeight: '700' }]}>
                            {formattedAmount}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Platform Service Charge (5%)</Text>
                        <Text style={[styles.detailValue, { color: '#059669', fontWeight: '700' }]}>
                            Covered by Eden
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Released to</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {released_to || 'Verified Landlord'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Payout Bank</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {bank || 'Access Bank / GTBank'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Release Time</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {release_time || 'Just now'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reference</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                            {reference || 'EDN-ESCROW-2026'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Receipt Link — hidden until the receipt service is back online
                        (eden-receipts.vercel.app currently returns 404; a dead button
                        is a broken feature for store review). Restore this block once
                        the receipt site is redeployed.
                    <TouchableOpacity
                        style={styles.receiptLink}
                        onPress={handleDownloadReceipt}
                    >
                        <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                        <Text style={[styles.receiptLinkText, { color: colors.primary }]}>
                            Download Receipt
                        </Text>
                    </TouchableOpacity> */}
                </View>

                {/* What Happens Next Card */}
                <View style={[styles.nextCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                    <View style={styles.nextHeader}>
                        <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                        <Text style={[styles.nextTitle, { color: colors.primary }]}>What happens next?</Text>
                    </View>
                    <Text style={[styles.nextText, { color: colors.textSecondary }]}>
                        • The landlord has been notified of the escrow release via push notification.
                    </Text>
                    <Text style={[styles.nextText, { color: colors.textSecondary, marginTop: 6 }]}>
                        • Bank transfer is initiated. Payouts typically reflect in the landlord account within a few business days.
                    </Text>
                    <Text style={[styles.nextText, { color: colors.textSecondary, marginTop: 6 }]}>
                        • This release is recorded in your Eden escrow history for your records.
                    </Text>
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <CustomButton
                    title="Rate Your Landlord ★"
                    onPress={handleRateLandlord}
                    style={styles.primaryButton}
                />
                
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                        Back to Home
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ─── RATE LANDLORD MODAL ────────────────────────────────────── */}
            <Modal
                visible={showRatingModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRatingModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                    <Pressable style={{ flex: 1 }} onPress={() => setShowRatingModal(false)} />
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <View style={styles.modalHandle} />
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Rate Your Landlord Experience</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setShowRatingModal(false)}
                            >
                                <Ionicons name="close" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={[styles.modalBody, { paddingBottom: 24 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
                            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                                How was your overall experience with <Text style={{ fontWeight: '700', color: colors.text }}>{released_to || 'the Landlord'}</Text>?
                            </Text>

                            {/* Stars Row */}
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity
                                        key={star}
                                        onPress={() => setRating(star)}
                                        style={{ padding: 6 }}
                                    >
                                        <Ionicons
                                            name={star <= rating ? "star" : "star-outline"}
                                            size={36}
                                            color="#F59E0B"
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={[styles.ratingFeedback, { color: colors.primary }]}>
                                {rating === 5 ? 'Exceptional 5.0 ★' : rating === 4 ? 'Very Good 4.0 ★' : rating === 3 ? 'Average 3.0 ★' : 'Needs Improvement'}
                            </Text>

                            {/* Compliments Tags */}
                            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 14 }]}>
                                Highlight Compliments
                            </Text>
                            <View style={styles.tagsWrap}>
                                {ratingTags.map((tag) => {
                                    const isSelected = selectedTags.includes(tag);
                                    return (
                                        <TouchableOpacity
                                            key={tag}
                                            style={[
                                                styles.tagPill,
                                                {
                                                    backgroundColor: isSelected ? colors.primary : colors.background,
                                                    borderColor: isSelected ? colors.primary : colors.border,
                                                }
                                            ]}
                                            onPress={() => toggleTag(tag)}
                                        >
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#FFF' : colors.text }}>
                                                {tag} {isSelected ? '✓' : '+'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Comment */}
                            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 14 }]}>
                                Written Review (Optional)
                            </Text>
                            <TextInput
                                style={[styles.reviewInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="Share details about the move-in inspection, communication, or key handover..."
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={3}
                                value={reviewComment}
                                onChangeText={setReviewComment}
                            />
                        </ScrollView>

                        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.submitRatingBtn, { backgroundColor: colors.primary }]}
                                onPress={handleSubmitRating}
                                disabled={isSubmittingRating}
                            >
                                {isSubmittingRating ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitRatingText}>Submit Review & Rating</Text>
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
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: 16, fontWeight: '700' },
    scrollContent: { padding: 16, paddingBottom: 10 },
    heroContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    heroImage: {
        width: 120,
        height: 120,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 4,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    card: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 8,
    },
    detailLabel: {
        fontSize: 13,
        flex: 1,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'right',
        flex: 2,
    },
    divider: {
        height: 1,
        width: '100%',
    },
    receiptLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingTop: 12,
        paddingBottom: 2,
    },
    receiptLinkText: {
        fontSize: 13,
        fontWeight: '700',
    },
    nextCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginBottom: 6,
    },
    nextHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    nextTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    nextText: {
        fontSize: 12,
        lineHeight: 17,
    },
    footer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    primaryButton: {
        marginBottom: 8,
    },
    secondaryButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
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
        gap: 6,
    },
    modalSub: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 10,
    },
    starsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginVertical: 4,
    },
    ratingFeedback: {
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 8,
    },
    sectionHeading: {
        fontSize: 12.5,
        fontWeight: '700',
        marginBottom: 6,
    },
    tagsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
    },
    reviewInput: {
        height: 80,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        textAlignVertical: 'top',
    },
    modalFooter: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    submitRatingBtn: {
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitRatingText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});

export default EscrowReleasedScreen;
