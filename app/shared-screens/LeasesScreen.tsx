import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BackButton from '@/components/BackButton';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useLeases } from '../../hooks/useLeases';



 


const LeasesScreen = () => {
    const router = useRouter();
   const { colors } = useTheme();
    const { leases, loading, fetchLeases } = useLeases();

    useEffect(() => {
        fetchLeases();
    }, []);

    const renderLeaseCard = ({ item }: { item: any }) => {
        const property = item.property;
        const owner = property?.owner;

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({
                    pathname: '/shared-screens/LeaseDetailsScreen',
                    params: { rentalId: item.id }
                })}
                activeOpacity={0.7}
            >
                <View style={styles.cardContent}>
                    <View style={styles.propertyInfo}>
                        <Text style={[styles.propertyTitle, { color: colors.text }]}>{property?.title || 'Property'}</Text>
                        <Text style={[styles.landlordName, { color: colors.text + '80' }]}>
                            Landlord: {owner?.first_name} {owner?.last_name}
                        </Text>
                        
                        <View style={styles.badgeRow}>
                            <View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
                                <View style={styles.statusDot} />
                                <Text style={[styles.statusText, { color: colors.primary }]}>Active Lease</Text>
                            </View>
                            <Text style={[styles.dateRange, { color: colors.text + '60' }]}>
                                {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.priceSection}>
                        <Text style={[styles.priceLabel, { color: colors.text + '60' }]}>Annual Rent</Text>
                        <Text style={[styles.priceValue, { color: colors.primary }]}>
                            ₦{Number(item.amount).toLocaleString()}
                        </Text>
                    </View>
                </View>
                
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <Text style={[styles.viewDetailsText, { color: colors.primary }]}>View Lease Details</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper withScrollView={false} style={{ backgroundColor: colors.background }}>
            <View style={styles.header}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Leases</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={leases}
                keyExtractor={(item) => item.id}
                renderItem={renderLeaseCard}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} />
                        ) : (
                            <>
                                <Ionicons name="document-text-outline" size={64} color={colors.text + '20'} />
                                <Text style={[styles.emptyText, { color: colors.text + '80' }]}>No confirmed leases found</Text>
                                <TouchableOpacity 
                                    style={styles.exploreBtn}
                                    onPress={() => router.push('/(tabs)')}
                                >
                                    <Text style={styles.exploreBtnText}>Explore Properties</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchLeases} tintColor={colors.primary} />
                }
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({

    

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
      
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    listContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginBottom: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    propertyInfo: {
        flex: 1,
    },
    propertyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    landlordName: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 12,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 99,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#10B981',
    },
    dateRange: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    priceSection: {
        alignItems: 'flex-end',
    },
    priceLabel: {
        fontSize: 11,
        color: '#94A3B8',
        marginBottom: 2,
    },
    priceValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1D4ED8',
    },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    viewDetailsText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#407BFF',
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#64748B',
        marginTop: 16,
        marginBottom: 24,
    },
    exploreBtn: {
        backgroundColor: '#1D4ED8',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    exploreBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default LeasesScreen;
