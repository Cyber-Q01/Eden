import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../lib/timeout';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    role: 'TENANT' | 'LANDLORD' | 'ADMIN' | 'AGENT' | null;
    delegatedLandlordId: string | null;
    completedBiodata: boolean;
    loading: boolean;
    refreshBiodataStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    delegatedLandlordId: null,
    completedBiodata: false,
    loading: true,
    refreshBiodataStatus: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'TENANT' | 'LANDLORD' | 'ADMIN' | 'AGENT' | null>(null);
    const [delegatedLandlordId, setDelegatedLandlordId] = useState<string | null>(null);
    const [completedBiodata, setCompletedBiodata] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    // Tracks whether getSession() has completed so we don't double-process
    // the INITIAL_SESSION event fired by onAuthStateChange.
    const initializedRef = useRef(false);
    // Tracks the last processed session access_token to avoid re-processing
    // duplicate TOKEN_REFRESHED events for the same token.
    const lastTokenRef = useRef<string | null>(null);

    const loadCachedBiodata = async (userId: string) => {
        try {
            console.log("Attempting to load biodata from local cache for user:", userId);
            const cachedRole = await AsyncStorage.getItem(`user_role_${userId}`);
            const cachedCompleted = await AsyncStorage.getItem(`completed_biodata_${userId}`);
            const cachedDelegatedLandlordId = await AsyncStorage.getItem(`delegated_landlord_id_${userId}`);

            if (cachedRole !== null) {
                setRole(cachedRole as any || null);
            }
            if (cachedCompleted !== null) {
                setCompletedBiodata(cachedCompleted === 'true');
            }
            setDelegatedLandlordId(cachedDelegatedLandlordId);
            console.log("Loaded cached biodata:", { cachedRole, cachedCompleted, cachedDelegatedLandlordId });
        } catch (e) {
            console.error("Failed to load cached biodata:", e);
        }
    };

    const fetchBiodataStatus = async (userId: string) => {
        try {
            const { data, error } = await withTimeout(
                Promise.resolve(
                    supabase
                        .from('users')
                        .select('completed_biodata, role')
                        .eq('id', userId)
                        .single()
                ),
                8000
            );

            if (!error && data) {
                const userRole = data.role ?? null;
                const completed = data.completed_biodata ?? false;

                setCompletedBiodata(completed);
                setRole(userRole);

                // Cache values locally for offline startup support
                await AsyncStorage.setItem(`user_role_${userId}`, userRole ?? '');
                await AsyncStorage.setItem(`completed_biodata_${userId}`, String(completed));

                // If user is an AGENT, fetch their delegated landlord_id
                if (userRole === 'AGENT') {
                    const { data: agentRow } = await withTimeout(
                        Promise.resolve(
                            supabase
                                .from('landlord_agents')
                                .select('landlord_id')
                                .eq('agent_id', userId)
                                .eq('status', 'active')
                                .single()
                        ),
                        8000
                    );
                    const landlordId = agentRow?.landlord_id ?? null;
                    setDelegatedLandlordId(landlordId);
                    if (landlordId) {
                        await AsyncStorage.setItem(`delegated_landlord_id_${userId}`, landlordId);
                    } else {
                        await AsyncStorage.removeItem(`delegated_landlord_id_${userId}`);
                    }
                } else {
                    setDelegatedLandlordId(null);
                    await AsyncStorage.removeItem(`delegated_landlord_id_${userId}`);
                }
            } else if (error) {
                console.error("Error fetching user biodata:", error.message);
                await loadCachedBiodata(userId);
            }
        } catch (error) {
            console.error("Exception in fetchBiodataStatus:", error);
            await loadCachedBiodata(userId);
        }
    };

    const refreshBiodataStatus = async () => {
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) await fetchBiodataStatus(currentUser.id);
        } catch (error) {
            console.error("Exception in refreshBiodataStatus:", error);
        }
    };

    const handleSession = async (newSession: Session | null) => {
        if (newSession?.user) {
            await fetchBiodataStatus(newSession.user.id);
        } else {
            setRole(null);
            setDelegatedLandlordId(null);
            setCompletedBiodata(false);
        }

        // Update session last to prevent _layout.tsx from reading stale biodata state
        setSession(newSession);
        setUser(newSession?.user ?? null);
    };

    useEffect(() => {
        const getPersistedSessionFallback = async (): Promise<Session | null> => {
            try {
                const keys = await AsyncStorage.getAllKeys();
                const authKey = keys.find(key => key.includes('auth-token'));
                if (authKey) {
                    const sessionStr = await AsyncStorage.getItem(authKey);
                    if (sessionStr) {
                        const parsed = JSON.parse(sessionStr);
                        if (parsed && typeof parsed === 'object') {
                            return parsed as Session;
                        }
                    }
                }
            } catch (e) {
                console.error("Error in getPersistedSessionFallback:", e);
            }
            return null;
        };

        // 1. Restore persisted session on cold start — this is the source of truth
        // We wrap supabase getSession in a timeout of 8s to prevent startup hang on slow network/DNS.
        withTimeout(supabase.auth.getSession(), 8000)
            .then(async ({ data: { session: existingSession } }) => {
                try {
                    await handleSession(existingSession);
                } catch (error) {
                    console.error("Error handling initial session:", error);
                } finally {
                    setLoading(false);
                    initializedRef.current = true;
                }
            })
            .catch(async (error) => {
                console.error("Error getting session on mount (timed out or failed):", error);
                try {
                    // Try fallback to local storage session if getSession failed/timed out
                    const fallbackSession = await getPersistedSessionFallback();
                    if (fallbackSession) {
                        console.log("Found fallback session in local storage, using it to skip stuck loading");
                        await handleSession(fallbackSession);
                    }
                } catch (fallbackError) {
                    console.error("Fallback session retrieval failed:", fallbackError);
                } finally {
                    setLoading(false);
                    initializedRef.current = true;
                }
            });

        // 2. Listen for subsequent auth changes (login, logout, token refresh)
        //    Skip the INITIAL_SESSION event since getSession() above handles it.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            // Skip initial session — handled by getSession above to avoid race
            if (!initializedRef.current && event === 'INITIAL_SESSION') return;

            // For TOKEN_REFRESHED, avoid re-processing if it's the same token
            // (Supabase can fire this multiple times for the same refresh)
            if (event === 'TOKEN_REFRESHED' && newSession?.access_token === lastTokenRef.current) return;
            if (newSession?.access_token) {
                lastTokenRef.current = newSession.access_token;
            }

            try {
                await handleSession(newSession);
            } catch (error) {
                console.error("Error handling auth change session:", error);
            } finally {
                // Only update loading on first real event if getSession somehow didn't fire
                if (!initializedRef.current) {
                    setLoading(false);
                    initializedRef.current = true;
                }
            }
        });

        // 3. Auto-refresh token when app comes back to foreground
        const handleAppStateChange = (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                supabase.auth.startAutoRefresh();
            } else {
                supabase.auth.stopAutoRefresh();
            }
        };

        const appStateSub = AppState.addEventListener('change', handleAppStateChange);
        supabase.auth.startAutoRefresh();

        return () => {
            subscription.unsubscribe();
            appStateSub.remove();
            supabase.auth.stopAutoRefresh();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ session, user, role, delegatedLandlordId, loading, completedBiodata, refreshBiodataStatus }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);