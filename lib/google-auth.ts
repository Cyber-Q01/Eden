import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';
import { withTimeout } from './timeout';

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: '495613775079-90oebo0gq73l2r8lntfv4ji2ut8pil2n.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    offlineAccess: true,
  });
};

export const signInWithGoogle = async () => {
  try {

    await GoogleSignin.hasPlayServices();
    const userInfo = await withTimeout(GoogleSignin.signIn());

    if (userInfo.data?.idToken) {
      const { data, error } = await withTimeout(supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      }), 20000, 'Login timeout. Please try again.');

      if (error) throw error;
      return { data, error: null };
    } else {
      throw new Error('No ID token present');
    }
  } catch (error: any) {
    return { data: null, error };
  }
};
