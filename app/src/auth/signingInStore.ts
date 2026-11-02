import { useSyncExternalStore } from 'react';

import { LOADING_TIMEOUT_MS } from '../data/loadingTimeout';

// "Se está entrando": desde que la persona eligió su cuenta de Google hasta que la sesión abre y se
// leen el hogar y las listas. Mientras es verdadero se ve la pantalla `46-cargando-entrada`, en vez
// de dejar la Bienvenida quieta sin ningún indicador.

let signingIn = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

export function setSigningIn(next: boolean) {
  clearTimeout(timer);
  if (next) {
    // Si el servidor no responde nunca, no queda la pantalla de carga para siempre.
    timer = setTimeout(() => setSigningIn(false), LOADING_TIMEOUT_MS);
  }
  if (signingIn === next) return;
  signingIn = next;
  listeners.forEach((listener) => listener());
}

// "Ya entró": la primera lectura del hogar y las listas ya terminó (o falló). Desde ahí la pantalla
// de carga no vuelve a taparlo todo (por ejemplo al reintentar o al cambiar de hogar).
let entered = false;
const enteredListeners = new Set<() => void>();

export function setEntered(next: boolean) {
  if (entered === next) return;
  entered = next;
  enteredListeners.forEach((listener) => listener());
}

export function useEntered(): boolean {
  return useSyncExternalStore(
    (listener) => {
      enteredListeners.add(listener);
      return () => enteredListeners.delete(listener);
    },
    () => entered,
  );
}

export function useSigningIn(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => signingIn,
  );
}
