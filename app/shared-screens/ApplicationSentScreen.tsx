import CustomButton from '@/components/CustomButton';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';

const ApplicationSentScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { property, landlord, move_in_date, lease_duration } = useLocalSearchParams<{
        property?: string;
        landlord?: string;
        move_in_date?: string;
        lease_duration?: string;
    }>();

    const handleRateLandlord = () => {
        Alert.alert(
            'Rate Your Landlord',
            'Landlord rating feature is coming soon!',
            [{ text: 'OK' }]
        );
    };

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} withScrollView={true}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={{ width: 40 }} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Application Status</Text>
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
                    <Text style={[styles.title, { color: colors.text }]}>Application Sent!</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>
                        Your application is now with the landlord for review.
                    </Text>
                </View>

                {/* Summary Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Application Summary</Text>
                    
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Property</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
                            {property || 'Selected Property'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Landlord</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {landlord || 'Landlord Name'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Move-in Date</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {move_in_date || 'TBD'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Lease Duration</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {lease_duration || '1 Year'}
                        </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
                        <View style={styles.badgeContainer}>
                            <View style={[styles.statusBadge, { backgroundColor: '#FFF3E0' }]}>
                                <Text style={styles.statusBadgeText}>Pending Review</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* What Happens Next Card */}
                <View style={[styles.nextCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                    <View style={styles.nextHeader}>
                        <Ionicons name="time" size={20} color={colors.primary} />
                        <Text style={[styles.nextTitle, { color: colors.primary }]}>What happens next?</Text>
                    </View>
                    <Text style={[styles.nextText, { color: colors.textSecondary }]}>
                        • The landlord will review your profile, document uploads, and application message.
                    </Text>
                    <Text style={[styles.nextText, { color: colors.textSecondary, marginTop: 6 }]}>
                        • You will receive a push notification and SMS once they accept or decline (usually within 48 hours).
                    </Text>
                    <Text style={[styles.nextText, { color: colors.textSecondary, marginTop: 6 }]}>
                        • If accepted, you can pay directly — your funds are held safely in escrow until you confirm the property.
                    </Text>
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <CustomButton
                    title="Rate Your Landlord"
                    onPress={handleRateLandlord}
                    style={styles.primaryButton}
                />
                
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
    badgeContainer: {
        flex: 2,
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E65100',
    },
    divider: {
        height: 1,
        width: '100%',
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
});

export default ApplicationSentScreen;
