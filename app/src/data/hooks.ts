import { useCallback } from 'react';

import type { ListTone } from '../theme';
import { useSession } from '../auth/sessionStore';
import { demoAccount } from '../auth/sessionState';
import { getMockCurrentMember, mockHousehold, mockInvites } from '../mock/data';
import { joinMockHousehold, newItemId, newListId, setState, useMockStore } from '../mock/store';
import {
  cleanHouseholdName,
  deactivateInvite,
  leaveHousehold,
  regenerateInvite,
  removeMember,
} from './householdLogic';
import { createHousehold, renameHousehold } from './householdSource';
import { retryHousehold, seedHousehold, useHouseholdState } from './householdStore';
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

/** Si la sesión es la real (de Google): los datos salen de Firestore y todavía no hay listas ni ítems. */
export function useIsRealSession(): boolean {
  const session = useSession();
  return session.status === 'signedIn' && !session.demo;
}

export function useHousehold(): Household {
  const { members, householdName } = useMockStore();
  const real = useIsRealSession();
  const loaded = useHouseholdState();
  if (!real) {
    return { ...mockHousehold, name: householdName, members };
  }
  // Mientras se lee, o si no se pudo, no hay datos que mostrar.
  return loaded.status === 'ready'
    ? { id: loaded.household.id, name: loaded.household.name, members: loaded.household.members }
    : { id: '', name: '', members: [] };
}

export type HouseholdLoad = { status: 'loading' | 'ready' | 'error'; retry: () => void };

/** Si ya se leyó el hogar de la sesión real (`error` es la pantalla `32-error-carga`). Con datos de ejemplo está siempre listo. */
export function useHouseholdLoad(): HouseholdLoad {
  const session = useSession();
  const loaded = useHouseholdState();
  const reading = session.status === 'signedIn' && !session.demo && session.householdId !== null;
  if (!reading || loaded.status === 'ready') {
    return { status: 'ready', retry: retryHousehold };
  }
  return { status: loaded.status === 'error' ? 'error' : 'loading', retry: retryHousehold };
}

/** Con sesión, lo que dice `hogarActualId`; sin sesión (pantallas sueltas, tests) los datos de ejemplo. */
export function useHasHousehold(): boolean {
  const session = useSession();
  const { hasHousehold } = useMockStore();
  return session.status === 'signedIn' ? session.hasHousehold : hasHousehold;
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

/**
 * Crea un hogar nuevo con una sola persona. Devuelve `false` si el nombre no sirve (vacío o muy
 * largo); si no se pudo crear (sin conexión, reglas) rechaza. En la sesión real lo crea en
 * Firestore con una transacción; con los datos de ejemplo, en memoria.
 */
export function useCreateHousehold(): (name: string) => Promise<boolean> {
  const session = useSession();
  const account = session.status === 'signedIn' && !session.demo ? session.account : undefined;
  return useCallback(
    async (name) => {
      const clean = cleanHouseholdName(name);
      if (!clean) {
        return false;
      }
      if (account) {
        // El correo no viaja: en `miembros` solo se guardan nombre y foto.
        seedHousehold(await createHousehold(clean, { name: account.name, photo: account.photo }));
        return true;
      }
      setState((s) => ({
        ...s,
        householdName: clean,
        members: [{ ...getMockCurrentMember(), role: 'creator' }],
        hasHousehold: true,
      }));
      return true;
    },
    [account],
  );
}

/**
 * Cambia el nombre del hogar. Devuelve `false` si el nombre no sirve (vacío o muy largo); si no se
 * pudo guardar (sin conexión, reglas) rechaza. En la sesión real el nombre nuevo llega solo por la
 * lectura en tiempo real del hogar.
 */
export function useRenameHousehold(): (name: string) => Promise<boolean> {
  const real = useIsRealSession();
  const loaded = useHouseholdState();
  const householdId = loaded.status === 'ready' ? loaded.household.id : undefined;
  return useCallback(
    async (name) => {
      const clean = cleanHouseholdName(name);
      if (!clean) {
        return false;
      }
      if (real) {
        if (!householdId) {
          throw new Error('El hogar todavía no se leyó.');
        }
        await renameHousehold(householdId, clean);
      } else {
        setState((s) => ({ ...s, householdName: clean }));
      }
      return true;
    },
    [real, householdId],
  );
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
  // Las listas reales llegan en la Etapa 4: un hogar real todavía no tiene ninguna.
  if (useIsRealSession()) {
    return [];
  }
  return lists.map((list) => ({
    ...list,
    pendingCount: countPending(items.filter((item) => item.listId === list.id)),
  }));
}

export function useCurrentMember(): Member {
  const real = useIsRealSession();
  const loaded = useHouseholdState();
  return real && loaded.status === 'ready' ? loaded.household.me : getMockCurrentMember();
}

/** Cuenta con la que se entró (nombre y mail de Google, que aparecen en Perfil). */
export function useAccount(): { member: Member; email: string } {
  const session = useSession();
  const current = useCurrentMember();
  const account = session.status === 'signedIn' ? session.account : demoAccount;
  return { member: { ...current, name: account.name }, email: account.email };
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
