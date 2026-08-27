import BackButton from '@/components/BackButton';
import CustomButton from '@/components/CustomButton';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import CustomDatePickerModal, { formatYYYYMMDD, parseYYYYMMDD } from '@/components/CustomDatePickerModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import WebView from 'react-native-webview';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useInspectionPasses, INSPECTION_PACK_SIZE, INSPECTION_PACK_TOTAL } from '../../hooks/useInspectionPasses';
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

    // Pass purchase (only shown when the tenant has 0 inspections left)
    const [paystackUrl, setPaystackUrl] = useState<string | null>(null);
    const [currentReference, setCurrentReference] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [purchasing, setPurchasing] = useState(false);

    const { profile } = useProfile();
    const [alreadyBooked, setAlreadyBooked] = useState(false);
    const [propertyStatus, setPropertyStatus] = useState<string | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [landlordName, setLandlordName] = useState<string>('Landlord');
    const [propertyAddress, setPropertyAddress] = useState<string>('');

    const { remaining, used, total, initializePack, verifyPack, refresh } = useInspectionPasses();

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

    // ── Core booking: consumes 1 unused inspection pass ─────────────────────
    const submitBooking = async (): Promise<boolean> => {
        if (!whatsappNumber || whatsappNumber.length < 10) {
            showError({ title: 'Invalid WhatsApp', message: 'Please enter a valid WhatsApp number to receive booking details.' });
            return false;
        }

        setLoading(true);
        try {
            const response = await callEdgeFunction<any>('book-inspection', 'POST', {
                property_id,
                preferred_date: date.toISOString().split('T')[0],
                preferred_time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                notes,
                whatsapp_number: whatsappNumber,
            });

            if (response.error) {
                if (response.code === 'no_passes') {
                    await refresh();
                    Alert.alert(
                        'No Inspections Left',
                        `You have no inspection bookings remaining. Buy ${INSPECTION_PACK_SIZE} for N${INSPECTION_PACK_TOTAL.toLocaleString()} to continue.`,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: `Buy ${INSPECTION_PACK_SIZE} Now`, onPress: () => startPackPurchase() },
                        ]
                    );
                    return false;
                }
                if (response.code === 'duplicate') {
                    Alert.alert('Already Booked', response.error);
                    return false;
                }
                if (response.code === 'limit_reached') {
                    Alert.alert('Fully Booked', response.error);
                    return false;
                }
                if (response.code === 'property_unavailable') {
                    Alert.alert('Unavailable', response.error);
                    return false;
                }
                throw new Error(response.error);
            }

            // Success!
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
            return true;
        } catch (error: any) {
            showError({ title: 'Booking Failed', message: error.message || 'Could not complete booking.' });
            return false;
        } finally {
            setLoading(false);
        }
    };

    // ── Pack purchase: only when 0 inspections remain ───────────────────────
    const startPackPurchase = async () => {
        if (!user) {
            showError({ title: 'Authentication Required', message: 'Please sign in to book an inspection.' });
            return;
        }
        setPurchasing(true);
        try {
            const data = await initializePack();
            if (data) {
                setCurrentReference(data.reference);
                setPaystackUrl(data.authorization_url);
            }
        } finally {
            setPurchasing(false);
        }
    };

    const finishVerify = async (reference: string) => {
        setVerifying(true);
        const success = await verifyPack(reference);
        setVerifying(false);
        if (success) {
            setCurrentReference(null);
            setPaystackUrl(null);
            // The user's intent was to book THIS property — continue straight into it
            await submitBooking();
        }
    };

    const handleWebviewBack = async () => {
        if (currentReference) {
            await finishVerify(currentReference);
        } else {
            setPaystackUrl(null);
        }
    };

    const handleWebViewNav = async (navState: any) => {
        const url: string = navState.url ?? '';

        if (
            (url.includes('Eden://pack/verify') ||
                url.includes('edenhome://pack/verify') ||
                url.includes('paystack-callback') ||
                url.includes('paystack.co/close') ||
                url.includes('standard.paystack.co/close')) &&
            currentReference
        ) {
            await finishVerify(currentReference);
        }

        if (url.includes('Eden://pack/cancelled') || url.includes('edenhome://pack/cancelled')) {
            setPaystackUrl(null);
            setCurrentReference(null);
        }
    };

    // ── Footer button entry point ────────────────────────────────────────────
    const handlePress = async () => {
        if (!user) {
            showError({ title: 'Authentication Required', message: 'Please sign in to book an inspection.' });
            return;
        }

        if (remaining > 0) {
            await submitBooking();
        } else {
            await startPackPurchase();
        }
    };

    // ── Paystack WebView (pass purchase) ─────────────────────────────────────
    if (paystackUrl) {
        return (
            <ScreenWrapper disableKeyboardAvoidingView>
                <View style={styles.webviewContainer}>
                    <View style={[styles.webviewHeader, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={handleWebviewBack} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.webviewTitle, { color: colors.text }]}>Secure Payment</Text>
                        <View style={{ width: 22 }} />
                    </View>
                    <WebView
                        source={{ uri: paystackUrl }}
                        onNavigationStateChange={handleWebViewNav}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        setSupportMultipleWindows={false}
                        javaScriptCanOpenWindowsAutomatically={true}
                        mixedContentMode="compatibility"
                        startInLoadingState
                        renderLoading={() => (
                            <View style={styles.webviewLoading}>
                                <ActivityIndicator color={colors.primary} size="large" />
                            </View>
                        )}
                    />
                </View>
            </ScreenWrapper>
        );
    }

    // ── Verifying state ──────────────────────────────────────────────────────
    if (verifying) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.verifyingText, { color: colors.text }]}>
                        Confirming your payment...
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    const buttonTitle =
        loading ? "Processing..." :
        purchasing ? "Preparing Payment..." :
        checkingStatus ? "Checking..." :
        alreadyBooked ? "Already Booked" :
        (propertyStatus && propertyStatus !== 'available') ? "Property Unavailable" :
        remaining > 0 ? "Book Inspection" :
        `Book ${INSPECTION_PACK_SIZE} Inspections (N${INSPECTION_PACK_TOTAL.toLocaleString()})`;

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
                        {total > 0 ? (
                            <View style={styles.bookedBadgeRow}>
                                <View style={[styles.bookedBadge, { backgroundColor: '#E8F5E9' }]}>
                                    <Ionicons name="checkmark-circle-outline" size={14} color="#2E7D32" />
                                    <Text style={styles.bookedBadgeText}>
                                        {used}/{total} properties booked
                                    </Text>
                                </View>
                                <View style={[styles.remainingBadge, { backgroundColor: colors.primary + '10' }]}>
                                    <Text style={[styles.remainingBadgeText, { color: colors.primary }]}>
                                        {remaining} inspection{remaining !== 1 ? 's' : ''} remaining
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={[styles.noInspectionsBadge, { backgroundColor: colors.primary + '10' }]}>
                                <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
                                <Text style={[styles.noInspectionsBadgeText, { color: colors.primary }]}>
                                    No inspections yet — {INSPECTION_PACK_SIZE} for N{INSPECTION_PACK_TOTAL.toLocaleString()}
                                </Text>
                            </View>
                        )}
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

                    <CustomDatePickerModal
                        visible={showDatePicker}
                        value={formatYYYYMMDD(date)}
                        minimumDate={new Date()}
                        title="Select Preferred Date"
                        onConfirm={(dateStr) => setDate(parseYYYYMMDD(dateStr))}
                        onClose={() => setShowDatePicker(false)}
                    />

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
                                After booking, we will send the exact address and landlord contact to your WhatsApp and Email.
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
                    title={buttonTitle}
                    onPress={handlePress}
                    loading={loading}
                    disabled={loading || purchasing || checkingStatus || alreadyBooked || (propertyStatus !== null && propertyStatus !== 'available')}
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
        marginBottom: 28,
        alignItems: 'center',
    },
    propertyTitle: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 10,
    },
    bookedBadgeRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    bookedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    bookedBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2E7D32',
    },
    remainingBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    remainingBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    noInspectionsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    noInspectionsBadgeText: {
        fontSize: 12,
        fontWeight: '700',
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
    // WebView
    webviewContainer: {
        flex: 1,
    },
    webviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        padding: 4,
    },
    webviewTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    webviewLoading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // States
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    verifyingText: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export default BookInspectionScreen;
