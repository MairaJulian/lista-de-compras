import { useCallback, useEffect, useState } from 'react';

import type { ListTone } from '../theme';
import { useSession } from '../auth/sessionStore';
import { demoAccount } from '../auth/sessionState';
import { getMockCurrentMember, mockHousehold, mockInvites } from '../mock/data';
import { joinMockHousehold, newItemId, newListId, setState, useMockStore } from '../mock/store';
import {
  cleanHouseholdName,
  deactivateInvite,
  leaveCase,
  leaveHousehold,
  nextCreator,
  regenerateInvite,
  removeMember,
} from './householdLogic';
import {
  createHousehold,
  leaveCurrentHousehold,
  removeMemberFromHousehold,
  renameHousehold,
} from './householdSource';
import { retryHousehold, seedHousehold, useHouseholdState } from './householdStore';
import { inviteFromDocument } from './inviteLogic';
import { joinFailure, normalizeInviteCode, type JoinResult } from './joinLogic';
import { joinHousehold, readInvitePreview } from './joinSource';
import { createInvite, revokeInvite, watchInvite } from './inviteSource';
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

/**
 * Sale del hogar (si era quien lo creó, el rol pasa al miembro que lleva más tiempo) y queda sin
 * hogar. En la sesión real es una transacción: sin conexión rechaza en vez de quedar en cola.
 */
export function useLeaveHousehold(): () => Promise<void> {
  const real = useIsRealSession();
  const loaded = useHouseholdState();
  const household = loaded.status === 'ready' ? loaded.household : undefined;
  return useCallback(async () => {
    if (real) {
      if (!household) {
        throw new Error('El hogar todavía no se leyó.');
      }
      const successor =
        leaveCase(household.members, household.me.id) === 'creator'
          ? nextCreator(household.members, household.me.id)
          : undefined;
      await leaveCurrentHousehold(household.id, successor?.id);
      return;
    }
    setState((s) => ({
      ...s,
      members: leaveHousehold(s.members, getMockCurrentMember().id),
      hasHousehold: false,
    }));
  }, [real, household]);
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

/**
 * Se une al hogar de una invitación (con un enlace o un código). Dice cómo terminó: `invalid` si el
 * código no existe, venció o está revocado; `offline` si no se pudo llegar al servidor. En la sesión
 * real es una transacción de Firestore; con los datos de ejemplo, el enlace de ejemplo.
 */
export function useJoinHousehold(): (code?: string) => Promise<JoinResult> {
  const session = useSession();
  const { invite, online } = useMockStore();
  const account = session.status === 'signedIn' && !session.demo ? session.account : undefined;
  return useCallback(
    async (code) => {
      if (account) {
        try {
          // El correo no viaja: en `miembros` solo se guardan nombre y foto.
          await joinHousehold(normalizeInviteCode(code ?? ''), {
            name: account.name,
            photo: account.photo,
          });
          return 'joined';
        } catch (error) {
          return joinFailure(error);
        }
      }
      // Con los datos de ejemplo, sin conexión es el indicador de la lista, y un enlace inválido es el
      // que se desactivó desde Invitar.
      if (!online) return 'offline';
      if (!invite.active) return 'invalid';
      joinMockHousehold();
      return 'joined';
    },
    [account, invite.active, online],
  );
}

export type InvitePreviewState =
  | { status: 'loading' }
  | { status: 'ready'; householdName: string; detail: string }
  | { status: 'invalid' }
  | { status: 'offline' };

/**
 * Lo que se ve de la invitación antes de unirse: el nombre del hogar y quién invitó (o, con los datos
 * de ejemplo, cuántos son y cuántas listas tiene). Se lee una vez; `retry` vuelve a leer.
 */
export function useInvitePreview(code: string): InvitePreviewState & { retry: () => void } {
  const real = useIsRealSession();
  const household = useHousehold();
  const lists = useLists();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; state: InvitePreviewState }>();
  const key = `${code}#${attempt}`;
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!real) return;
    let cancelled = false;
    readInvitePreview(code).then(
      (preview) => {
        if (cancelled) return;
        const by = preview.invitedByName;
        setLoaded({
          key,
          state: {
            status: 'ready',
            householdName: preview.householdName,
            detail: by ? `Te invitó ${by}` : '',
          },
        });
      },
      (error) => {
        if (!cancelled) setLoaded({ key, state: { status: joinFailure(error) } });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [real, code, key]);

  if (!real) {
    const members = household.members.length;
    const count = `${members === 1 ? '1 miembro' : `${members} miembros`} · ${
      lists.length === 1 ? '1 lista' : `${lists.length} listas`
    }`;
    return { status: 'ready', householdName: household.name, detail: count, retry };
  }
  return { ...(loaded?.key === key ? loaded.state : { status: 'loading' as const }), retry };
}

/** Si hay conexión (las invitaciones necesitan internet; el indicador de la lista lo alterna). */
export function useOnline(): boolean {
  return useMockStore().online;
}

/**
 * Quita a un miembro del hogar (solo si quien lo pide creó el hogar). En la sesión real es una
 * transacción: sin conexión rechaza, y la lista de miembros se actualiza sola por la lectura en
 * tiempo real.
 */
export function useRemoveMember(): (memberId: string) => Promise<void> {
  const real = useIsRealSession();
  const loaded = useHouseholdState();
  const householdId = loaded.status === 'ready' ? loaded.household.id : undefined;
  return useCallback(
    async (memberId) => {
      if (real) {
        if (!householdId) {
          throw new Error('El hogar todavía no se leyó.');
        }
        await removeMemberFromHousehold(householdId, memberId);
        return;
      }
      setState((s) => ({
        ...s,
        members: removeMember(s.members, memberId, getMockCurrentMember().id),
      }));
    },
    [real, householdId],
  );
}

export type InviteControls = {
  /** `loading` mientras se lee, `error` si no se pudo leer (con `retry`). */
  status: 'loading' | 'ready' | 'error';
  invite: Invite;
  /** Genera una invitación nueva y revoca la anterior; rechaza si no se pudo (sin conexión, reglas). */
  regenerate: () => Promise<void>;
  /** Desactiva la invitación vigente; rechaza si no se pudo. */
  deactivate: () => Promise<void>;
  retry: () => void;
};

const noInvite: Invite = { code: '', hoursLeft: 0, active: false };

type WatchedInvite = { code: string; invite: Invite | 'error' };

/** Cuánto se espera para recalcular las horas que le quedan a la invitación. */
const INVITE_TICK_MS = 60 * 1000;

/**
 * Lee en tiempo real la invitación vigente del hogar real (la de `invitacionActivaId`). Sin
 * `inviteId` no hay invitación activa.
 */
function useWatchedInvite(inviteId: string | null | undefined, enabled: boolean) {
  const [watched, setWatched] = useState<WatchedInvite>();
  const [data, setData] = useState<{ estado?: unknown; venceEn?: unknown }>();
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!enabled || !inviteId) return;
    const stop = watchInvite(
      inviteId,
      (next) => {
        setData(next);
        // La hora de referencia es la de esta lectura, no la de cuando se abrió la pantalla.
        setNow(Date.now());
        setWatched({ code: inviteId, invite: inviteFromDocument(inviteId, next, Date.now()) });
      },
      () => setWatched({ code: inviteId, invite: 'error' }),
    );
    return stop;
  }, [enabled, inviteId, attempt]);

  // El vencimiento corre solo: se recalcula cada minuto sin volver a leer.
  useEffect(() => {
    if (!enabled || !inviteId) return;
    const timer = setInterval(() => setNow(Date.now()), INVITE_TICK_MS);
    return () => clearInterval(timer);
  }, [enabled, inviteId]);

  const retry = useCallback(() => {
    setWatched(undefined);
    setAttempt((n) => n + 1);
  }, []);

  if (!inviteId) {
    return { status: 'ready' as const, invite: noInvite, retry };
  }
  // Hasta que llega la lectura de la invitación nueva no se muestra la anterior.
  if (watched?.code !== inviteId) {
    return { status: 'loading' as const, invite: noInvite, retry };
  }
  if (watched.invite === 'error') {
    return { status: 'error' as const, invite: noInvite, retry };
  }
  return { status: 'ready' as const, invite: inviteFromDocument(inviteId, data, now), retry };
}

/** Enlace y código de invitación del hogar, con generar uno nuevo y desactivar. */
export function useInvite(): InviteControls {
  const { invite: mockInvite } = useMockStore();
  const real = useIsRealSession();
  const loaded = useHouseholdState();
  const household = loaded.status === 'ready' ? loaded.household : undefined;
  const watched = useWatchedInvite(household?.activeInviteId, real);

  const regenerate = useCallback(async () => {
    if (!real) {
      setState((s) => ({ ...s, invite: regenerateInvite(mockInvites, s.invite) }));
      return;
    }
    if (!household) {
      throw new Error('El hogar todavía no se leyó.');
    }
    await createInvite(household.id);
  }, [real, household]);

  const deactivate = useCallback(async () => {
    if (!real) {
      setState((s) => ({ ...s, invite: deactivateInvite(s.invite) }));
      return;
    }
    if (!household) {
      throw new Error('El hogar todavía no se leyó.');
    }
    await revokeInvite(household.id);
  }, [real, household]);

  if (!real) {
    return { status: 'ready', invite: mockInvite, regenerate, deactivate, retry: () => {} };
  }
  // Sin el hogar leído todavía no se sabe cuál es la invitación vigente.
  if (!household) {
    return { status: 'loading', invite: noInvite, regenerate, deactivate, retry: retryHousehold };
  }
  return { ...watched, regenerate, deactivate };
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
