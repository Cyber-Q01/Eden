import CustomButton from '@/components/CustomButton';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import * as Calendar from 'expo-calendar';

const BookingConfirmationScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { 
        date: paramDate, 
        time: paramTime, 
        property: paramProperty, 
        address: paramAddress, 
        landlord: paramLandlord, 
        property_id,
        raw_date: paramRawDate
    } = useLocalSearchParams<{
        date?: string;
        time?: string;
        property?: string;
        address?: string;
        landlord?: string;
        property_id?: string;
        raw_date?: string;
    }>();

    const [date, setDate] = useState(paramDate);
    const [time, setTime] = useState(paramTime);
    const [property, setProperty] = useState(paramProperty);
    const [address, setAddress] = useState(paramAddress);
    const [landlord, setLandlord] = useState(paramLandlord);
    const [rawDate, setRawDate] = useState(paramRawDate);
    const [loading, setLoading] = useState(!paramDate && !!property_id);

    useEffect(() => {
        const fetchDetails = async () => {
            if (paramDate && paramTime && paramProperty && paramAddress && paramLandlord && paramRawDate) {
                setLoading(false);
                return;
            }
            if (!property_id) {
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch Property Details (with landlord/agent nested)
                const { data: propData, error: propErr } = await supabase
                    .from('properties')
                    .select('title, location, landlord:users!landlord_id(first_name, last_name), agent:users!agent_id(first_name, last_name)')
                    .eq('id', property_id)
                    .single();

                if (propErr) throw propErr;

                if (propData) {
                    setProperty(propData.title);
                    setAddress(propData.location);
                    const landlordName = propData.agent
                        ? `${propData.agent.first_name || ''} ${propData.agent.last_name || ''}`.trim()
                        : `${propData.landlord?.first_name || ''} ${propData.landlord?.last_name || ''}`.trim();
                    setLandlord(landlordName || 'Landlord');
                }

                // 2. Fetch the renter's confirmed booking for this property
                const { data: bookingData, error: bookingErr } = await supabase
                    .from('inspection_bookings')
                    .select('preferred_date, preferred_time')
                    .eq('property_id', property_id)
                    .eq('status', 'confirmed')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (bookingData) {
                    const formattedDate = new Date(bookingData.preferred_date).toLocaleDateString('en-NG', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    });
                    setDate(formattedDate);
                    setTime(bookingData.preferred_time + ' WAT');

                    // Calculate raw bookingDate
                    const bookingDate = new Date(bookingData.preferred_date);
                    const timeParts = bookingData.preferred_time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
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
                    setRawDate(bookingDate.toISOString());
                }
            } catch (err) {
                console.error('Error fetching booking confirmation details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [property_id, paramDate, paramTime, paramProperty, paramAddress, paramLandlord, paramRawDate]);

    const handleAddToCalendar = async () => {
        if (!rawDate) {
            Alert.alert('Error', 'Inspection date/time details not found.');
            return;
        }

        try {
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Calendar permission is required to save events.');
                return;
            }

            const startDate = new Date(rawDate);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

            let calendarId = null;
            if (Platform.OS === 'ios') {
                const defaultCal = await Calendar.getDefaultCalendarAsync();
                calendarId = defaultCal?.id;
            } else {
                const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
                const primaryCal = calendars.find(cal => cal.isPrimary) || calendars[0];
                calendarId = primaryCal?.id;
            }

            if (!calendarId) {
                Alert.alert('Error', 'No writeable calendar found on this device.');
                return;
            }

            const eventId = await Calendar.createEventAsync(calendarId, {
                title: `Property Inspection - ${property || 'EdenHome'}`,
                startDate,
                endDate,
                location: address || '',
                notes: `Inspection with Landlord: ${landlord || 'Owner'}. Scheduled via EdenHome.`,
                timeZone: 'Africa/Lagos',
            });

            if (eventId) {
                Alert.alert(
                    'Success',
                    'Inspection added to your calendar successfully.',
                    [
                        { text: 'OK', style: 'default' },
                        {
                            text: 'Open Calendar',
                            onPress: () => {
                                const timestamp = startDate.getTime();
                                if (Platform.OS === 'ios') {
                                    // iOS uses seconds since epoch
                                    Linking.openURL(`calshow:${timestamp / 1000}`);
                                } else {
                                    // Android uses milliseconds since epoch
                                    Linking.openURL(`content://com.android.calendar/time/${timestamp}`);
                                }
                            }
                        }
                    ]
                );
            }
        } catch (error: any) {
            console.error('Failed to add to calendar:', error);
            Alert.alert('Error', 'Could not add event to calendar.');
        }
    };

    const isPast = rawDate ? new Date() > new Date(rawDate) : false;

    if (loading) {
        return (
            <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} withScrollView={false}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 14 }}>
                        Loading booking details…
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} withScrollView={false}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={{ width: 40 }} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {isPast ? 'Inspection Completed' : 'Booking Confirmed'}
                </Text>
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
                    <Text style={[styles.title, { color: colors.text }]}>
                        {isPast ? 'Inspection Completed!' : 'Inspection Booked!'}
                    </Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>
                        {isPast 
                            ? 'This inspection date has passed. We hope your viewing went well!'
                            : 'Your inspection booking has been successfully confirmed.'}
                    </Text>
                </View>

                {/* Details Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Inspection Details</Text>
                    
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Property</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                            {property || 'Property Details'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date & Time</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                            {date && time ? `${date.split(',')[1]?.trim() || date} • ${time}` : 'To be confirmed'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Landlord</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {landlord || 'Landlord Details'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Address</Text>
                        <Text style={[styles.detailValue, { color: colors.primary, fontWeight: '600' }]}>
                            {address || 'Revealed after confirmation'}
                        </Text>
                    </View>
                </View>

                {/* What Happens Next - Compact Banner */}
                <View style={[styles.infoBanner, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                    <Ionicons name="information-circle" size={16} color={colors.primary} />
                    <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
                        Bring a <Text style={{ fontWeight: '600', color: colors.text }}>Valid ID</Text> and <Text style={{ fontWeight: '600', color: colors.text }}>Proof of Income</Text> to the inspection.
                    </Text>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                {!isPast && (
                    <CustomButton
                        title="Add to Calendar"
                        onPress={handleAddToCalendar}
                        style={styles.primaryButton}
                    />
                )}
                
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                        Go to Dashboard
                    </Text>
                </TouchableOpacity>
            </View>
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
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        borderWidth: 1,
        padding: 10,
        marginBottom: 6,
    },
    infoBannerText: {
        fontSize: 12,
        lineHeight: 16,
        flex: 1,
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
});

export default BookingConfirmationScreen;
