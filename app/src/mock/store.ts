import { useSyncExternalStore } from 'react';

import type { ListItem } from '../data/types';
import { mockItems } from './data';

// Estado en memoria de los datos de ejemplo. Vive fuera de las pantallas para que Inicio y Lista
// vean lo mismo (los contadores de Inicio se actualizan al tildar). Con Firebase se reemplaza.

type State = { items: ListItem[]; online: boolean };

let state: State = { items: mockItems, online: true };
const listeners = new Set<() => void>();
let nextId = 1;

export function setState(update: (current: State) => State) {
  state = update(state);
  listeners.forEach((listener) => listener());
}

export function newItemId(): string {
  return `nuevo-${nextId++}`;
}

export function useMockStore(): State {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

/** Vuelve a los datos del diseño (para los tests). */
export function resetMockStore() {
  state = { items: mockItems, online: true };
  nextId = 1;
  listeners.forEach((listener) => listener());
}
