import { useState, useEffect, useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export interface MobileAdvertisement {
    id: string;
    title: string;
    subtitle?: string;
    placement: string;
    adType: 'image' | 'text' | 'video';
    targetType: 'website' | 'mobile_app';
    mediaUrl: string;
    targetUrl: string;
    playstoreUrl?: string;
    appstoreUrl?: string;
    ctaText: string;
    color?: string;
}

// Shown only while the advertisements table has no active rows.
// Keep this truthful and non-promotional: no offers, guarantees, prices,
// or links that do not actually work (store reviewers see this content).
export const FALLBACK_AD_BANNERS: MobileAdvertisement[] = [
    {
        id: 'fb-1',
        title: 'How Eden Escrow Protects Your Rent',
        subtitle: 'You pay into a secure escrow. Funds are released to the landlord only when you confirm the property.',
        placement: 'homepage_banner',
        adType: 'image',
        targetType: 'website',
        mediaUrl: 'https://images.unsplash.com/photo-1560580159-44d2fd901ef3?w=800&auto=format&fit=cover&q=80',
        targetUrl: '',
        ctaText: 'How it works',
        color: '#1D4ED8',
    },
];

// Helper to decode target_url column
function decodeTargetInfo(rawUrl?: string | null): {
    targetType: 'website' | 'mobile_app';
    targetUrl: string;
    playstoreUrl?: string;
    appstoreUrl?: string;
} {
    if (!rawUrl) return { targetType: 'website', targetUrl: '' };
    if (rawUrl.startsWith('{') && rawUrl.includes('mobile_app')) {
        try {
            const parsed = JSON.parse(rawUrl);
            return {
                targetType: 'mobile_app',
                targetUrl: parsed.target_url || '',
                playstoreUrl: parsed.playstore_url || '',
                appstoreUrl: parsed.appstore_url || '',
            };
        } catch {}
    }
    return { targetType: 'website', targetUrl: rawUrl };
}

export function useAdvertisements() {
    const [banners, setBanners] = useState<MobileAdvertisement[]>(FALLBACK_AD_BANNERS);
    const [loading, setLoading] = useState(true);

    const fetchBanners = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('advertisements')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
                const colors = ['#1D4ED8', '#059669', '#7C3AED', '#D97706', '#DB2777', '#0284C7'];
                const mapped: MobileAdvertisement[] = data.map((row: any, idx: number) => {
                    const target = decodeTargetInfo(row.target_url);
                    return {
                        id: row.id,
                        title: row.title || 'Eden Special Offer',
                        subtitle: row.cta_text ? `${row.cta_text} on the Eden Network` : undefined,
                        placement: row.placement || 'homepage_banner',
                        adType: row.ad_type || 'image',
                        targetType: target.targetType,
                        mediaUrl: row.media_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
                        targetUrl: target.targetUrl,
                        playstoreUrl: target.playstoreUrl,
                        appstoreUrl: target.appstoreUrl,
                        ctaText: row.cta_text || (target.targetType === 'mobile_app' ? 'Get App' : 'Learn More'),
                        color: colors[idx % colors.length],
                    };
                });
                setBanners(mapped);
            }
        } catch (e) {
            console.warn('[useAdvertisements] Fetch notice:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBanners();
    }, [fetchBanners]);

    // Handle banner tap: device-aware routing for mobile app vs website
    const handleBannerPress = async (ad: MobileAdvertisement) => {
        // Increment click count in Supabase asynchronously
        if (ad.id && !ad.id.startsWith('fb-')) {
            try {
                const { data } = await supabase.from('advertisements').select('clicks_count').eq('id', ad.id).single();
                const currentClicks = Number(data?.clicks_count || 0);
                await supabase.from('advertisements').update({ clicks_count: currentClicks + 1 }).eq('id', ad.id);
            } catch {}
        }

        try {
            if (ad.targetType === 'mobile_app') {
                // Mobile App Category: Route to PlayStore or AppStore based on user device
                if (Platform.OS === 'android' && ad.playstoreUrl) {
                    const canOpen = await Linking.canOpenURL(ad.playstoreUrl);
                    if (canOpen) {
                        await Linking.openURL(ad.playstoreUrl);
                        return;
                    }
                } else if (Platform.OS === 'ios' && ad.appstoreUrl) {
                    const canOpen = await Linking.canOpenURL(ad.appstoreUrl);
                    if (canOpen) {
                        await Linking.openURL(ad.appstoreUrl);
                        return;
                    }
                }

                // Fallback store/web URL
                const fallbackUrl = ad.targetUrl || ad.playstoreUrl || ad.appstoreUrl;
                if (fallbackUrl) {
                    await Linking.openURL(fallbackUrl);
                }
            } else {
                // Website Category: Route directly to Web URL (no-op when unset)
                if (!ad.targetUrl) return;
                await Linking.openURL(ad.targetUrl);
            }
        } catch (err) {
            console.warn('[handleBannerPress] Open URL error:', err);
            if (ad.targetUrl) {
                Linking.openURL(ad.targetUrl).catch(() => {});
            }
        }
    };

    return {
        banners,
        loading,
        refetch: fetchBanners,
        handleBannerPress,
    };
}
