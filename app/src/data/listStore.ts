import { useSyncExternalStore } from 'react';

import { clearFailures } from './failureStore';
import { watchHouseholdData, type HouseholdData } from './listSource';

// Listas, ítems y miembros del hogar real fuera de las pantallas, para que Inicio, Lista y el
// detalle vean lo mismo con una sola suscripción. Con la sesión de ejemplo no se usa.

export type ListDataState =
  | { status: 'idle' }
  | { status: 'loading'; householdId: string }
  | ({
      status: 'ready';
      householdId: string;
      /** Desde que se empezó a leer llegó al menos una lectura confirmada por el servidor. */
      connectedOnce: boolean;
      /** Cuándo empezó la lectura (milisegundos), para el tiempo de espera inicial del indicador. */
      startedAt: number;
    } & HouseholdData)
  | { status: 'error'; householdId: string };

const idle: ListDataState = { status: 'idle' };
let state: ListDataState = idle;
let watchedId: string | undefined;
let connectedOnce = false;
let startedAt = Date.now();
let stopWatching: (() => void) | undefined;
const listeners = new Set<() => void>();

function setState(next: ListDataState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function watch(householdId: string) {
  stopWatching?.();
  watchedId = householdId;
  connectedOnce = false;
  startedAt = Date.now();
  const current = () => watchedId === householdId;
  stopWatching = watchHouseholdData(
    householdId,
    (data) => {
      if (!current()) return;
      connectedOnce = connectedOnce || !data.sync.fromCache;
      setState({ status: 'ready', householdId, connectedOnce, startedAt, ...data });
    },
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
