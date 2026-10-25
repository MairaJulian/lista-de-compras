import { useMemo, useSyncExternalStore } from 'react';

import { getMockState, joinMockHousehold, useMockStore } from '../mock/store';
import { signOutEverywhere, watchSession } from './sessionSource';
import { deriveSession, type AuthState, type Session } from './sessionState';

// Estado de la sesión fuera de las pantallas, para que las rutas protegidas, Perfil y la navegación
// (que no es un componente) vean lo mismo.

let authState: AuthState = { status: 'loading' };
const listeners = new Set<() => void>();

function setAuthState(next: AuthState) {
  authState = next;
  listeners.forEach((listener) => listener());
}

/** Empieza a escuchar la sesión de Firebase. La sesión de ejemplo no se pisa. */
export function startSession(): () => void {
  return watchSession((next) => {
    if (authState.status !== 'demo') setAuthState(next);
  });
}

/** Sesión de ejemplo (solo desarrollo): entra con los datos de ejemplo, sin tocar Firebase. */
export function enterDemoSession() {
  if (!__DEV__) return;
  joinMockHousehold();
  setAuthState({ status: 'demo' });
}

/** Cierra la sesión (la de ejemplo, o la de Google y Firebase). */
export async function signOut(): Promise<void> {
  if (authState.status === 'demo') {
    setAuthState({ status: 'signedOut' });
    return;
  }
  await signOutEverywhere();
}

/** Lectura puntual para la navegación. */
export function getSession(): Session {
  return deriveSession(authState, getMockState().hasHousehold);
}

export function useSession(): Session {
  const auth = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => authState,
  );
  const { hasHousehold } = useMockStore();
  return useMemo(() => deriveSession(auth, hasHousehold), [auth, hasHousehold]);
}

/** Vuelve a "averiguando" (para los tests). */
export function resetSession(next: AuthState = { status: 'loading' }) {
  setAuthState(next);
}
