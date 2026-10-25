import { useCallback } from 'react';

import type { ListTone } from '../theme';
import { getMockCurrentMember, mockAccountEmail, mockHousehold, mockInvites } from '../mock/data';
import { joinMockHousehold, newItemId, newListId, setState, useMockStore } from '../mock/store';
import { deactivateInvite, leaveHousehold, regenerateInvite, removeMember } from './householdLogic';
import {
  addItem,
  addList,
  countPending,
  countUnsynced,
  ItemPatch,
  markSynced,
  removeDone,
  removeItem,
  splitItems,
  toggleItem,
  updateItem,
} from './listLogic';
import type { Household, Invite, ListInfo, ListItem, ListSummary, Member } from './types';

// Único punto de acceso a los datos para las pantallas. Hoy devuelve los datos de ejemplo;
// con Firebase se reemplaza la implementación sin tocar las pantallas.

export function useHousehold(): Household {
  const { members, householdName } = useMockStore();
  return { ...mockHousehold, name: householdName, members };
}

export function useHasHousehold(): boolean {
  return useMockStore().hasHousehold;
}

/** Sale del hogar (si era quien lo creó, el rol pasa a otro miembro) y queda sin hogar. */
export function useLeaveHousehold(): () => void {
  return useCallback(
    () =>
      setState((s) => ({
        ...s,
        members: leaveHousehold(s.members, getMockCurrentMember().id),
        hasHousehold: false,
      })),
    [],
  );
}

/** Crea un hogar nuevo con una sola persona (nada si el nombre estaba vacío). */
export function useCreateHousehold(): (name: string) => boolean {
  return useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return false;
    }
    setState((s) => ({
      ...s,
      householdName: trimmed,
      members: [{ ...getMockCurrentMember(), role: 'creator' }],
      hasHousehold: true,
    }));
    return true;
  }, []);
}

/** Se une al hogar de ejemplo (con un enlace o un código). */
export function useJoinHousehold(): () => void {
  return joinMockHousehold;
}

/** Si hay conexión (las invitaciones necesitan internet; el indicador de la lista lo alterna). */
export function useOnline(): boolean {
  return useMockStore().online;
}

/** Quita a un miembro del hogar (solo si quien lo pide creó el hogar). */
export function useRemoveMember(): (memberId: string) => void {
  return useCallback(
    (memberId) =>
      setState((s) => ({
        ...s,
        members: removeMember(s.members, memberId, getMockCurrentMember().id),
      })),
    [],
  );
}

export type InviteControls = {
  invite: Invite;
  regenerate: () => void;
  deactivate: () => void;
};

/** Enlace y código de invitación del hogar, con generar uno nuevo y desactivar. */
export function useInvite(): InviteControls {
  const { invite } = useMockStore();
  const regenerate = useCallback(
    () => setState((s) => ({ ...s, invite: regenerateInvite(mockInvites, s.invite) })),
    [],
  );
  const deactivate = useCallback(
    () => setState((s) => ({ ...s, invite: deactivateInvite(s.invite) })),
    [],
  );
  return { invite, regenerate, deactivate };
}

export function useLists(): ListSummary[] {
  const { lists, items } = useMockStore();
  return lists.map((list) => ({
    ...list,
    pendingCount: countPending(items.filter((item) => item.listId === list.id)),
  }));
}

export function useCurrentMember(): Member {
  return getMockCurrentMember();
}

/** Cuenta con la que se entró (el mail aparece en Perfil). */
export function useAccount(): { member: Member; email: string } {
  return { member: getMockCurrentMember(), email: mockAccountEmail };
}

export function useList(listId: string): ListInfo | undefined {
  const { lists } = useMockStore();
  return lists.find((list) => list.id === listId);
}

/** Crea una lista nueva en el hogar y devuelve su id (nada si el nombre estaba vacío). */
export function useCreateList(): (name: string, tone: ListTone) => string | undefined {
  return useCallback((name, tone) => {
    const id = newListId();
    let created = false;
    setState((s) => {
      const lists = addList(s.lists, name, tone, id);
      created = lists !== s.lists;
      return { ...s, lists };
    });
    return created ? id : undefined;
  }, []);
}

export type ListContents = {
  pending: ListItem[];
  done: ListItem[];
  online: boolean;
  unsyncedCount: number;
  toggle: (itemId: string) => void;
  add: (name: string) => void;
  update: (itemId: string, patch: ItemPatch) => void;
  remove: (itemId: string) => void;
  /** Borra los comprados de la lista (al salir de ella). */
  removeDone: () => void;
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

  const update = useCallback(
    (itemId: string, patch: ItemPatch) =>
      setState((s) => ({ ...s, items: updateItem(s.items, itemId, patch, s.online) })),
    [],
  );

  const remove = useCallback(
    (itemId: string) => setState((s) => ({ ...s, items: removeItem(s.items, itemId) })),
    [],
  );

  const clearDone = useCallback(
    () => setState((s) => ({ ...s, items: removeDone(s.items, listId) })),
    [listId],
  );

  const toggleOnline = useCallback(
    () =>
      setState((s) => ({
        ...s,
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
    update,
    remove,
    removeDone: clearDone,
    toggleOnline,
  };
}

/** Datos de quien agregó o tildó un ítem, para su avatar. */
export function useMemberLookup(): (memberId: string) => Member {
  return (memberId) =>
    mockHousehold.members.find((member) => member.id === memberId) ?? mockHousehold.members[0];
}
