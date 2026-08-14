import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useAgentManagement } from '../../hooks/useAgentManagement';

const ManageAgentsScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { agents, loading, fetchAgents, createInvite, revokeAgent } = useAgentManagement();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const onRefresh = async () => {
        setIsRefreshing(true);
        await fetchAgents();
        setIsRefreshing(false);
    };

    const handleInvite = async () => {
        const code = await createInvite();
        if (code) {
            router.push({
                pathname: '/landlord-screens/invite-agent',
                params: { code }
            });
        }
    };

    const handleRevoke = (agentId: string, name: string) => {
        Alert.alert(
            'Revoke Access',
            `Are you sure you want to revoke access for ${name}? they will no longer be able to manage your properties.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Revoke', style: 'destructive', onPress: () => revokeAgent(agentId) }
            ]
        );
    };

    const renderAgentItem = ({ item }: { item: any }) => {
        const isPending = item.status === 'pending';
        const isRevoked = item.status === 'revoked';
        const agentName = item.users
            ? `${item.users.first_name || ''} ${item.users.last_name || ''}`.trim() || item.users.email || 'Active Agent'
            : 'Pending Agent';
        const profilePhoto = item.users?.user_biodata?.profile_photo;

        return (
            <View style={[styles.agentCard, { backgroundColor: colors.card }]}>
                <View style={styles.agentInfo}>
                    {isPending ? (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="mail-outline" size={24} color={colors.primary} />
                        </View>
                    ) : (
                        <Image
                            source={profilePhoto ? { uri: profilePhoto } : require('../../assets/images/eicon.png')}
                            style={styles.avatar}
                        />
                    )}
                    <View style={styles.textContainer}>
                        <Text style={[styles.agentName, { color: colors.text }]}>{agentName}</Text>
                        <Text style={[styles.agentStatus, { color: isPending ? colors.primary : isRevoked ? '#FF3B30' : colors.textSecondary }]}>
                            {isRevoked ? 'Revoked' : isPending ? `Invite Code: ${item.invite_code}` : `${item.assigned_properties_count || 0} Properties Assigned`}
                        </Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    {!isPending && !isRevoked && (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.primary + '10' }]}
                            onPress={() => router.push({
                                pathname: '/landlord-screens/assign-properties',
                                params: {
                                    agentId: item.agent_id,
                                    agentName,
                                    agentEmail: item.users?.email || '',
                                    agentPhoto: profilePhoto || ''
                                }
                            })}
                        >
                            <Text style={[styles.actionText, { color: colors.primary }]}>Manage</Text>
                        </TouchableOpacity>
                    )}
                    {!isRevoked && (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#FF3B3015' }]}
                            onPress={() => handleRevoke(item.agent_id || item.id, agentName)}
                        >
                            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Manage Agents</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={agents}
                keyExtractor={(item) => item.id}
                renderItem={renderAgentItem}
                contentContainerStyle={styles.listContent}
                onRefresh={onRefresh}
                refreshing={isRefreshing}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color={colors.textSecondary + '40'} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No agents invited yet.
                            </Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={loading && !isRefreshing ? <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} /> : null}
            />

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={handleInvite}
            >
                <Ionicons name="add" size={30} color="#FFF" />
            </TouchableOpacity>
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
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    agentCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    agentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        marginLeft: 12,
        flex: 1,
    },
    agentName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    agentStatus: {
        fontSize: 13,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
});

export default ManageAgentsScreen;
