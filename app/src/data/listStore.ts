import { useSyncExternalStore } from 'react';

import { clearFailures } from './failureStore';
import { dismissLeaveUndo } from './leaveUndoStore';
import { watchHouseholdData, type HouseholdData } from './listSource';
import { LOADING_TIMEOUT_MS } from './loadingTimeout';

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
let loadingTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function setState(next: ListDataState) {
  state = next;
  if (next.status !== 'loading') clearTimeout(loadingTimer);
  listeners.forEach((listener) => listener());
}

function watch(householdId: string) {
  stopWatching?.();
  watchedId = householdId;
  connectedOnce = false;
  startedAt = Date.now();
  const current = () => watchedId === householdId;
  // Sin respuesta ni error del servidor (por ejemplo sin conexión y sin copia local) no se queda
  // cargando para siempre: pasa a la pantalla de error con "Reintentar". Si los datos llegan después,
  // la lectura vuelve a `ready` sola.
  clearTimeout(loadingTimer);
  loadingTimer = setTimeout(() => {
    if (current() && state.status === 'loading') setState({ status: 'error', householdId });
  }, LOADING_TIMEOUT_MS);
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
    dismissLeaveUndo();
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
  dismissLeaveUndo();
  setState(idle);
}
