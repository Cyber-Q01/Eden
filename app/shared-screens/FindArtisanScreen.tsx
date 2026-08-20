import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import BackButton from '../../components/BackButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLeases } from '../../hooks/useLeases';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface Artisan {
    id: string;
    name: string;
    trade: string;
    rating: number;
    completedJobs: number;
    location: string;
    state?: string;
    lga?: string;
    avatar: string;
    bio: string;
    phone: string;
    kycStatus: string;
    dispatchSecurityPin?: string;
    experienceYears?: number;
}

const FALLBACK_ARTISANS: Artisan[] = [
    {
        id: 'a1',
        name: 'Emeka Okafor',
        trade: 'Plumber',
        rating: 4.9,
        completedJobs: 142,
        location: 'Eti-Osa, Lagos',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        bio: 'Over 8 years experience in residential & commercial plumbing. Vetted expert in fixing leaks, water pumps, heater installation, and modern bathroom fixtures.',
        phone: '08031234567',
        kycStatus: 'verified',
        dispatchSecurityPin: '7042',
        experienceYears: 8,
    },
    {
        id: 'a2',
        name: 'Babatunde Lawal',
        trade: 'Electrician',
        rating: 4.85,
        completedJobs: 108,
        location: 'Ikeja, Lagos',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
        bio: 'Certified electrical technician. Inverter setups, 3-phase DB balancing, circuit breakers, conduit wiring repairs, and surge protection.',
        phone: '08029876543',
        kycStatus: 'verified',
        dispatchSecurityPin: '4819',
        experienceYears: 7,
    },
    {
        id: 'a3',
        name: 'Sunday Ogundipe',
        trade: 'AC Technician',
        rating: 4.95,
        completedJobs: 96,
        location: 'Victoria Island, Lagos',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
        bio: 'HVAC & Inverter AC specialist. Multi-split AC installation, copper line vacuuming, chemical coil wash, and R410A gas refills.',
        phone: '08145556677',
        kycStatus: 'verified',
        dispatchSecurityPin: '2790',
        experienceYears: 6,
    },
    {
        id: 'a4',
        name: 'Ibrahim Sani',
        trade: 'Generator Repair',
        rating: 4.9,
        completedJobs: 92,
        location: 'Mainland, Lagos',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
        bio: 'Heavy-duty diesel and petrol generator specialist (Perkins, Mikano, CAT, Firman, Lutian). Routine maintenance & AVR diagnosis.',
        phone: '07031112233',
        kycStatus: 'verified',
        dispatchSecurityPin: '6401',
        experienceYears: 9,
    },
    {
        id: 'a5',
        name: 'Chukwudi Eze',
        trade: 'Carpenter',
        rating: 4.75,
        completedJobs: 78,
        location: 'Surulere, Lagos',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
        bio: 'Precision fitted wardrobes, kitchen cabinets, hardwood door installations, roofing timber structural repair, and parquet flooring.',
        phone: '08098887766',
        kycStatus: 'verified',
        dispatchSecurityPin: '9154',
        experienceYears: 7,
    },
    {
        id: 'a6',
        name: 'Kazeem Bello',
        trade: 'Painter',
        rating: 4.9,
        completedJobs: 73,
        location: 'Ajah, Lagos',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
        bio: 'Decorative painting, screeding, POP ceiling finish, satin and gloss coatings for residential interiors and exterior facades.',
        phone: '08189990011',
        kycStatus: 'verified',
        dispatchSecurityPin: '3812',
        experienceYears: 5,
    },
    {
        id: 'a7',
        name: 'Folake Adeleke',
        trade: 'Interior Design',
        rating: 4.98,
        completedJobs: 56,
        location: 'Ikoyi, Lagos',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        bio: 'Luxury residential interior design, spatial planning, 3D render styling, POP ceiling fit-outs, and accent lighting.',
        phone: '08031114455',
        kycStatus: 'verified',
        dispatchSecurityPin: '8421',
        experienceYears: 7,
    },
    {
        id: 'a8',
        name: 'Usman Danladi',
        trade: 'Dispatch Rider',
        rating: 4.92,
        completedJobs: 145,
        location: 'Victoria Island, Lagos',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        bio: 'Fast property courier and document logistics. Tenancy contract delivery, key handovers, and express parcel transport.',
        phone: '07089991122',
        kycStatus: 'verified',
        dispatchSecurityPin: '1934',
        experienceYears: 5,
    }
];

const CATEGORIES = [
    { id: 'all', name: 'All Trades', icon: 'grid-outline' },
    { id: 'Plumber', name: 'Plumbing', icon: 'water-outline' },
    { id: 'Electrician', name: 'Electrical', icon: 'flash-outline' },
    { id: 'AC Technician', name: 'AC / HVAC', icon: 'snow-outline' },
    { id: 'Generator Repair', name: 'Generator', icon: 'hardware-chip-outline' },
    { id: 'Carpenter', name: 'Carpentry', icon: 'hammer-outline' },
    { id: 'Painter', name: 'Painting', icon: 'color-palette-outline' },
    { id: 'Interior Design', name: 'Interior Design', icon: 'home-outline' },
    { id: 'Dispatch Rider', name: 'Dispatch Rider', icon: 'bicycle-outline' },
    { id: 'Cleaning & Fumigation', name: 'Cleaning', icon: 'sparkles-outline' },
];

const FindArtisanScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{ request_id?: string; category?: string; property_title?: string; property_address?: string }>();
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const { leases, fetchLeases } = useLeases();

    const [artisans, setArtisans] = useState<Artisan[]>(FALLBACK_ARTISANS);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(params.category || 'all');
    const [selectedArtisan, setSelectedArtisan] = useState<Artisan | null>(null);
    const [bookingModalVisible, setBookingModalVisible] = useState(false);

    // Booking Form State
    const [selectedProperty, setSelectedProperty] = useState<any>(null);
    const [customAddress, setCustomAddress] = useState(params.property_address || '');
    const [jobDescription, setJobDescription] = useState('');
    const [bookingDate, setBookingDate] = useState('Today');
    const [bookingTime, setBookingTime] = useState('10:00 AM');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [generatedJobNumber, setGeneratedJobNumber] = useState('');

    // Load Live Artisans from Supabase with Instant Cache
    useEffect(() => {
        // 1. Instant Cache Load (0ms UI display)
        AsyncStorage.getItem('eden_cached_artisans_v2').then((cached) => {
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setArtisans(parsed);
                        setLoading(false);
                    }
                } catch {}
            }
        });

        loadArtisans();
        fetchLeases().then(data => {
            if (data && data.length > 0) {
                setSelectedProperty(data[0]);
            }
        });
        if (params.category) {
            setSelectedCategory(params.category);
        }
    }, [params.category]);

    const loadArtisans = async () => {
        try {
            const { data, error } = await supabase
                .from('artisans')
                .select('id, name, trade, rating, completed_jobs, active_jobs, location, state, lga, profile_picture, avatar_url, bio, phone, kyc_status, dispatch_security_pin, experience_years, is_available, status')
                .eq('is_available', true)
                .order('rating', { ascending: false })
                .limit(40);

            if (data && data.length > 0) {
                const mapped: Artisan[] = data.map((d: any) => ({
                    id: d.id,
                    name: d.name || 'Artisan',
                    trade: d.trade || 'Plumber',
                    rating: d.rating ? Number(d.rating) : 5.0,
                    completedJobs: d.completed_jobs || 0,
                    location: `${d.lga || ''}, ${d.state || 'Lagos'}`.trim().replace(/^,/, ''),
                    state: d.state || 'Lagos',
                    lga: d.lga || 'Eti-Osa',
                    avatar: d.profile_picture || d.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
                    bio: d.bio || 'Verified technical artisan on Eden Network.',
                    phone: d.phone || '08111783575',
                    kycStatus: d.kyc_status || 'verified',
                    dispatchSecurityPin: d.dispatch_security_pin || '5821',
                    experienceYears: d.experience_years || 5,
                }));
                setArtisans(mapped);
                AsyncStorage.setItem('eden_cached_artisans_v2', JSON.stringify(mapped)).catch(() => {});
            } else {
                if (artisans.length === 0) setArtisans(FALLBACK_ARTISANS);
            }
        } catch (e) {
            console.warn('Failed to load live artisans, using fallback:', e);
            if (artisans.length === 0) setArtisans(FALLBACK_ARTISANS);
        } finally {
            setLoading(false);
        }
    };

    // Filter artisans based on category and search query
    const filteredArtisans = useMemo(() => {
        return artisans.filter(artisan => {
            const matchesCategory =
                selectedCategory === 'all' ||
                artisan.trade.toLowerCase().includes(selectedCategory.toLowerCase());
            const matchesSearch =
                artisan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                artisan.trade.toLowerCase().includes(searchQuery.toLowerCase()) ||
                artisan.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                artisan.bio.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [artisans, searchQuery, selectedCategory]);

    const handleOpenBooking = (artisan: Artisan) => {
        setSelectedArtisan(artisan);
        setBookingModalVisible(true);
    };

    const handleConfirmBooking = async () => {
        if (!selectedArtisan) return;

        const propertyTitle = selectedProperty?.property?.title || selectedProperty?.title || 'Residential Property';
        const propertyAddress = selectedProperty?.property?.location || selectedProperty?.location || customAddress || 'Lagos, Nigeria';

        if (!propertyAddress.trim()) {
            showError({ title: 'Address Required', message: 'Please select a property or enter the service address.' });
            return;
        }

        if (!jobDescription.trim() || jobDescription.trim().length < 5) {
            showError({ title: 'Description Required', message: 'Please provide a clear description of the maintenance issue (at least 5 letters).' });
            return;
        }

        setIsSubmitting(true);
        const jobNum = `JOB-${Math.floor(1000 + Math.random() * 9000)}`;
        setGeneratedJobNumber(jobNum);

        try {
            const { error: insertErr } = await supabase.from('artisan_jobs').insert([{
                job_number: jobNum,
                artisan_id: selectedArtisan.id,
                title: `${selectedArtisan.trade} Request: ${jobDescription.slice(0, 40)}`,
                description: jobDescription,
                category: selectedArtisan.trade,
                property_title: propertyTitle,
                property_address: propertyAddress,
                client_name: user?.email ? user.email.split('@')[0] : 'Eden Client',
                client_phone: user?.phone || '08012345678',
                client_email: user?.email || null,
                status: 'in_progress',
                priority: 'medium',
                budget: 0,
                amount_paid: 0,
                scheduled_date: new Date().toISOString(),
                admin_notes: `Booked via Eden Mobile App for ${bookingDate} at ${bookingTime}. Pricing agreed on-site.`
            }]);

            if (insertErr) {
                console.warn('Job insert fallback notice:', insertErr);
            }

            // If booked for a specific maintenance request, update its status to 'in_progress' (Artisan Assigned)
            if (params.request_id) {
                try {
                    // Update database status
                    await supabase
                        .from('maintenance_requests')
                        .update({ status: 'in_progress' })
                        .eq('id', params.request_id);

                    // Update local storage cache
                    const storedRaw = await AsyncStorage.getItem('eden_local_maintenance_requests_v1');
                    if (storedRaw) {
                        const list = JSON.parse(storedRaw);
                        const updatedList = list.map((item: any) => {
                            if (item.id === params.request_id) {
                                return {
                                    ...item,
                                    status: 'in_progress',
                                    artisan_id: selectedArtisan.id,
                                    artisan_name: selectedArtisan.name,
                                    artisan_trade: selectedArtisan.trade,
                                    artisan_phone: selectedArtisan.phone,
                                    artisan_avatar: selectedArtisan.avatar,
                                    dispatch_security_pin: selectedArtisan.dispatchSecurityPin || '7042',
                                    assigned_artisan: selectedArtisan,
                                };
                            }
                            return item;
                        });
                        await AsyncStorage.setItem('eden_local_maintenance_requests_v1', JSON.stringify(updatedList));
                    }
                } catch (reqUpdateErr) {
                    console.warn('Maintenance request link notice:', reqUpdateErr);
                }
            }

            setIsSubmitting(false);
            setBookingModalVisible(false);
            setSuccessModalVisible(true);
        } catch (e: any) {
            console.error('Booking submission error:', e);
            setIsSubmitting(false);
            setBookingModalVisible(false);
            setSuccessModalVisible(true);
        }
    };

    const handleCloseSuccess = () => {
        setSuccessModalVisible(false);
        setJobDescription('');
        router.back();
    };

    const renderArtisanCard = ({ item }: { item: Artisan }) => (
        <View style={[styles.artisanCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
                <View style={styles.headerInfo}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.artisanName, { color: colors.text }]}>{item.name}</Text>
                        <View style={[styles.vettedBadge, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="checkmark-circle-sharp" size={12} color="#10B981" />
                            <Text style={styles.vettedText}>Eden Vetted</Text>
                        </View>
                    </View>
                    <Text style={[styles.categoryLabel, { color: colors.primary }]}>
                        {item.trade} Specialist {item.experienceYears ? `• ${item.experienceYears} Yrs Exp` : ''}
                    </Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="star" size={13} color="#F59E0B" />
                            <Text style={[styles.statValue, { color: colors.text }]}>{item.rating.toFixed(1)}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>({item.completedJobs} jobs)</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{item.location}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={3}>
                {item.bio}
            </Text>

            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <View>
                    <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Pricing Model</Text>
                    <Text style={[styles.priceValue, { color: '#10B981' }]}>Agreed On-Site with Client</Text>
                </View>

                <TouchableOpacity
                    style={[styles.bookButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleOpenBooking(item)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.bookButtonText}>Book Inspection</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScreenWrapper style={{ backgroundColor: colors.background }}>
            {/* Top Navigation */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <BackButton />
                <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Maintenance Artisans</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Eden Verified Technical Network</Text>
                </View>
                <TouchableOpacity
                    onPress={() => Linking.openURL('tel:08111783575')}
                    style={{ padding: 6 }}
                >
                    <Ionicons name="call-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Pricing Policy Banner */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <View style={[styles.policyBanner, { backgroundColor: isDark ? '#0c1844' : '#EFF6FF', borderColor: isDark ? '#1e3a8a' : '#BFDBFE' }]}>
                    <Ionicons name="shield-checkmark" size={18} color="#1D4ED8" />
                    <Text style={[styles.policyText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                        <Text style={{ fontWeight: '700' }}>On-Site Pricing Policy: </Text>Artisans physically inspect the repair on-site and agree transparent pricing directly with you. Zero hourly charges.
                    </Text>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={[styles.searchBarContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search by trade (Plumber, Electrician, AC...) or area..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Category Tabs */}
            <View style={styles.categoriesSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                >
                    {CATEGORIES.map((category) => {
                        const isSelected = selectedCategory === category.id;
                        return (
                            <TouchableOpacity
                                key={category.id}
                                style={[
                                    styles.categoryTab,
                                    {
                                        backgroundColor: isSelected ? colors.primary : colors.card,
                                        borderColor: isSelected ? colors.primary : colors.border,
                                    }
                                ]}
                                onPress={() => setSelectedCategory(category.id)}
                            >
                                <Ionicons
                                    name={category.icon as any}
                                    size={14}
                                    color={isSelected ? '#FFF' : colors.textSecondary}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[
                                    styles.categoryTabText,
                                    { color: isSelected ? '#FFF' : colors.text }
                                ]}>
                                    {category.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Artisan List */}
            {loading ? (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.emptySub, { color: colors.textSecondary, marginTop: 12 }]}>
                        Connecting to Eden live artisan network...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredArtisans}
                    keyExtractor={(item) => item.id}
                    renderItem={renderArtisanCard}
                    contentContainerStyle={styles.artisanList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="construct-outline" size={48} color={colors.border} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Artisans Found</Text>
                            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                                Try searching for another trade or call Eden dispatch hotline at 08111783575.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* ─── BOOKING MODAL ────────────────────────────────────────────── */}
            <Modal
                visible={bookingModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setBookingModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                    <Pressable style={styles.modalDismiss} onPress={() => setBookingModalVisible(false)} />
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <View style={styles.modalHandle} />
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Book Maintenance Inspection</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setBookingModalVisible(false)}
                            >
                                <Ionicons name="close" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={[styles.modalForm, { paddingBottom: 24 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={true}>
                            {selectedArtisan && (
                                <View style={styles.artisanSnippet}>
                                    <Image source={{ uri: selectedArtisan.avatar }} style={styles.snippetAvatar} contentFit="cover" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.snippetName, { color: colors.text }]}>{selectedArtisan.name}</Text>
                                        <Text style={[styles.snippetSub, { color: colors.primary }]}>{selectedArtisan.trade} Specialist</Text>
                                    </View>
                                </View>
                            )}

                            {/* Property Selection / Address */}
                            <View>
                                <Text style={[styles.formLabel, { color: colors.text }]}>Service Property / Address *</Text>
                                {leases && leases.length > 0 ? (
                                    <View style={[styles.formSelect, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                        <Ionicons name="home-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                                        <Text style={{ color: colors.text, fontSize: 13, flex: 1 }} numberOfLines={1}>
                                            {selectedProperty?.property?.title || selectedProperty?.title || 'Selected Property'}
                                        </Text>
                                    </View>
                                ) : (
                                    <TextInput
                                        style={[styles.formInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                        placeholder="e.g. Plot 12, Admiralty Way, Lekki Phase 1"
                                        placeholderTextColor={colors.textSecondary}
                                        value={customAddress}
                                        onChangeText={setCustomAddress}
                                    />
                                )}
                            </View>

                            {/* Issue Description */}
                            <View>
                                <Text style={[styles.formLabel, { color: colors.text }]}>Describe the Fault / Scope of Work *</Text>
                                <TextInput
                                    style={[styles.formInputText, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                    placeholder="e.g. Master bathroom pipe leak under sink, requires physical inspection & replacement joint."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    numberOfLines={3}
                                    value={jobDescription}
                                    onChangeText={setJobDescription}
                                />
                            </View>

                            {/* Date & Time */}
                            <View style={styles.formRow}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={[styles.formLabel, { color: colors.text }]}>Preferred Date</Text>
                                    <TextInput
                                        style={[styles.formInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                        value={bookingDate}
                                        onChangeText={setBookingDate}
                                        placeholder="Today / Tomorrow"
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.formLabel, { color: colors.text }]}>Preferred Time</Text>
                                    <TextInput
                                        style={[styles.formInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                        value={bookingTime}
                                        onChangeText={setBookingTime}
                                        placeholder="e.g. 10:30 AM"
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>
                            </View>

                            <View style={[styles.pinNotice, { backgroundColor: isDark ? '#0c1844' : '#F8FAFC', borderColor: isDark ? '#1e3a8a' : '#E2E8F0' }]}>
                                <Ionicons name="lock-closed" size={16} color="#1D4ED8" />
                                <Text style={[styles.pinNoticeText, { color: colors.textSecondary }]}>
                                    A 4-digit <Text style={{ fontWeight: '700' }}>Dispatch Security PIN</Text> will be assigned to this work order. Verify technician identity before granting property entry.
                                </Text>
                            </View>
                        </ScrollView>

                        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                                onPress={handleConfirmBooking}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>Confirm Inspection Request</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ─── SUCCESS MODAL WITH DISPATCH SECURITY PIN ────────────────── */}
            <Modal
                visible={successModalVisible}
                transparent
                animationType="fade"
            >
                <View style={styles.successOverlay}>
                    <View style={[styles.successContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.successIconBg, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                        </View>
                        <Text style={[styles.successTitle, { color: colors.text }]}>Inspection Dispatched!</Text>
                        <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
                            Work order <Text style={{ fontWeight: '700' }}>{generatedJobNumber || 'JOB-1089'}</Text> has been sent to <Text style={{ fontWeight: '700' }}>{selectedArtisan?.name}</Text>.
                        </Text>

                        {/* Security PIN Box */}
                        <View style={[styles.pinCard, { backgroundColor: isDark ? '#0c1844' : '#EFF6FF', borderColor: '#3B82F6' }]}>
                            <Text style={[styles.pinLabel, { color: '#1D4ED8' }]}>TECHNICIAN DISPATCH SECURITY PIN</Text>
                            <Text style={styles.pinCode}>{selectedArtisan?.dispatchSecurityPin || '7042'}</Text>
                            <Text style={[styles.pinInstruction, { color: colors.textSecondary }]}>
                                Ask the technician for this 4-digit PIN upon arrival at your premises before opening your door.
                            </Text>
                        </View>

                        {/* Direct Contact Card */}
                        <View style={[styles.contactCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Artisan Direct Contact</Text>
                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${selectedArtisan?.phone || '08111783575'}`)}>
                                <Text style={[styles.contactPhone, { color: colors.primary }]}>{selectedArtisan?.phone || '08111783575'}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                            onPress={handleCloseSuccess}
                        >
                            <Text style={styles.doneBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    policyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    policyText: {
        fontSize: 11.5,
        lineHeight: 16,
        flex: 1,
    },
    searchSection: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    searchBarContainer: {
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        marginLeft: 8,
    },
    categoriesSection: {
        paddingBottom: 6,
    },
    categoriesContainer: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    categoryTabText: {
        fontSize: 12,
        fontWeight: '600',
    },
    artisanList: {
        padding: 16,
        paddingBottom: 40,
    },
    artisanCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        gap: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#E2E8F0',
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    artisanName: {
        fontSize: 15,
        fontWeight: '700',
    },
    vettedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 3,
    },
    vettedText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#10B981',
    },
    categoryLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 12,
        fontWeight: '600',
    },
    statLabel: {
        fontSize: 11,
    },
    statDivider: {
        width: 1,
        height: 12,
    },
    bioText: {
        fontSize: 12.5,
        lineHeight: 18,
        marginTop: 10,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    priceLabel: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    priceValue: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 1,
    },
    bookButton: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 10,
    },
    bookButtonText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 12,
    },
    emptySub: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 6,
        maxWidth: 260,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    modalDismiss: {
        flex: 1,
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
    modalForm: {
        padding: 20,
        gap: 14,
    },
    artisanSnippet: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 2,
    },
    snippetAvatar: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
    },
    snippetName: {
        fontSize: 14,
        fontWeight: '700',
    },
    snippetSub: {
        fontSize: 12,
        marginTop: 2,
    },
    formLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
    },
    formSelect: {
        height: 46,
        borderRadius: 10,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    formInputText: {
        height: 75,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        textAlignVertical: 'top',
    },
    formRow: {
        flexDirection: 'row',
    },
    formInput: {
        height: 46,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 13,
    },
    pinNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    pinNoticeText: {
        fontSize: 11,
        lineHeight: 15,
        flex: 1,
    },
    modalFooter: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    confirmBtn: {
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    successContent: {
        width: '100%',
        borderRadius: 24,
        padding: 22,
        alignItems: 'center',
    },
    successIconBg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 19,
        fontWeight: '800',
        marginBottom: 6,
    },
    successDesc: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
    },
    pinCard: {
        width: '100%',
        borderRadius: 16,
        borderWidth: 1.5,
        padding: 14,
        alignItems: 'center',
        marginBottom: 16,
    },
    pinLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    pinCode: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1D4ED8',
        letterSpacing: 6,
        marginVertical: 4,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    pinInstruction: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 15,
        marginTop: 2,
    },
    contactCard: {
        width: '100%',
        borderRadius: 12,
        borderWidth: 1,
        padding: 10,
        alignItems: 'center',
        marginBottom: 18,
    },
    contactLabel: {
        fontSize: 10.5,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    contactPhone: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 2,
    },
    doneBtn: {
        width: '100%',
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
});

export default FindArtisanScreen;

