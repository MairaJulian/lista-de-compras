import { useSyncExternalStore } from 'react';

import type { ListInfo, ListItem } from '../data/types';
import { mockItems, mockLists } from './data';

// Estado en memoria de los datos de ejemplo. Vive fuera de las pantallas para que Inicio y Lista
// vean lo mismo (los contadores de Inicio se actualizan al tildar). Con Firebase se reemplaza.

type State = { lists: ListInfo[]; items: ListItem[]; online: boolean };

const initialState: State = { lists: mockLists, items: mockItems, online: true };

let state: State = initialState;
const listeners = new Set<() => void>();
let nextId = 1;

export function setState(update: (current: State) => State) {
  state = update(state);
  listeners.forEach((listener) => listener());
}

export function newItemId(): string {
  return `nuevo-${nextId++}`;
}

export function newListId(): string {
  return `lista-${nextId++}`;
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
  state = initialState;
  nextId = 1;
  listeners.forEach((listener) => listener());
}
