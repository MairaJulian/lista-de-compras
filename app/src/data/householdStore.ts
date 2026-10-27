import { useSyncExternalStore } from 'react';

import { watchHousehold, type LoadedHousehold, type RemovalReason } from './householdSource';

// Estado del hogar real (el de `hogarActualId`) fuera de las pantallas, para que Inicio, Hogar y
// Crear hogar vean lo mismo. Con la sesión de ejemplo no se usa: esa lee los datos de ejemplo.

export type HouseholdState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; household: LoadedHousehold }
  | { status: 'error' }
  /** La membresía propia dejó de estar activa: te quitaron (`quitado`) o saliste (`salio`). */
  | { status: 'removed'; reason: RemovalReason; householdName: string };

let state: HouseholdState = { status: 'idle' };
let watchedId: string | undefined;
let stopWatching: (() => void) | undefined;
const listeners = new Set<() => void>();

function setState(next: HouseholdState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function watch(householdId: string) {
  stopWatching?.();
  watchedId = householdId;
  // Una vez que se supo que te sacaron, los errores de lectura que vienen detrás (el hogar ya no se
  // puede leer) y las lecturas viejas no pisan ese estado.
  const current = () => watchedId === householdId && state.status !== 'removed';
  stopWatching = watchHousehold(
    householdId,
    (household) => current() && setState({ status: 'ready', household }),
    () => current() && setState({ status: 'error' }),
    (reason, householdName) => {
      if (watchedId !== householdId) return;
      stopWatching?.();
      stopWatching = undefined;
      setState({ status: 'removed', reason, householdName });
    },
  );
}

/**
 * Empieza a leer el hogar. Si ya se tienen sus datos (por ejemplo los del hogar recién creado) los
 * conserva mientras llegan los del servidor. Devuelve la función que deja de leer y vacía el estado.
 */
export function startHousehold(householdId: string): () => void {
  if (!(state.status === 'ready' && state.household.id === householdId)) {
    setState({ status: 'loading' });
  }
  watch(householdId);
  return () => {
    stopWatching?.();
    stopWatching = undefined;
    watchedId = undefined;
    setState({ status: 'idle' });
  };
}

/** "Reintentar" después de un error de lectura. */
export function retryHousehold() {
  if (watchedId === undefined) return;
  setState({ status: 'loading' });
  watch(watchedId);
}

/** Datos del hogar recién creado, para mostrarlos sin esperar a la primera lectura. */
export function seedHousehold(household: LoadedHousehold) {
  setState({ status: 'ready', household });
}

export function useHouseholdState(): HouseholdState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

/** Vuelve a "sin leer" (para los tests). */
export function resetHouseholdStore() {
  stopWatching?.();
  stopWatching = undefined;
  watchedId = undefined;
  setState({ status: 'idle' });
}
