import { useState, useCallback } from 'react';
import { callEdgeFunction } from '../lib/api';
import { handleError } from '../lib/errorHandler';
import { useToast } from '../components/Toast';

export const useAgentManagement = () => {
    const { showError, showSuccess } = useToast();
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAgents = useCallback(async () => {
        setLoading(true);
        try {
            const data = await callEdgeFunction<any[]>('agent-invite', 'GET');
            setAgents(data || []);
        } catch (e) {
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    }, [showError]);

    const createInvite = async () => {
        setLoading(true);
        try {
            const data = await callEdgeFunction<{ invite_code: string; id: string }>('agent-invite', 'POST');
            showSuccess('Invite code generated!');
            fetchAgents();
            return data.invite_code;
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const revokeAgent = async (agentId: string) => {
        setLoading(true);
        try {
            await callEdgeFunction('agent-invite', 'DELETE', {}, { agent_id: agentId });
            showSuccess('Agent access revoked');
            fetchAgents();
        } catch (e) {
            const err = await handleError(e);
            showError(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignments = useCallback(async (agentId: string) => {
        try {
            const data = await callEdgeFunction<any[]>('agent-assignments', 'GET', null, { agent_id: agentId });
            return data || [];
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return [];
        }
    }, [showError]);

    const updateAssignments = async (agentId: string, propertyIds: string[]) => {
        setLoading(true);
        try {
            await callEdgeFunction('agent-assignments', 'POST', {
                agent_id: agentId,
                property_ids: propertyIds
            });
            showSuccess('Assignments updated successfully');
            fetchAgents(); // Refresh agent property counts
            return true;
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const acceptInvite = async (inviteCode: string) => {
        setLoading(true);
        try {
            const data = await callEdgeFunction<{ success: boolean; landlord_name: string }>('accept-agent-invite', 'POST', {
                invite_code: inviteCode
            });
            showSuccess(`Successfully linked to ${data.landlord_name}`);
            return true;
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const fetchLandlords = useCallback(async () => {
        setLoading(true);
        try {
            const data = await callEdgeFunction<{ landlords: any[] }>('agent-landlords', 'GET');
            return data.landlords || [];
        } catch (e) {
            const err = await handleError(e);
            showError(err);
            return [];
        } finally {
            setLoading(false);
        }
    }, [showError]);

    return {
        agents,
        loading,
        fetchAgents,
        createInvite,
        revokeAgent,
        fetchAssignments,
        updateAssignments,
        acceptInvite,
        fetchLandlords
    };
};
