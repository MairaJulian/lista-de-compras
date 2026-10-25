import { useSyncExternalStore } from 'react';

import type { Invite, ListInfo, ListItem, Member } from '../data/types';
import { mockHousehold, mockInvites, mockItems, mockLists } from './data';

// Estado en memoria de los datos de ejemplo. Vive fuera de las pantallas para que Inicio, Lista y
// Hogar vean lo mismo (los contadores de Inicio se actualizan al tildar; quitar a alguien actualiza
// Hogar). Con Firebase se reemplaza.

type State = {
  lists: ListInfo[];
  items: ListItem[];
  members: Member[];
  invite: Invite;
  online: boolean;
  /** Falso después de salir del hogar y antes de crear uno o unirse a otro (`17-sin-hogar`). */
  hasHousehold: boolean;
  householdName: string;
};

const initialState: State = {
  lists: mockLists,
  items: mockItems,
  members: mockHousehold.members,
  invite: mockInvites[0],
  online: true,
  hasHousehold: true,
  householdName: mockHousehold.name,
};

let state: State = initialState;
const listeners = new Set<() => void>();
let nextId = 1;

export function setState(update: (current: State) => State) {
  state = update(state);
  listeners.forEach((listener) => listener());
}

/** Lectura puntual para la navegación, que no es un componente. */
export function getMockState(): State {
  return state;
}

/** Datos del hogar de ejemplo, para "unirse" con un código o un enlace. */
export function joinedHouseholdState(): Pick<State, 'members' | 'householdName' | 'hasHousehold'> {
  return {
    members: initialState.members,
    householdName: initialState.householdName,
    hasHousehold: true,
  };
}

/** Se une al hogar de ejemplo (con un enlace o un código). */
export function joinMockHousehold() {
  setState((s) => ({ ...s, ...joinedHouseholdState() }));
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
