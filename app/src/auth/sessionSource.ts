import { getAuth, onAuthStateChanged, signOut } from '@react-native-firebase/auth';
import { doc, getFirestore, onSnapshot } from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { signedInState, type AuthState } from './sessionState';

/**
 * Escucha la sesión de Firebase (que el Auth nativo conserva entre aperturas de la app) y el
 * documento `usuarios/{uid}`. Devuelve la función para dejar de escuchar. No lee ni guarda tokens.
 */
export function watchSession(onChange: (state: AuthState) => void): () => void {
  let stopUserDoc: (() => void) | undefined;

  const stopAuth = onAuthStateChanged(getAuth(), (user) => {
    stopUserDoc?.();
    stopUserDoc = undefined;
    if (!user) {
      onChange({ status: 'signedOut' });
      return;
    }
    stopUserDoc = onSnapshot(
      doc(getFirestore(), 'usuarios', user.uid),
      (snapshot) => onChange(signedInState(user, snapshot.data())),
      () => onChange(signedInState(user, undefined)),
    );
  });

  return () => {
    stopUserDoc?.();
    stopAuth();
  };
}

/** Cierra la sesión de Google y la de Firebase. */
export async function signOutEverywhere(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Si Google no tenía sesión no hay nada que cerrar; la de Firebase se cierra igual.
  }
  await signOut(getAuth());
}
