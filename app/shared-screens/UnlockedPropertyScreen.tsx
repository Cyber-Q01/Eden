import BackButton from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useCredits } from '../../hooks/useCredits';
import { useProperty } from '../../hooks/useProperties';
import { callEdgeFunction } from '../../lib/api';

const FALLBACK_AVATAR = { uri: 'https://ui-avatars.com/api/?name=User&size=128&background=2563EB&color=fff' };

const UnlockedPropertyScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    const { property, loading: propertyLoading } = useProperty(id);
    const { unlockProperty, credits } = useCredits();

    const [landlord, setLandlord] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLandlordDetails = async () => {
            if (!id) {
                setLoading(false);
                return;
            }
            const propertyId = Array.isArray(id) ? id[0] : id;
            setLoading(true);
            try {
                const result = await unlockProperty(propertyId);
                if (result.unlocked && result.landlord) {
                    setLandlord(result.landlord);
                }
            } catch (e) {
                console.error('Failed to load landlord details:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchLandlordDetails();
    }, [id]);

    const handleMessageLandlord = async () => {
        if (!landlord?.id) return;
        try {
            const { id: conversationId } = await callEdgeFunction('conversations', 'POST', {
                other_user_id: landlord.id,
            });
            router.push(`/chat/${conversationId}`);
        } catch (e) {
            console.error('Error starting conversation:', e);
        }
    };

    const handleApply = () => {
        if (!property) return;
        const propertyId = Array.isArray(id) ? id[0] : id;
        router.push({
            pathname: '/shared-screens/ApplicationScreen',
            params: {
                id: propertyId,
                title: property.title,
                price: property.price?.toString(),
                location: property.location,
            },
        });
    };

    const formatPrice = (price: number) => `₦${Number(price).toLocaleString()}`;

    const fullName = landlord
        ? `${landlord.first_name || ''} ${landlord.last_name || ''}`.trim() || 'Anonymous'
        : '';

    const memberSince = landlord?.created_at
        ? new Date(landlord.created_at).getFullYear()
        : new Date().getFullYear();

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading || propertyLoading) {
        return (
            <ScreenWrapper style={{ backgroundColor: colors.background }}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Loading property details…
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (!landlord || !property) {
        return (
            <ScreenWrapper style={{ backgroundColor: colors.background }}>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={56} color="#EF4444" />
                    <Text style={[styles.errorTitle, { color: colors.text }]}>
                        Unable to load details
                    </Text>
                    <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
                        Please try again later.
                    </Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.retryBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper style={{ backgroundColor: colors.background }}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <BackButton />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Property Details</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Property Summary Card */}
                <View style={[styles.propertySummaryCard, { backgroundColor: colors.card }]}>
                    <View style={styles.propertySummaryContent}>
                        <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={2}>
                            {property.title}
                        </Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="location-sharp" size={14} color={colors.textSecondary} />
                            <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                                {property.location}
                            </Text>
                        </View>
                        <View style={styles.propertyMeta}>
                            <Text style={[styles.priceText, { color: colors.primary }]}>
                                {formatPrice(property.price)}
                            </Text>
                            <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
                                <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                                    {property.type}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Landlord Details Card */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Landlord Details</Text>
                <View style={[styles.landlordCard, { backgroundColor: colors.card }]}>
                    <View style={styles.landlordHeader}>
                        <Text style={[styles.landlordTitle, { color: colors.text }]}>Property Owner</Text>
                        {landlord.is_verified && (
                            <View style={[styles.verifiedBadge, { backgroundColor: '#E6F9F0' }]}>
                                <Ionicons name="shield-checkmark" size={14} color="#00C853" />
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.landlordContent}>
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                            {landlord.profile_photo ? (
                                <Image
                                    source={{ uri: landlord.profile_photo }}
                                    placeholder={FALLBACK_AVATAR}
                                    style={styles.avatar}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.avatarInitials}>
                                        {fullName.substring(0, 2).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Info */}
                        <View style={styles.landlordInfo}>
                            <Text style={[styles.landlordName, { color: colors.text }]}>{fullName}</Text>

                            <View style={styles.landlordStats}>
                                <View style={styles.statItem}>
                                    <Ionicons name="home" size={14} color={colors.textSecondary} />
                                    <Text style={[styles.statText, { color: colors.textSecondary }]}>
                                        {landlord.listing_count} {landlord.listing_count === 1 ? 'Listing' : 'Listings'}
                                    </Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                                <View style={styles.statItem}>
                                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                                    <Text style={[styles.statText, { color: colors.textSecondary }]}>
                                        Member since {memberSince}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Contact Info */}
                    {landlord.email && (
                        <View style={[styles.contactRow, { borderTopColor: colors.border }]}>
                            <View style={styles.contactItem}>
                                <Ionicons name="mail-outline" size={16} color={colors.primary} />
                                <Text style={[styles.contactText, { color: colors.text }]}>
                                    {landlord.email}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={[styles.bottomActions, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.messageButton, { borderColor: colors.primary }]}
                    onPress={handleMessageLandlord}
                    activeOpacity={0.8}
                >
                    <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                    <Text style={[styles.messageButtonText, { color: colors.primary }]}>Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.applyButton, { backgroundColor: colors.primary }]}
                    onPress={handleApply}
                    activeOpacity={0.85}
                    disabled={property.status !== 'available'}
                >
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={styles.applyButtonText}>
                        {property.status === 'available' ? 'Apply Now' : 'Unavailable'}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },

    // States
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
    loadingText: { fontSize: 14, marginTop: 8 },
    errorTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    errorSub: { fontSize: 14, textAlign: 'center' },
    retryBtn: {
        marginTop: 8, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 14,
    },
    retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '800' },

    // Property Summary
    propertySummaryCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    propertySummaryContent: {
        gap: 8,
    },
    propertyTitle: {
        fontSize: 20,
        fontWeight: '800',
        lineHeight: 28,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 13,
        flex: 1,
    },
    propertyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    priceText: {
        fontSize: 22,
        fontWeight: '800',
    },
    typeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },

    // Landlord Card
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    landlordCard: {
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
        gap: 16,
    },
    landlordHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    landlordTitle: { fontSize: 14, fontWeight: '700' },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    verifiedText: { fontSize: 10, fontWeight: '700', color: '#00C853' },

    landlordContent: {
        flexDirection: 'row',
        gap: 14,
    },
    avatarContainer: {
        width: 64,
        height: 64,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
    },
    landlordInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    landlordName: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
    },
    landlordStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: { fontSize: 12, fontWeight: '500' },
    statDivider: {
        width: 1,
        height: 14,
    },

    // Contact
    contactRow: {
        borderTopWidth: 1,
        paddingTop: 14,
        gap: 10,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    contactText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Bottom Actions
    bottomActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 36,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    messageButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: 16,
        borderWidth: 2,
    },
    messageButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    applyButton: {
        flex: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: 16,
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default UnlockedPropertyScreen;
