import { supabase } from './supabase';
import { withTimeout } from './timeout';

// Google OAuth web (OOB) client id — required for Android Play Services sign-in
const WEB_CLIENT_ID = '495613775079-90oebo0gq73l2r8lntfv4ji2ut8pil2n.apps.googleusercontent.com';

// The native module is resolved lazily. If an older native build is running
// that does not include @react-native-google-signin/google-signin yet, the
// login screen still renders — tapping the button shows a friendly error
// instead of crashing the whole screen.
let googleSigninModule: any = null;

const getGoogleSignin = () => {
    if (googleSigninModule) return googleSigninModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-google-signin/google-signin');
    googleSigninModule = mod?.GoogleSignin ?? mod?.default;
    if (!googleSigninModule) {
        throw new Error('Google Sign-In is not available in this build. Please install the latest build of the app.');
    }
    return googleSigninModule;
};

export const configureGoogleSignIn = (): boolean => {
    try {
        const GoogleSignin = getGoogleSignin();
        GoogleSignin.configure({
            webClientId: WEB_CLIENT_ID,
            offlineAccess: true,
        });
        return true;
    } catch (e) {
        console.warn('[GoogleAuth] configure() failed:', e);
        return false;
    }
};

/**
 * Returns true when the user simply dismissed/cancelled the Google sign-in
 * dialog — that should not show an error toast.
 */
export const isGoogleSignInCancelled = (error: any): boolean => {
    if (!error) return false;
    const code = String(error?.code ?? '').toUpperCase();
    const message = String(error?.message ?? '').toLowerCase();
    return code === 'CANCELLED' || code === '6002' || message.includes('cancel');
};

export const signInWithGoogle = async () => {
    try {
        const GoogleSignin = getGoogleSignin();

        if (typeof GoogleSignin.hasPlayServices === 'function') {
            const hasPlayServices = await GoogleSignin.hasPlayServices();
            if (!hasPlayServices) {
                throw new Error('Google Play Services is not available on this device.');
            }
        }

        // Make sure we are configured before signing in (idempotent)
        configureGoogleSignIn();

        const userInfo: any = await withTimeout(
            Promise.resolve(GoogleSignin.signIn()),
            30000,
            'Google sign-in timed out. Please try again.'
        );

        if (userInfo.data?.idToken) {
            const { data, error } = await withTimeout(
                supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: userInfo.data.idToken,
                }),
                20000,
                'Login timeout. Please try again.'
            );

            if (error) throw error;
            return { data, error: null };
        } else {
            throw new Error('Google did not return a sign-in token. Please try again.');
        }
    } catch (error: any) {
        return { data: null, error };
    }
};
