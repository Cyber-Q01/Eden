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

export const FALLBACK_AD_BANNERS: MobileAdvertisement[] = [
    {
        id: 'fb-1',
        title: 'Find your dream home with 0% hassle',
        subtitle: 'Browse thousands of verified properties in Lagos & Abuja',
        placement: 'homepage_banner',
        adType: 'image',
        targetType: 'website',
        mediaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
        targetUrl: 'https://eden.ng',
        ctaText: 'Explore Now',
        color: '#1D4ED8',
    },
    {
        id: 'fb-2',
        title: 'Download the Eden Partner App',
        subtitle: 'For verified real estate agents and delegated property managers',
        placement: 'homepage_banner',
        adType: 'image',
        targetType: 'mobile_app',
        mediaUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80',
        targetUrl: 'https://eden.ng/app',
        playstoreUrl: 'https://play.google.com/store/apps/details?id=com.eden.mobile',
        appstoreUrl: 'https://apps.apple.com/app/eden-properties/id12345678',
        ctaText: 'Get App',
        color: '#059669',
    },
    {
        id: 'fb-3',
        title: 'Zero Escrow Fee Weekend Special',
        subtitle: '100% money-back guarantee on all rent deposits held securely',
        placement: 'homepage_banner',
        adType: 'image',
        targetType: 'website',
        mediaUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80',
        targetUrl: 'https://eden.ng/escrow',
        ctaText: 'Learn More',
        color: '#7C3AED',
    },
    {
        id: 'fb-4',
        title: 'Book Verified Technical Artisans',
        subtitle: 'Emergency plumbers, electricians & AC repair with on-site pricing',
        placement: 'homepage_banner',
        adType: 'image',
        targetType: 'website',
        mediaUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
        targetUrl: 'https://eden.ng/artisans',
        ctaText: 'Find Artisan',
        color: '#D97706',
    },
];

// Helper to decode target_url column
function decodeTargetInfo(rawUrl?: string | null): {
    targetType: 'website' | 'mobile_app';
    targetUrl: string;
    playstoreUrl?: string;
    appstoreUrl?: string;
} {
    if (!rawUrl) return { targetType: 'website', targetUrl: 'https://eden.ng' };
    if (rawUrl.startsWith('{') && rawUrl.includes('mobile_app')) {
        try {
            const parsed = JSON.parse(rawUrl);
            return {
                targetType: 'mobile_app',
                targetUrl: parsed.target_url || 'https://eden.ng',
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
                // Website Category: Route directly to Web URL
                const webUrl = ad.targetUrl || 'https://eden.ng';
                await Linking.openURL(webUrl);
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
