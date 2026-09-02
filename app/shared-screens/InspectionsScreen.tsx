import BackButton from '@/components/BackButton';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useInspections, InspectionBooking } from '../../hooks/useInspections';

// All inspection cards render COLLAPSED (no expand/collapse dropdown).
// The vital info — property, date & time, renter — is always visible on the card.

const InspectionsScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { role } = useAuth();
    const { inspections, loading, fetchInspections } = useInspections();

    useEffect(() => {
        fetchInspections();
    }, [fetchInspections]);

    const openBookingConfirmation = (item: InspectionBooking) => {
        const dateStr = new Date(item.preferred_date).toLocaleDateString('en-NG', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        const landlordName = (item.property as any)?.landlord
            ? `${(item.property as any).landlord.first_name || ''} ${(item.property as any).landlord.last_name || ''}`.trim()
            : 'Landlord';

        // Combine preferred_date and preferred_time into an ISO string
        const bookingDate = new Date(item.preferred_date);
        const timeParts = item.preferred_time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeParts) {
            let hours = parseInt(timeParts[1]);
            const minutes = parseInt(timeParts[2]);
            const ampm = timeParts[3];
            if (ampm) {
                if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
            }
            bookingDate.setHours(hours);
            bookingDate.setMinutes(minutes);
        }

        router.push({
            pathname: '/shared-screens/BookingConfirmationScreen',
            params: {
                property_id: item.property_id,
                date: dateStr,
                time: item.preferred_time + ' WAT',
                property: item.property?.title || '',
                address: item.property?.location || '',
                landlord: landlordName,
                raw_date: bookingDate.toISOString(),
            }
        });
    };

    const renderItem = ({ item }: { item: InspectionBooking }) => {
        const propertyImage = item.property?.images?.[0];
        const dateLabel = new Date(item.preferred_date).toLocaleDateString('en-NG', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });

        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Header: property + date/time + status (tenants tap to open booking details) */}
                <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={role === 'TENANT' ? () => openBookingConfirmation(item) : undefined}
                    activeOpacity={role === 'TENANT' ? 0.7 : 1}
                    disabled={role !== 'TENANT'}
                >
                    <View style={styles.propertyInfo}>
                        {propertyImage ? (
                            <Image source={{ uri: propertyImage }} style={styles.thumb} />
                        ) : (
                            <View style={[styles.thumb, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons name="home-outline" size={20} color={colors.textSecondary} />
                            </View>
                        )}
                        <View style={styles.headerText}>
                            <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>
                                {item.property?.title || 'Unknown Property'}
                            </Text>
                            <View style={styles.dateTimeRow}>
                                <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                                <Text style={[styles.dateTime, { color: colors.text }]}>
                                    {dateLabel} at {item.preferred_time}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'confirmed' ? '#E8F5E9' : '#FFF3E0' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'confirmed' ? '#2E7D32' : '#E65100' }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Location — always visible */}
                <View style={styles.bodyRow}>
                    <Ionicons name="location-outline" size={15} color={colors.primary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.property?.location}
                    </Text>
                </View>

                {/* Renter — always visible (landlord) */}
                {role === 'LANDLORD' && item.renter && (
                    <View style={[styles.renterCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={styles.renterHeader}>
                            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                                {item.renter.profile_photo ? (
                                    <Image source={{ uri: item.renter.profile_photo }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                                        {item.renter.first_name[0]}
                                    </Text>
                                )}
                            </View>
                            <View>
                                <Text style={[styles.renterName, { color: colors.text }]}>
                                    {item.renter.first_name} {item.renter.last_name}
                                </Text>
                                <Text style={[styles.renterLabel, { color: colors.textSecondary }]}>Prospective Renter</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.chatBtn, { backgroundColor: colors.primary }]}
                            onPress={() => {
                                const renterAny: any = item.renter;
                                const phone = renterAny?.phone_number || renterAny?.phone;
                                if (phone) {
                                    const clean = phone.replace(/[^0-9]/g, '');
                                    Linking.openURL(`https://wa.me/234${clean.replace(/^0/, '').replace(/^234/, '')}`);
                                } else if (renterAny?.email) {
                                    Linking.openURL(`mailto:${renterAny.email}?subject=Regarding%20Inspection%20for%20${encodeURIComponent(item.property?.title || 'Property')}`);
                                }
                            }}
                        >
                            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                            <Text style={styles.chatBtnText}>Message</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Booked on — always visible */}
                <View style={styles.bodyRow}>
                    <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.bookedOn, { color: colors.textSecondary }]}>
                        Booked on {new Date(item.created_at).toLocaleDateString('en-NG')}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {role === 'LANDLORD' ? 'Property Inspections' : 'My Bookings'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={inspections}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={64} color={colors.border} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Inspections Yet</Text>
                            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                                {role === 'LANDLORD'
                                    ? "You haven't received any inspection requests yet."
                                    : "Book an inspection for a property to see it here."}
                            </Text>
                        </View>
                    }
                    onRefresh={fetchInspections}
                    refreshing={loading}
                />
            )}
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
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    listContent: { padding: 16, gap: 12 },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    propertyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    thumb: {
        width: 44,
        height: 44,
        borderRadius: 8,
    },
    headerText: {
        flex: 1,
    },
    propertyTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 3,
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dateTime: {
        fontSize: 13,
        fontWeight: '700',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    bodyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 12,
        paddingBottom: 10,
    },
    detailText: {
        fontSize: 13,
        flex: 1,
    },
    renterCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 12,
        marginBottom: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    renterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarInitial: {
        fontSize: 16,
        fontWeight: '700',
    },
    renterName: {
        fontSize: 14,
        fontWeight: '600',
    },
    renterLabel: {
        fontSize: 11,
    },
    chatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 8,
    },
    chatBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    bookedOn: {
        fontSize: 11,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});

export default InspectionsScreen;
