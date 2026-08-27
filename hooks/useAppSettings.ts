// hooks/useAppSettings.ts
// Polls the app_settings table (maintenance mode + store version tracking).
// Fail-open: a network error never locks the user out of the app.
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';

export type AppSettings = {
    maintenance: boolean;
    latestVersion: string;
    releaseNotes: string;
    storeUrlAndroid: string;
    storeUrlIos: string;
    checked: boolean;
};

const DEFAULT_STORE_URL_ANDROID =
    'https://play.google.com/store/apps/details?id=com.eden.mobile';

const DEFAULTS: AppSettings = {
    maintenance: false,
    latestVersion: '0.0.0',
    releaseNotes: '',
    storeUrlAndroid: DEFAULT_STORE_URL_ANDROID,
    storeUrlIos: '',
    checked: false,
};

// "1.2.0" vs "1.10.1" — numeric per segment, never lexicographic
export const compareVersions = (a: string, b: string): number => {
    const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i += 1) {
        const x = pa[i] || 0;
        const y = pb[i] || 0;
        if (x !== y) return x - y;
    }
    return 0;
};

const POLL_MS = 60_000;

export const useAppSettings = () => {
    const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

    const refetch = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('app_settings')
                .select('key, value');
            if (!data) return; // transient — keep previous values
            const map: Record<string, string> = {};
            data.forEach((row: any) => {
                map[row.key] = row.value;
            });
            setSettings({
                maintenance: map['maintenance_mode'] === 'on',
                latestVersion: map['latest_version'] || '0.0.0',
                releaseNotes: map['release_notes'] || '',
                storeUrlAndroid: map['store_url_android'] || DEFAULT_STORE_URL_ANDROID,
                storeUrlIos: map['store_url_ios'] || '',
                checked: true,
            });
        } catch (e) {
            // Fail-open: offline or API hiccup must never show a false
            // maintenance screen or block the app
            console.warn('[useAppSettings] fetch notice:', e);
        }
    }, []);

    useEffect(() => {
        refetch();
        const interval = setInterval(refetch, POLL_MS);
        const sub = AppState.addEventListener('change', (status) => {
            if (status === 'active') refetch();
        });
        return () => {
            clearInterval(interval);
            sub.remove();
        };
    }, [refetch]);

    return { settings, refetch };
};
