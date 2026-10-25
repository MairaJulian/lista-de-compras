import { useCallback } from 'react';

import { getMockCurrentMember, mockHousehold, mockLists } from '../mock/data';
import { newItemId, setState, useMockStore } from '../mock/store';
import {
  addItem,
  countPending,
  countUnsynced,
  markSynced,
  splitItems,
  toggleItem,
} from './listLogic';
import type { Household, ListInfo, ListItem, ListSummary, Member } from './types';

// Único punto de acceso a los datos para las pantallas. Hoy devuelve los datos de ejemplo;
// con Firebase se reemplaza la implementación sin tocar las pantallas.

export function useHousehold(): Household {
  return mockHousehold;
}

export function useLists(): ListSummary[] {
  const { items } = useMockStore();
  return mockLists.map((list) => ({
    ...list,
    pendingCount: countPending(items.filter((item) => item.listId === list.id)),
  }));
}

export function useCurrentMember(): Member {
  return getMockCurrentMember();
}

export function useList(listId: string): ListInfo | undefined {
  return mockLists.find((list) => list.id === listId);
}

export type ListContents = {
  pending: ListItem[];
  done: ListItem[];
  online: boolean;
  unsyncedCount: number;
  toggle: (itemId: string) => void;
  add: (name: string) => void;
  toggleOnline: () => void;
};

/** Ítems de una lista con las acciones de la pantalla Lista. */
export function useListContents(listId: string): ListContents {
  const { items, online } = useMockStore();
  const listItems = items.filter((item) => item.listId === listId);
  const { pending, done } = splitItems(listItems);

  const toggle = useCallback(
    (itemId: string) =>
      setState((s) => ({
        ...s,
        items: toggleItem(s.items, itemId, getMockCurrentMember().id, s.online),
      })),
    [],
  );

  const add = useCallback(
    (name: string) =>
      setState((s) => ({
        ...s,
        items: addItem(s.items, listId, name, getMockCurrentMember().id, s.online, newItemId()),
      })),
    [listId],
  );

  const toggleOnline = useCallback(
    () =>
      setState((s) => ({
        online: !s.online,
        // Al volver la conexión se sincroniza todo.
        items: s.online ? s.items : markSynced(s.items),
      })),
    [],
  );

  return {
    pending,
    done,
    online,
    unsyncedCount: countUnsynced(listItems),
    toggle,
    add,
    toggleOnline,
  };
}

/** Datos de quien agregó o tildó un ítem, para su avatar. */
export function useMemberLookup(): (memberId: string) => Member {
  return (memberId) =>
    mockHousehold.members.find((member) => member.id === memberId) ?? mockHousehold.members[0];
}
