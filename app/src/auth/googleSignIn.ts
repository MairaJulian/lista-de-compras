import { GoogleAuthProvider, getAuth, signInWithCredential } from '@react-native-firebase/auth';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { GOOGLE_WEB_CLIENT_ID } from './config';
import { saveUserOnSignIn } from './userDocument';

export type SignInResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'playServicesMissing' }
  | { status: 'error' };

let configured = false;

/** Entra con Google, lo vincula a la sesión de Firebase y deja listo `usuarios/{uid}`. No registra tokens. */
export async function signInWithGoogle(): Promise<SignInResult> {
  try {
    if (!configured) {
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
      configured = true;
    }
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return { status: 'cancelled' };

    const { idToken } = response.data;
    if (!idToken) return { status: 'error' };

    const credential = GoogleAuthProvider.credential(idToken);
    const { user } = await signInWithCredential(getAuth(), credential);

    await saveUserOnSignIn({
      uid: user.uid,
      name: user.displayName ?? response.data.user.name ?? '',
      email: user.email ?? response.data.user.email,
      photo: user.photoURL ?? response.data.user.photo ?? null,
    });
    return { status: 'success' };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return { status: 'cancelled' };
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { status: 'playServicesMissing' };
      }
    }
    return { status: 'error' };
  }
}
