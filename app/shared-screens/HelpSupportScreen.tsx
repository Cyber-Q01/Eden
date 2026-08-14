import BackButton from '@/components/BackButton';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    LayoutAnimation,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

const FAQ_DATA: FAQItem[] = [
    {
        id: '1',
        question: 'How do i book an inspection',
        answer: 'Tap Book inspection on any listings. Select your preferred date and time. 2 credits are required per booking.',
    },
    {
        id: '2',
        question: 'How are credits used',
        answer: 'Credits are used to book inspections (1 credit/unit per booking) and unlock properties for direct viewing of landlord contact details.',
    },
    {
        id: '3',
        question: 'How does escrow payment work',
        answer: 'Your payment is held securely in escrow and only released to the landlord after successful verification of the property tenancy agreement terms.',
    },
    {
        id: '4',
        question: 'which document do i need',
        answer: 'You will need a valid government-issued ID (NIN, Driver\'s License, or International Passport) and proof of income/employment for tenant verification.',
    },
    {
        id: '5',
        question: 'how do you report a fake listing',
        answer: 'Tap on the flag or report button on the property listing page, or contact our support team directly with the details of the listing.',
    },
];

const HelpSupportScreen = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    const handleLiveChat = () => {
        Alert.alert(
            'Live Chat Support',
            'Connecting you to a support agent. Please wait...',
            [{ text: 'OK' }]
        );
    };

    const handleWhatsApp = async () => {
        const url = 'https://wa.me/2348000000000?text=Hello%20EdenHome%20Support';
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'WhatsApp is not installed on this device.');
        }
    };

    const handleEmail = () => {
        Linking.openURL('mailto:support@Eden.ng?subject=EdenHome%20Support%20Request');
    };

    const filteredFAQs = FAQ_DATA.filter(item =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} withScrollView={true}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* How can we help banner */}
                <LinearGradient
                    colors={['#1D4ED8', '#1E3A8A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.heroBanner}
                >
                    <View style={styles.decorCircle1} />
                    <View style={styles.decorCircle2} />

                    <View style={styles.heroLeft}>
                        <View style={styles.supportIconBg}>
                            <Ionicons name="headset-outline" size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.heroTextContainer}>
                            <Text style={styles.heroTitle}>How can we help you</Text>
                            <Text style={styles.heroSubtitle}>We’re available Mon-Sat. 8AM to 8PM WAT</Text>
                        </View>
                    </View>

                    <View style={styles.statusContainer}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Online</Text>
                    </View>
                </LinearGradient>

                {/* Search input */}
                <View style={[
                    styles.searchContainer,
                    {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        shadowColor: isDark ? '#000000' : '#000000'
                    }
                ]}>
                    <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search for help topics..."
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

                {/* Contact Section */}
                <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>CONTACT US</Text>
                <View style={styles.contactRow}>
                    <TouchableOpacity
                        style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={handleLiveChat}
                        activeOpacity={0.7}
                    >
                        <View style={styles.contactIconBg}>
                            <Ionicons name="chatbubbles-outline" size={24} color="#1D4ED8" />
                        </View>
                        <Text style={[styles.contactLabel, { color: colors.text }]}>Live Chat</Text>
                        <Text style={[styles.contactSub, { color: colors.textSecondary }]}>Instant</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={handleWhatsApp}
                        activeOpacity={0.7}
                    >
                        <View style={styles.contactIconBg}>
                            <Ionicons name="logo-whatsapp" size={24} color="#1D4ED8" />
                        </View>
                        <Text style={[styles.contactLabel, { color: colors.text }]}>WhatsApp</Text>
                        <Text style={[styles.contactSub, { color: colors.textSecondary }]}>Fast reply</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={handleEmail}
                        activeOpacity={0.7}
                    >
                        <View style={styles.contactIconBg}>
                            <Ionicons name="mail-outline" size={24} color="#1D4ED8" />
                        </View>
                        <Text style={[styles.contactLabel, { color: colors.text }]}>Send Email</Text>
                        <Text style={[styles.contactSub, { color: colors.textSecondary }]}>24hr reply</Text>
                    </TouchableOpacity>
                </View>

                {/* FAQ Section */}
                <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: 24 }]}>
                    FREQUENTLY ASKED
                </Text>

                <View style={[styles.faqGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {filteredFAQs.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={{ color: colors.textSecondary }}>No match found for your search.</Text>
                        </View>
                    ) : (
                        filteredFAQs.map((item, index) => {
                            const isExpanded = expandedId === item.id;
                            const isLastItem = index === filteredFAQs.length - 1;

                            return (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.faqItem,
                                        !isLastItem && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={styles.faqHeader}
                                        onPress={() => toggleExpand(item.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.faqQuestion, { color: colors.text }]}>
                                            {item.question}
                                        </Text>
                                        <Ionicons
                                            name={isExpanded ? "remove-circle-outline" : "add-circle-outline"}
                                            size={22}
                                            color="#1D4ED8"
                                        />
                                    </TouchableOpacity>

                                    {isExpanded && (
                                        <View style={styles.faqContent}>
                                            <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                                                {item.answer}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    heroBanner: {
        borderRadius: 20,
        padding: 20,
        height: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        marginBottom: 24,
    },
    decorCircle1: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -20,
        left: 100,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    heroLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    supportIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroTextContainer: {
        flex: 1,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 2,
    },
    heroSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 11,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981', // Green dot
    },
    statusText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
        fontWeight: '500',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        padding: 0, // Remove Android padding
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    contactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    contactCard: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 2,
    },
    contactIconBg: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#407BFF15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    contactLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    contactSub: {
        fontSize: 10,
    },
    faqGroup: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
    },
    faqItem: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    },
    faqQuestion: {
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
        textTransform: 'capitalize',
    },
    faqContent: {
        marginTop: 10,
        paddingRight: 16,
    },
    faqAnswer: {
        fontSize: 13,
        lineHeight: 18,
    },
    emptyContainer: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default HelpSupportScreen;
