import { useSyncExternalStore } from 'react';

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

/**
 * Una escritura que Firestore rechazó (las reglas, no la falta de conexión: sin conexión la promesa
 * queda pendiente). Firestore deshace el cambio en el celular. Por ahora solo se deja el aviso en el
 * registro; mostrarlo y reintentar es el PR 6 de la Etapa 4 ("Error al guardar").
 */
export function trackWrite(saved: Promise<unknown>, what: string) {
  saved.catch((error: unknown) => {
    console.warn(`No se pudo guardar (${what}):`, error);
  });
}

/** Vuelve a "sin leer" (para los tests). */
export function resetListData() {
  stopWatching?.();
  stopWatching = undefined;
  watchedId = undefined;
  setState(idle);
}
