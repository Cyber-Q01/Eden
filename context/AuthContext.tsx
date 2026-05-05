import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    role: 'TENANT' | 'LANDLORD' | 'ADMIN' | null;
    completedBiodata: boolean;
    loading: boolean;
    refreshBiodataStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    completedBiodata: false,
    loading: true,
    refreshBiodataStatus: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'TENANT' | 'LANDLORD' | 'ADMIN' | null>(null);
    const [completedBiodata, setCompletedBiodata] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    // Prevents onAuthStateChange from double-processing the initial session
    // that getSession() already handles.
    const initializedRef = useRef(false);

    const fetchBiodataStatus = async (userId: string) => {
        const { data, error } = await supabase
            .from('users')
            .select('completed_biodata, role')
            .eq('id', userId)
            .single();

        if (!error && data) {
            setCompletedBiodata(data.completed_biodata ?? false);
            setRole(data.role ?? null);
        }
    };

    const refreshBiodataStatus = async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) await fetchBiodataStatus(currentUser.id);
    };

    const handleSession = async (newSession: Session | null) => {
        if (newSession?.user) {
            await fetchBiodataStatus(newSession.user.id);
        } else {
            setRole(null);
            setCompletedBiodata(false);
        }
        
        // Update session last to prevent _layout.tsx from reading stale biodata state
        setSession(newSession);
        setUser(newSession?.user ?? null);
    };

    useEffect(() => {
        // 1. Restore persisted session on cold start — this is the source of truth
        supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
            await handleSession(existingSession);
            setLoading(false);
            initializedRef.current = true;
        });

        // 2. Listen for subsequent auth changes (login, logout, token refresh)
        //    Skip the INITIAL_SESSION event since getSession() above handles it.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            // Skip initial session — handled by getSession above to avoid race
            if (!initializedRef.current && event === 'INITIAL_SESSION') return;

            await handleSession(newSession);

            // Only update loading on first real event if getSession somehow didn't fire
            if (!initializedRef.current) {
                setLoading(false);
                initializedRef.current = true;
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
        <AuthContext.Provider value={{ session, user, role, loading, completedBiodata, refreshBiodataStatus }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);