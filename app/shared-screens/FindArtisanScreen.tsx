import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
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
import { useLeases } from '../../hooks/useLeases';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface Artisan {
    id: string;
    name: string;
    category: string;
    rating: number;
    reviewsCount: number;
    completedJobs: number;
    price: string;
    location: string;
    avatar: string;
    skills: string[];
    bio: string;
    phone: string;
}

const MOCK_ARTISANS: Artisan[] = [
    {
        id: '1',
        name: 'Emeka Okafor',
        category: 'plumbing',
        rating: 4.9,
        reviewsCount: 128,
        completedJobs: 142,
        price: 'From ₦4,500/hr',
        location: 'Lekki, Lagos',
        avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
        skills: ['Pipe fitting', 'Leak detection', 'Drain declogging', 'Water pump repair'],
        bio: 'Over 8 years of experience in residential plumbing. Vetted expert in fixing leaks, clogs, and installing modern kitchen/bathroom fixtures.',
        phone: '+234 803 123 4567'
    },
    {
        id: '2',
        name: 'Tunde Balogun',
        category: 'electrical',
        rating: 4.8,
        reviewsCount: 94,
        completedJobs: 108,
        price: 'From ₦5,000/hr',
        location: 'Ikeja, Lagos',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        skills: ['Wiring', 'Inverter setup', 'Fuse repair', 'Appliance diagnosis'],
        bio: 'Certified electrician specializing in inverter installations, safety inspections, wiring repairs, and general electrical maintenance.',
        phone: '+234 802 987 6543'
    },
    {
        id: '3',
        name: 'Musa Yusuf',
        category: 'general', // AC / Cooling
        rating: 4.95,
        reviewsCount: 82,
        completedJobs: 96,
        price: 'From ₦6,000/hr',
        location: 'Victoria Island, Lagos',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        skills: ['AC installation', 'Gas refilling', 'Servicing', 'Refrigeration'],
        bio: 'Professional heating and cooling expert. Fast response time for air conditioning maintenance, leak fixes, and gas topups.',
        phone: '+234 815 111 2222'
    },
    {
        id: '4',
        name: 'Chioma Nnaji',
        category: 'painting',
        rating: 4.7,
        reviewsCount: 65,
        completedJobs: 73,
        price: 'From ₦4,000/hr',
        location: 'Yaba, Lagos',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        skills: ['Wall painting', 'Wallpaper fixing', 'Screeding', 'Color consultancy'],
        bio: 'Professional interior painter and wall stylist. High attention to detail, using high-quality protective paints and premium finish screeding.',
        phone: '+234 703 555 7777'
    },
    {
        id: '5',
        name: 'Abubakar Ibrahim',
        category: 'carpentry',
        rating: 4.85,
        reviewsCount: 112,
        completedJobs: 120,
        price: 'From ₦5,000/hr',
        location: 'Surulere, Lagos',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
        skills: ['Furniture repair', 'Cabinet installation', 'Door fixing', 'Roof framing'],
        bio: 'Vetted carpentry expert. Highly skilled in bespoke furniture design, fixing sagging cabinet doors, door hinges, and wooden structure framing.',
        phone: '+234 908 444 8888'
    },
    {
        id: '6',
        name: 'Femi Adebayo',
        category: 'security',
        rating: 4.9,
        reviewsCount: 41,
        completedJobs: 48,
        price: 'From ₦7,500/hr',
        location: 'Ikoyi, Lagos',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
        skills: ['CCTV setup', 'Smart lock install', 'Gate automation', 'Intercom fix'],
        bio: 'Smart home security installer. Expert in setting up IP surveillance cameras, gate automations, and wireless smart intercom systems.',
        phone: '+234 809 333 9999'
    }
];

const CATEGORIES = [
    { id: 'all', name: 'All', icon: 'grid-outline' },
    { id: 'plumbing', name: 'Plumbing', icon: 'water-outline' },
    { id: 'electrical', name: 'Electrical', icon: 'flash-outline' },
    { id: 'carpentry', name: 'Carpentry', icon: 'hammer-outline' },
    { id: 'painting', name: 'Painting', icon: 'color-palette-outline' },
    { id: 'security', name: 'Security', icon: 'shield-outline' },
    { id: 'general', name: 'General', icon: 'build-outline' },
];

const FindArtisanScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showSuccess, showError } = useToast();
    const { leases, fetchLeases } = useLeases();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedArtisan, setSelectedArtisan] = useState<Artisan | null>(null);
    const [bookingModalVisible, setBookingModalVisible] = useState(false);

    // Booking Form State
    const [selectedProperty, setSelectedProperty] = useState<any>(null);
    const [jobDescription, setJobDescription] = useState('');
    const [bookingDate, setBookingDate] = useState('');
    const [bookingTime, setBookingTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);

    React.useEffect(() => {
        fetchLeases().then(data => {
            if (data && data.length > 0) {
                setSelectedProperty(data[0]);
            }
        });
    }, []);

    // Filter artisans based on category and search query
    const filteredArtisans = useMemo(() => {
        return MOCK_ARTISANS.filter(artisan => {
            const matchesCategory = selectedCategory === 'all' || artisan.category === selectedCategory;
            const matchesSearch =
                artisan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                artisan.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase())) ||
                artisan.bio.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [searchQuery, selectedCategory]);

    const handleOpenBooking = (artisan: Artisan) => {
        setSelectedArtisan(artisan);
        setBookingModalVisible(true);
    };

    const handleConfirmBooking = async () => {
        if (!selectedProperty) {
            showError({ type: 'unknown', title: 'Booking Failed', message: 'Please select a property for the maintenance job.' });
            return;
        }
        if (!jobDescription.trim()) {
            showError({ type: 'unknown', title: 'Booking Failed', message: 'Please describe the issue.' });
            return;
        }
        if (!bookingDate || !bookingTime) {
            showError({ type: 'unknown', title: 'Booking Failed', message: 'Please specify the date and time.' });
            return;
        }

        setIsSubmitting(true);
        // Simulate booking API call
        setTimeout(() => {
            setIsSubmitting(false);
            setBookingModalVisible(false);
            setSuccessModalVisible(true);
        }, 1500);
    };

    const handleCloseSuccess = () => {
        setSuccessModalVisible(false);
        setJobDescription('');
        setBookingDate('');
        setBookingTime('');
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
                            <Text style={styles.vettedText}>Vetted</Text>
                        </View>
                    </View>
                    <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)} Specialist
                    </Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="star" size={13} color="#F59E0B" />
                            <Text style={[styles.statValue, { color: colors.text }]}>{item.rating}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>({item.reviewsCount})</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Ionicons name="briefcase-outline" size={13} color={colors.primary} />
                            <Text style={[styles.statValue, { color: colors.text }]}>{item.completedJobs}+</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Jobs</Text>
                        </View>
                    </View>
                </View>
            </View>

            <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.bio}
            </Text>

            <View style={styles.skillsContainer}>
                {item.skills.slice(0, 3).map((skill, index) => (
                    <View key={index} style={[styles.skillTag, { backgroundColor: colors.border + '30', borderColor: colors.border }]}>
                        <Text style={[styles.skillText, { color: colors.textSecondary }]}>{skill}</Text>
                    </View>
                ))}
                {item.skills.length > 3 && (
                    <View style={[styles.skillTag, { backgroundColor: colors.border + '30', borderColor: colors.border }]}>
                        <Text style={[styles.skillText, { color: colors.textSecondary }]}>+{item.skills.length - 3} more</Text>
                    </View>
                )}
            </View>

            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <View>
                    <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Rate</Text>
                    <Text style={[styles.priceValue, { color: colors.primary }]}>{item.price}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.bookButton, { backgroundColor: colors.primary }]}
                    onPress={() => handleOpenBooking(item)}
                >
                    <Text style={styles.bookButtonText}>Book Artisan</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScreenWrapper withScrollView={true} style={{ backgroundColor: colors.background }}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Find Verified Artisan</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={[styles.searchBarContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search plumbing, wiring, locks..."
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
            </View>

            {/* Horizontal Categories Filter */}
            <View style={styles.categoriesSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                >
                    {CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryTab,
                                    { backgroundColor: colors.card, borderColor: colors.border },
                                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                                onPress={() => setSelectedCategory(cat.id)}
                            >
                                <Ionicons
                                    name={cat.icon as any}
                                    size={15}
                                    color={isSelected ? '#FFF' : colors.textSecondary}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[styles.categoryTabText, { color: isSelected ? '#FFF' : colors.text }]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Artisan List */}
            <FlatList
                data={filteredArtisans}
                keyExtractor={(item) => item.id}
                renderItem={renderArtisanCard}
                contentContainerStyle={styles.artisanList}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={48} color={colors.textSecondary + '60'} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Artisans Found</Text>
                        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                            Try searching for something else or check other categories.
                        </Text>
                    </View>
                )}
            />

            {/* Booking Modal */}
            <Modal
                visible={bookingModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setBookingModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalDismiss} onPress={() => setBookingModalVisible(false)} />
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <View style={styles.modalHandle} />
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Schedule Artisan</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setBookingModalVisible(false)}
                            >
                                <Ionicons name="close" size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalForm} showsVerticalScrollIndicator={false}>
                            {selectedArtisan && (
                                <View style={styles.artisanSnippet}>
                                    <Image source={{ uri: selectedArtisan.avatar }} style={styles.snippetAvatar} contentFit="cover" />
                                    <View>
                                        <Text style={[styles.snippetName, { color: colors.text }]}>{selectedArtisan.name}</Text>
                                        <Text style={[styles.snippetSub, { color: colors.textSecondary }]}>
                                            {selectedArtisan.category.charAt(0).toUpperCase() + selectedArtisan.category.slice(1)} • {selectedArtisan.price}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Property Selection */}
                            <Text style={[styles.formLabel, { color: colors.text }]}>Select Property</Text>
                            <View style={[styles.formSelect, { borderColor: colors.border }]}>
                                <Ionicons name="home-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                                <Text style={{ color: colors.text, flex: 1, fontSize: 14 }}>
                                    {selectedProperty ? selectedProperty.property?.title : 'Select active lease'}
                                </Text>
                            </View>

                            {/* Issue Description */}
                            <Text style={[styles.formLabel, { color: colors.text }]}>Describe the Issue</Text>
                            <TextInput
                                style={[styles.formInputText, { color: colors.text, borderColor: colors.border }]}
                                multiline
                                numberOfLines={3}
                                placeholder="E.g., kitchen sink water pipe leaking and wetting the kitchen floor."
                                placeholderTextColor={colors.textSecondary}
                                value={jobDescription}
                                onChangeText={setJobDescription}
                            />

                            {/* Preferred Date & Time */}
                            <View style={styles.formRow}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={[styles.formLabel, { color: colors.text }]}>Preferred Date</Text>
                                    <TextInput
                                        style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                                        placeholder="e.g. 2026-06-10"
                                        placeholderTextColor={colors.textSecondary}
                                        value={bookingDate}
                                        onChangeText={setBookingDate}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={[styles.formLabel, { color: colors.text }]}>Preferred Time</Text>
                                    <TextInput
                                        style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                                        placeholder="e.g. 10:00 AM"
                                        placeholderTextColor={colors.textSecondary}
                                        value={bookingTime}
                                        onChangeText={setBookingTime}
                                    />
                                </View>
                            </View>

                            <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                                * Vetted artisans are third-party professionals verified by EdenHome. Payment is negotiated directly with the artisan.
                            </Text>
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
                                    <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Success Modal */}
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
                        <Text style={[styles.successTitle, { color: colors.text }]}>Artisan Scheduled!</Text>
                        <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
                            {selectedArtisan?.name} has been scheduled to visit your property for maintenance.
                        </Text>
                        <View style={[styles.contactCard, { backgroundColor: colors.border + '30', borderColor: colors.border }]}>
                            <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Artisan Contact</Text>
                            <Text style={[styles.contactPhone, { color: colors.primary }]}>{selectedArtisan?.phone}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                            onPress={handleCloseSuccess}
                        >
                            <Text style={styles.doneBtnText}>Back to Maintenance</Text>
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
    headerTitle: { fontSize: 18, fontWeight: '700' },
    searchSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchBarContainer: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        marginLeft: 8,
    },
    categoriesSection: {
        paddingBottom: 8,
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
        borderRadius: 16,
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
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
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
    categoryLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
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
        fontSize: 13,
        lineHeight: 18,
        marginTop: 12,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 12,
    },
    skillTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
    },
    skillText: {
        fontSize: 10,
        fontWeight: '500',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    priceLabel: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    priceValue: {
        fontSize: 14,
        fontWeight: '800',
        marginTop: 1,
    },
    bookButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
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
        maxWidth: 240,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
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
        gap: 16,
    },
    artisanSnippet: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 4,
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
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        backgroundColor: '#FAFAFA',
    },
    formInputText: {
        height: 80,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        textAlignVertical: 'top',
    },
    formRow: {
        flexDirection: 'row',
    },
    formInput: {
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 14,
    },
    disclaimerText: {
        fontSize: 11,
        lineHeight: 16,
        fontStyle: 'italic',
        marginTop: 4,
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
        fontSize: 15,
        fontWeight: '700',
    },
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    successContent: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    successIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    successDesc: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    contactCard: {
        width: '100%',
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        alignItems: 'center',
        marginBottom: 24,
    },
    contactLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    contactPhone: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 4,
    },
    doneBtn: {
        width: '100%',
        height: 48,
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
