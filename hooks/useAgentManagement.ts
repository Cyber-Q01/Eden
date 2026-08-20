import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';

export interface AgentItem {
    id: string;
    agent_id?: string | null;
    invite_code: string;
    status: 'pending' | 'active' | 'revoked';
    created_at: string;
    assigned_properties_count: number;
    users?: {
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        user_biodata?: {
            phone_number?: string;
            profile_photo?: string;
        };
    } | null;
}

export const useAgentManagement = () => {
    const { user } = useAuth();
    const { showError, showSuccess } = useToast();
    const [agents, setAgents] = useState<AgentItem[]>([]);
    const [loading, setLoading] = useState(false);

    // 1. Fetch Agents for this Landlord directly via Supabase with explicit FK
    const fetchAgents = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: dbData, error: dbError } = await supabase
                .from('landlord_agents')
                .select(`
                    id,
                    landlord_id,
                    agent_id,
                    invite_code,
                    status,
                    created_at,
                    accepted_at,
                    users:users!landlord_agents_agent_id_fkey(
                        id,
                        first_name,
                        last_name,
                        email,
                        user_biodata:user_biodata!user_biodata_id_fkey(
                            phone_number,
                            profile_photo
                        )
                    )
                `)
                .eq('landlord_id', user.id)
                .order('created_at', { ascending: false });

            if (dbError) {
                console.warn('[useAgentManagement] Direct fetch notice:', dbError.message);
            }

            // Fetch property counts assigned to each agent
            const { data: props } = await supabase
                .from('properties')
                .select('id, agent_id')
                .eq('landlord_id', user.id);

            const mapped: AgentItem[] = (dbData || []).map((item: any) => {
                const agentUser = Array.isArray(item.users) ? item.users[0] : item.users;
                const biodata = Array.isArray(agentUser?.user_biodata) ? agentUser.user_biodata[0] : agentUser?.user_biodata;
                const assignedCount = (props || []).filter((p: any) => p.agent_id && p.agent_id === item.agent_id).length;

                return {
                    id: item.id,
                    agent_id: item.agent_id,
                    invite_code: item.invite_code,
                    status: (item.status || 'pending').toLowerCase() as any,
                    created_at: item.created_at || new Date().toISOString(),
                    assigned_properties_count: assignedCount,
                    users: agentUser ? {
                        id: agentUser.id,
                        first_name: agentUser.first_name,
                        last_name: agentUser.last_name,
                        email: agentUser.email,
                        user_biodata: biodata,
                    } : null,
                };
            });

            setAgents(mapped);
        } catch (e: any) {
            console.warn('[useAgentManagement] Fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // 2. Generate clean 6-character invite code and save directly to Supabase
    const createInvite = async (): Promise<string | null> => {
        if (!user) return null;
        setLoading(true);
        try {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const { error: insErr } = await supabase
                .from('landlord_agents')
                .insert([
                    {
                        landlord_id: user.id,
                        invite_code: code,
                        status: 'pending',
                        created_at: new Date().toISOString(),
                    },
                ]);

            if (insErr) {
                console.warn('[useAgentManagement] Insert notice:', insErr.message);
            }

            showSuccess('6-character invite code generated!');
            fetchAgents();
            return code;
        } catch (e: any) {
            const err = await handleError(e);
            showError(err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // 3. Revoke Agent Access directly in Supabase
    const revokeAgent = async (agentIdOrRecordId: string) => {
        if (!user) return;
        setLoading(true);
        try {
            // Update status to revoked
            await supabase
                .from('landlord_agents')
                .update({ status: 'revoked' })
                .or(`agent_id.eq.${agentIdOrRecordId},id.eq.${agentIdOrRecordId}`)
                .eq('landlord_id', user.id);

            // Unlink agent from properties
            await supabase
                .from('properties')
                .update({ agent_id: null })
                .eq('landlord_id', user.id)
                .eq('agent_id', agentIdOrRecordId);

            showSuccess('Agent access revoked');
            fetchAgents();
        } catch (e: any) {
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    // 4. Fetch Property Assignments for this Agent
    const fetchAssignments = useCallback(async (agentId: string) => {
        if (!user) return [];
        try {
            const { data: props, error } = await supabase
                .from('properties')
                .select('id, title, location, agent_id')
                .eq('landlord_id', user.id);

            if (!error && props) {
                return props.map((p: any) => ({
                    property_id: p.id,
                    is_assigned: p.agent_id === agentId,
                    property: p,
                }));
            }
            return [];
        } catch (e) {
            return [];
        }
    }, [user]);

    // 5. Update Property Assignments directly in Supabase
    const updateAssignments = async (agentId: string, propertyIds: string[]) => {
        if (!user) return false;
        setLoading(true);
        try {
            // Unlink agent from all landlord properties first
            await supabase
                .from('properties')
                .update({ agent_id: null })
                .eq('landlord_id', user.id)
                .eq('agent_id', agentId);

            // Assign agent to selected properties
            if (propertyIds.length > 0) {
                await supabase
                    .from('properties')
                    .update({ agent_id: agentId })
                    .eq('landlord_id', user.id)
                    .in('id', propertyIds);
            }

            showSuccess('Property assignments updated successfully');
            fetchAgents();
            return true;
        } catch (e: any) {
            const err = await handleError(e);
            showError(err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // 6. Accept Agent Invite directly in Supabase (with landlord lookup & role update)
    const acceptInvite = async (inviteCode: string): Promise<boolean> => {
        if (!user) return false;
        setLoading(true);
        try {
            const cleanCode = inviteCode.trim().toUpperCase();

            // Look up invite code in landlord_agents
            const { data: invite, error: findErr } = await supabase
                .from('landlord_agents')
                .select('*, landlord:users!landlord_agents_landlord_id_fkey(id, first_name, last_name, email)')
                .eq('invite_code', cleanCode)
                .maybeSingle();

            if (findErr || !invite) {
                showError({ type: 'unknown', title: 'Invalid Code', message: 'The 6-character invite code is invalid or not found.' });
                return false;
            }

            if (invite.status === 'revoked') {
                showError({ type: 'unknown', title: 'Code Revoked', message: 'This invite code was revoked by the landlord.' });
                return false;
            }

            // Update landlord_agents status to active and assign agent_id
            await supabase
                .from('landlord_agents')
                .update({
                    agent_id: user.id,
                    status: 'active',
                    accepted_at: new Date().toISOString(),
                })
                .eq('id', invite.id);

            // Update user's role to AGENT in users table
            await supabase
                .from('users')
                .update({
                    role: 'AGENT',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            const landlordObj = Array.isArray(invite.landlord) ? invite.landlord[0] : invite.landlord;
            const landlordName = landlordObj
                ? `${landlordObj.first_name || ''} ${landlordObj.last_name || ''}`.trim() || landlordObj.email
                : 'Landlord';

            showSuccess(`Successfully linked to ${landlordName} as Agent!`);
            return true;
        } catch (e: any) {
            const err = await handleError(e);
            showError(err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // 7. Fetch Linked Landlords for an Agent directly in Supabase
    const fetchLandlords = useCallback(async () => {
        if (!user) return [];
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('landlord_agents')
                .select('landlord:users!landlord_agents_landlord_id_fkey(id, first_name, last_name, email)')
                .eq('agent_id', user.id)
                .eq('status', 'active');

            if (!error && data) {
                const landlordsList = data.map((item: any) => {
                    const l = Array.isArray(item.landlord) ? item.landlord[0] : item.landlord;
                    return {
                        id: l?.id,
                        first_name: l?.first_name || 'Landlord',
                        last_name: l?.last_name || '',
                        email: l?.email,
                    };
                });
                return landlordsList;
            }
            return [];
        } catch (e) {
            return [];
        } finally {
            setLoading(false);
        }
    }, [user]);

    return {
        agents,
        loading,
        fetchAgents,
        createInvite,
        revokeAgent,
        fetchAssignments,
        updateAssignments,
        acceptInvite,
        fetchLandlords,
    };
};
