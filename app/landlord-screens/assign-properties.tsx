import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/CustomButton';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useAgentManagement } from '../../hooks/useAgentManagement';
import { useLandlord } from '../../hooks/useLandlord';

const AssignPropertiesScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { agentId, agentName, agentEmail, agentPhoto } = useLocalSearchParams<{ agentId: string; agentName: string; agentEmail?: string; agentPhoto?: string }>();
    const { fetchAssignments, updateAssignments, loading: agentLoading } = useAgentManagement();
    const { activeListings, loading: landlordLoading, refetch } = useLandlord();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const init = async () => {
            if (!agentId) {
                setInitializing(false);
                return;
            }
            const currentAssignments = await fetchAssignments(agentId);
            const assignedIds = new Set(currentAssignments.map((a: any) => a.property_id));
            setSelectedIds(assignedIds);
            setInitializing(false);
        };
        init();
    }, [agentId, fetchAssignments]);

    const toggleProperty = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleSave = async () => {
        if (!agentId) return;
        const success = await updateAssignments(agentId, Array.from(selectedIds));
        if (success) {
            router.back();
        }
    };

    const renderPropertyItem = ({ item }: { item: any }) => {
        const isSelected = selectedIds.has(item.id);
        const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;

        return (
            <TouchableOpacity
                style={[styles.propertyCard, { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : 'transparent' }]}
                onPress={() => toggleProperty(item.id)}
                activeOpacity={0.7}
            >
                <Image
                    source={imageUrl ? { uri: imageUrl } : require('../../assets/images/Homes/home1.png')}
                    style={styles.propertyImage}
                />
                <View style={styles.propertyInfo}>
                    <Text style={[styles.propertyTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.propertyLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                        <Ionicons name="location-outline" size={12} /> {item.location}
                    </Text>
                    <Text style={[styles.propertyPrice, { color: colors.primary }]}>N{item.price?.toLocaleString()}</Text>
                </View>
                <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: isSelected ? colors.primary : 'transparent' }]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </View>
            </TouchableOpacity>
        );
    };

    if (initializing || landlordLoading) {
        return (
            <ScreenWrapper style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { color: colors.text }]}>Assign Properties</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Agent Profile Header */}
            <View style={[styles.agentProfileContainer, { backgroundColor: colors.card, borderBottomColor: colors.card }]}>
                <Image
                    source={agentPhoto ? { uri: agentPhoto } : require('../../assets/images/eicon.png')}
                    style={styles.agentAvatar}
                />
                <View style={styles.agentProfileInfo}>
                    <Text style={[styles.agentNameText, { color: colors.text }]}>{agentName}</Text>
                    {agentEmail ? (
                        <Text style={[styles.agentEmailText, { color: colors.textSecondary }]}>{agentEmail}</Text>
                    ) : null}
                    <View style={[styles.agentBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.agentBadgeText, { color: colors.primary }]}>Agent</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={activeListings}
                keyExtractor={(item) => item.id}
                renderItem={renderPropertyItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="business-outline" size={64} color={colors.textSecondary + '40'} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No properties found. List a property first.
                        </Text>
                    </View>
                }
                extraData={selectedIds}
            />

            <View style={[styles.footer, { backgroundColor: colors.background }]}>
                <Text style={[styles.selectionCount, { color: colors.text }]}>
                    {selectedIds.size} {selectedIds.size === 1 ? 'Property' : 'Properties'} Selected
                </Text>
                <CustomButton
                    title="Save Assignments"
                    onPress={handleSave}
                    loading={agentLoading}
                    style={styles.saveButton}
                />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerText: {
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    agentProfileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    agentAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#eee',
    },
    agentProfileInfo: {
        marginLeft: 16,
        flex: 1,
    },
    agentNameText: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    agentEmailText: {
        fontSize: 14,
        marginBottom: 6,
    },
    agentBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    agentBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    listContent: {
        padding: 16,
        paddingBottom: 120,
    },
    propertyCard: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    propertyImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#eee',
    },
    propertyInfo: {
        flex: 1,
        marginLeft: 12,
    },
    propertyTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    propertyLocation: {
        fontSize: 12,
        marginBottom: 4,
    },
    propertyPrice: {
        fontSize: 14,
        fontWeight: '700',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectionCount: {
        fontSize: 14,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        marginLeft: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
    },
});

export default AssignPropertiesScreen;
