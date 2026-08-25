import { sha256 } from 'js-sha256';
import { supabase } from './supabase';
import { withTimeout } from './timeout';

// The native module is resolved lazily because it only exists in iOS builds.
// On Android the Apple button is never shown, so this code path is never
// touched there — Android builds that predate this module keep working.
let appleAuthModule: any = null;

const getAppleAuth = () => {
    if (appleAuthModule) return appleAuthModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-apple-authentication');
    if (!mod) {
        throw new Error('Sign in with Apple is not available in this build. Please install the latest build of the app.');
    }
    appleAuthModule = mod;
    return mod;
};

const generateNonce = (length = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < length; i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
};

export const isAppleSignInAvailable = async (): Promise<boolean> => {
    try {
        const AppleAuthentication = getAppleAuth();
        return (await AppleAuthentication.isAvailableAsync()) ?? false;
    } catch {
        return false;
    }
};

/**
 * Returns true when the user simply dismissed the Apple sign-in sheet —
 * that should not show an error toast.
 */
export const isAppleSignInCancelled = (error: any): boolean => {
    if (!error) return false;
    const code = String(error?.code ?? '').toUpperCase();
    const message = String(error?.message ?? '').toLowerCase();
    return code === 'ERR_REQUEST_CANCELED' || message.includes('cancel');
};

export const signInWithApple = async () => {
    try {
        const AppleAuthentication = getAppleAuth();

        const available = await AppleAuthentication.isAvailableAsync();
        if (!available) {
            throw new Error('Sign in with Apple is not available on this device/build.');
        }

        const nonce = generateNonce();
        const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce,
        });

        if (!credential?.identityToken) {
            throw new Error('Apple did not return a sign-in token. Please try again.');
        }

        const { data, error } = await withTimeout(
            supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: credential.identityToken,
                // Apple identity tokens contain an `at_hash` claim — the
                // authorization code is required for Supabase to verify it
                access_token: credential.authorizationCode ?? undefined,
                // Supabase compares SHA-256(nonce) against the nonce claim
                // inside the Apple identity token
                nonce: sha256(nonce),
            }),
            20000,
            'Login timeout. Please try again.'
        );

        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error };
    }
};
