import { useSyncExternalStore } from 'react';

import { clearFailures } from './failureStore';
import { watchHouseholdData, type HouseholdData } from './listSource';

// Listas, ítems y miembros del hogar real fuera de las pantallas, para que Inicio, Lista y el
// detalle vean lo mismo con una sola suscripción. Con la sesión de ejemplo no se usa.

export type ListDataState =
  | { status: 'idle' }
  | { status: 'loading'; householdId: string }
  | ({ status: 'ready'; householdId: string } & HouseholdData)
  | { status: 'error'; householdId: string };

const idle: ListDataState = { status: 'idle' };
let state: ListDataState = idle;
let watchedId: string | undefined;
let stopWatching: (() => void) | undefined;
const listeners = new Set<() => void>();

function setState(next: ListDataState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function watch(householdId: string) {
  stopWatching?.();
  watchedId = householdId;
  const current = () => watchedId === householdId;
  stopWatching = watchHouseholdData(
    householdId,
    (data) => current() && setState({ status: 'ready', householdId, ...data }),
    () => current() && setState({ status: 'error', householdId }),
  );
}

/** Empieza a leer el hogar. Devuelve la función que deja de leer y vacía el estado. */
export function startListData(householdId: string): () => void {
  setState({ status: 'loading', householdId });
  watch(householdId);
  return () => {
    stopWatching?.();
    stopWatching = undefined;
    watchedId = undefined;
    clearFailures();
    setState(idle);
  };
}

/** "Reintentar" después de un error de lectura. */
export function retryListData() {
  if (watchedId === undefined) return;
  setState({ status: 'loading', householdId: watchedId });
  watch(watchedId);
}

export function useListData(): ListDataState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

/** Vuelve a "sin leer" (para los tests). */
export function resetListData() {
  stopWatching?.();
  stopWatching = undefined;
  watchedId = undefined;
  clearFailures();
  setState(idle);
}
