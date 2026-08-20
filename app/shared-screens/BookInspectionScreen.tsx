import BackButton from '@/components/BackButton';
import CustomButton from '@/components/CustomButton';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useCredits } from '../../hooks/useCredits';
import { useProfile } from '../../hooks/useProfile';
import { callEdgeFunction } from '../../lib/api';
import { supabase } from '../../lib/supabase';

const BookInspectionScreen = () => {
    const { property_id, property_title } = useLocalSearchParams<{
        property_id: string;
        property_title: string;
    }>();
    const router = useRouter();
    const { colors } = useTheme();
    const { user } = useAuth();
    const { showError } = useToast();

    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [time, setTime] = useState(new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [notes, setNotes] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const { profile } = useProfile();
    const [alreadyBooked, setAlreadyBooked] = useState(false);
    const [propertyStatus, setPropertyStatus] = useState<string | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [landlordName, setLandlordName] = useState<string>('Landlord');
    const [propertyAddress, setPropertyAddress] = useState<string>('');

    useEffect(() => {
        if (profile?.phone) {
            setWhatsappNumber(profile.phone);
        }
    }, [profile]);

    useEffect(() => {
        const fetchStatus = async () => {
            if (!property_id) return;

            setCheckingStatus(true);
            try {
                // 1. Fetch Property Status and Landlord Details
                const { data: property } = await supabase
                    .from('properties')
                    .select('status, location, landlord:users!landlord_id(first_name, last_name)')
                    .eq('id', property_id)
                    .single();

                if (property) {
                    setPropertyStatus(property.status);
                    setPropertyAddress(property.location || '');
                    if ((property as any).landlord) {
                        const first = (property as any).landlord.first_name || '';
                        const last = (property as any).landlord.last_name || '';
                        const fullName = `${first} ${last}`.trim();
                        if (fullName) {
                            setLandlordName(fullName);
                        }
                    }
                }

                // 2. Check if already booked (only if user is logged in)
                if (user) {
                    const { data: existing } = await supabase
                        .from('inspection_bookings')
                        .select('id')
                        .eq('property_id', property_id)
                        .eq('renter_id', user.id)
                        .eq('status', 'confirmed')
                        .maybeSingle();

                    if (existing) setAlreadyBooked(true);
                }
            } catch (err) {
                console.error('Error fetching booking/property status:', err);
            } finally {
                setCheckingStatus(false);
            }
        };

        fetchStatus();
    }, [user, property_id]);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) setDate(selectedDate);
    };

    const onTimeChange = (event: any, selectedTime?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) setTime(selectedTime);
    };

    const { credits, fetchCredits } = useCredits();

    const handleBookWithCredits = async () => {
        if (!user) {
            showError({ title: 'Authentication Required', message: 'Please sign in to book an inspection.' });
            return;
        }

        if (!whatsappNumber || whatsappNumber.length < 10) {
            showError({ title: 'Invalid WhatsApp', message: 'Please enter a valid WhatsApp number to receive booking details.' });
            return;
        }

        if (credits < 1) {
            Alert.alert(
                'Insufficient Units',
                'You need 1 Unit to book an inspection. Would you like to fund your wallet?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Fund Wallet', onPress: () => router.push('/shared-screens/TopUpCreditsScreen') }
                ]
            );
            return;
        }

        setLoading(true);
        try {
            const response = await callEdgeFunction('book-inspection', 'POST', {
                property_id,
                preferred_date: date.toISOString().split('T')[0],
                preferred_time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                notes,
                whatsapp_number: whatsappNumber,
            });

            if (response.error) {
                // Handle specific constraint errors from Edge Function
                if (response.error.includes('maximum inspection limit')) {
                    Alert.alert('Fully Booked', response.error);
                    return;
                }
                if (response.error.includes('already booked')) {
                    Alert.alert('Date Taken', response.error);
                    return;
                }
                throw new Error(response.error);
            }

            // Success!
            await fetchCredits(); // Update balance in context
            const eventDate = new Date(date);
            eventDate.setHours(time.getHours());
            eventDate.setMinutes(time.getMinutes());
            eventDate.setSeconds(0);
            eventDate.setMilliseconds(0);

            router.replace({
                pathname: '/shared-screens/BookingConfirmationScreen',
                params: {
                    property_id,
                    date: date.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }),
                    time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' WAT',
                    property: property_title || 'Selected Property',
                    address: propertyAddress || 'Revealed after confirmation',
                    landlord: landlordName,
                    raw_date: eventDate.toISOString(),
                }
            });
        } catch (error: any) {
            showError({ title: 'Booking Failed', message: error.message || 'Could not complete booking.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Book Inspection</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.infoCard}>
                        <Text style={[styles.propertyTitle, { color: colors.text }]}>{property_title}</Text>
                        <View style={styles.balanceBadge}>
                            <Text style={styles.balanceLabel}>Your Balance: {credits} Units</Text>
                        </View>
                    </View>

                <View style={[styles.costCard, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.costText, { color: colors.primary }]}>Booking Cost: 1 Unit</Text>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferred Date</Text>
                <TouchableOpacity
                    style={[styles.pickerTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={[styles.pickerText, { color: colors.text }]}>
                        {date.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        minimumDate={new Date()}
                        onChange={onDateChange}
                    />
                )}

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Preferred Time</Text>
                <TouchableOpacity
                    style={[styles.pickerTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setShowTimePicker(true)}
                >
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                    <Text style={[styles.pickerText, { color: colors.text }]}>
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </TouchableOpacity>

                {showTimePicker && (
                    <DateTimePicker
                        value={time}
                        mode="time"
                        display="default"
                        onChange={onTimeChange}
                    />
                )}

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Additional Notes (Optional)</Text>
                <TextInput
                    style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    placeholder="Any specific requests for the landlord?"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={4}
                    value={notes}
                    onChangeText={setNotes}
                />

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Your WhatsApp Number</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                    <TextInput
                        style={[styles.simpleInput, { color: colors.text }]}
                        placeholder="e.g. +234 801 234 5678"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="phone-pad"
                        value={whatsappNumber}
                        onChangeText={setWhatsappNumber}
                    />
                </View>

                <View style={styles.warningBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#666" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.warningText}>
                            After payment, we will send the landlord's contact and exact address to your WhatsApp and Email.
                        </Text>
                        <Text style={[styles.warningText, { marginTop: 4, fontWeight: '700' }]}>
                            Note: Each property is limited to 6 total inspection bookings to ensure quality.
                        </Text>
                    </View>
                </View>

                <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <CustomButton
                    title={
                        loading ? "Processing..." :
                            checkingStatus ? "Checking..." :
                                alreadyBooked ? "Already Booked" :
                                    (propertyStatus && propertyStatus !== 'available') ? "Property Unavailable" :
                                        `Book with 1 Unit`
                    }
                    onPress={handleBookWithCredits}
                    loading={loading}
                    disabled={loading || checkingStatus || alreadyBooked || (propertyStatus !== null && propertyStatus !== 'available')}
                />
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
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    scrollContent: { padding: 20 },
    infoCard: {
        marginBottom: 32,
        alignItems: 'center',
    },
    propertyTitle: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    feeText: {
        fontSize: 16,
        fontWeight: '700',
    },
    balanceBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 8,
    },
    balanceLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2E7D32',
    },
    costCard: {
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 32,
    },
    costText: {
        fontSize: 18,
        fontWeight: '800',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    pickerTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    pickerText: {
        fontSize: 16,
        fontWeight: '500',
    },
    textInput: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    simpleInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    warningBox: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: '#F5F5F5',
        padding: 16,
        borderRadius: 12,
        marginTop: 32,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    footer: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
});

export default BookInspectionScreen;
