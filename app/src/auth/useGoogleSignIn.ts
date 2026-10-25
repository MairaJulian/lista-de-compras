import { router } from 'expo-router';
import { useRef } from 'react';
import { Alert } from 'react-native';

import { goToNoHousehold } from '../navigation/session';
import { signInWithGoogle } from './googleSignIn';

type Options = {
  /** Qué pasa si la persona cancela (Bienvenida: nada; Error: vuelve a Bienvenida). */
  onCancelled?: () => void;
  /** Qué pasa si falla (Bienvenida: abre la pantalla de error; Error: se queda ahí). */
  onError?: () => void;
};

/** Acción de "Entrar con Google" / "Reintentar", que ignora toques mientras hay un login en curso. */
export function useGoogleSignIn({ onCancelled, onError }: Options = {}) {
  const busy = useRef(false);

  return async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await signInWithGoogle();
      switch (result.status) {
        case 'success':
          // Hasta el PR 4 (rutas según la sesión) nadie tiene hogar real todavía.
          goToNoHousehold();
          break;
        case 'cancelled':
          onCancelled?.();
          break;
        case 'playServicesMissing':
          Alert.alert(
            'Falta Google Play Services',
            'Para entrar con Google necesitás instalar o actualizar Google Play Services.',
          );
          break;
        case 'error':
          onError?.();
          break;
      }
    } finally {
      busy.current = false;
    }
  };
}

export const openLoginError = () => router.push('/error-login');
