import { useCallback, useEffect, useRef, useState } from 'react';

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
import { HOME_SCOPE, markFailures, type FailedWrite, type ListRow } from './failureLogic';
import { discardFailures, retryFailures, trackWrite, useFailures } from './failureStore';
import { memberOrFallback } from './listDocuments';
import {
  addItem,
  addList,
  cleanItemName,
  cleanListName,
  countUnsynced,
  deleteList,
  ItemPatch,
  markSynced,
  removeDone,
  removeItem,
  renameList,
  restoreItem,
  splitItems,
  summarizeLists,
  toggleItem,
  updateItem,
} from './listLogic';
import {
  addItem as addItemDocument,
  createList as createListDocument,
  renameList as renameListDocument,
  setItemDeleted,
  setItemDone,
  setListDeleted,
  updateItemFields,
} from './listSource';
import { retryListData, useListData } from './listStore';
import type { Household, Invite, ListInfo, ListItem, ListSummary, Member } from './types';

// Único punto de acceso a los datos para las pantallas. Hoy devuelve los datos de ejemplo;
// con Firebase se reemplaza la implementación sin tocar las pantallas.

/** Si la sesión es la real (de Google): los datos salen de Firestore. */
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

/** Las listas del hogar con sus pendientes; las eliminadas no se muestran. */
export function useLists(): ListSummary[] {
  const { lists, items } = useMockStore();
  const data = useListData();
  if (useIsRealSession()) {
    return data.status === 'ready' ? summarizeLists(data.lists, data.items) : [];
  }
  return summarizeLists(lists, items);
}

export type ListsLoad = { status: 'loading' | 'ready' | 'error'; retry: () => void };

/**
 * Si ya se leyeron el hogar y sus listas e ítems (`error` es la pantalla `32-error-carga`). Con datos
 * de ejemplo está siempre listo.
 */
export function useListsLoad(): ListsLoad {
  const real = useIsRealSession();
  const household = useHouseholdLoad();
  const data = useListData();
  const retry = useCallback(() => {
    retryHousehold();
    retryListData();
  }, []);
  if (!real) {
    return { status: 'ready', retry };
  }
  if (household.status === 'error' || data.status === 'error') {
    return { status: 'error', retry };
  }
  if (household.status === 'loading' || data.status !== 'ready') {
    return { status: 'loading', retry };
  }
  return { status: 'ready', retry };
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
  const data = useListData();
  if (useIsRealSession()) {
    return data.status === 'ready'
      ? data.lists.find((list) => list.id === listId && !list.deleted)
      : undefined;
  }
  return lists.find((list) => list.id === listId);
}

/**
 * Crea una lista nueva en el hogar y devuelve su id (nada si el nombre estaba vacío). En la sesión
 * real es una escritura simple: la lista aparece al instante y no se espera al servidor.
 */
export function useCreateList(): (name: string, tone: ListTone) => string | undefined {
  const real = useIsRealSession();
  const data = useListData();
  const me = useCurrentMember();
  const householdId = data.status === 'ready' ? data.householdId : undefined;
  return useCallback(
    (name, tone) => {
      if (real) {
        const clean = cleanListName(name);
        if (!clean || !householdId) return undefined;
        const { id, saved } = createListDocument(householdId, me.id, clean, tone);
        trackWrite(saved, {
          kind: 'createList',
          householdId,
          uid: me.id,
          list: { id, name: clean, tone, icon: 'list' },
          tone,
        });
        return id;
      }
      const id = newListId();
      let created = false;
      setState((s) => {
        const lists = addList(s.lists, name, tone, id);
        created = lists !== s.lists;
        return { ...s, lists };
      });
      return created ? id : undefined;
    },
    [real, householdId, me.id],
  );
}

const noItems: ListItem[] = [];

/** Cambios fallidos de una pantalla, con "Reintentar" y "Descartar" (`37`). */
export type FailureControls = {
  failures: FailedWrite[];
  retry: () => void;
  discard: () => void;
};

/** Los cambios que el servidor rechazó en Inicio (`HOME_SCOPE`) o en una lista (su id). */
export function useFailureControls(scope: string): FailureControls {
  const failures = useFailures(scope);
  return {
    failures,
    retry: useCallback(() => retryFailures(scope), [scope]),
    discard: useCallback(() => discardFailures(scope), [scope]),
  };
}

/** Los de crear o eliminar una lista, que se ven en Inicio. */
export function useHomeFailures(): FailureControls {
  return useFailureControls(HOME_SCOPE);
}

export type ListContents = {
  /** Con las filas que el servidor rechazó marcadas, ver `markFailures`. */
  pending: ListRow[];
  done: ListRow[];
  failures: FailureControls;
  online: boolean;
  /** Falso en la sesión real: el indicador Sincronizado / Sin conexión es de la Etapa 5. */
  showConnection: boolean;
  unsyncedCount: number;
  toggle: (itemId: string) => void;
  add: (name: string) => void;
  update: (itemId: string, patch: ItemPatch) => void;
  remove: (itemId: string) => void;
  /** Deshace `remove`. */
  restore: (itemId: string) => void;
  /** Borra los comprados de la lista (al salir de ella). Solo con los datos de ejemplo hasta la Etapa 6. */
  removeDone: () => void;
  toggleOnline: () => void;
};

/**
 * Ítems de una lista con las acciones de la pantalla Lista. En la sesión real cada acción es una
 * escritura simple que toca solo sus campos: la pantalla se actualiza al instante y no espera al
 * servidor (sin conexión la escritura queda pendiente).
 */
export function useListContents(listId: string): ListContents {
  const { items: mockItems, online } = useMockStore();
  const real = useIsRealSession();
  const data = useListData();
  const me = useCurrentMember();
  const householdId = data.status === 'ready' ? data.householdId : undefined;
  const realItems = data.status === 'ready' ? data.items : noItems;
  const items = real ? realItems : mockItems;
  const listItems = items.filter((item) => item.listId === listId);
  const failures = useFailureControls(listId);
  const { pending, done } = markFailures(splitItems(listItems), failures.failures);
  // Lo que se borró en esta pantalla, para poder deshacerlo (ya no está en `items`).
  const removed = useRef(new Map<string, ListItem>());

  const toggle = useCallback(
    (itemId: string) => {
      if (real) {
        const item = items.find((candidate) => candidate.id === itemId);
        if (!householdId || !item) return;
        trackWrite(setItemDone(householdId, me.id, itemId, !item.done), {
          kind: 'toggleItem',
          householdId,
          uid: me.id,
          item,
          done: !item.done,
        });
        return;
      }
      setState((s) => ({
        ...s,
        items: toggleItem(s.items, itemId, getMockCurrentMember().id, s.online),
      }));
    },
    [real, householdId, me.id, items],
  );

  const add = useCallback(
    (name: string) => {
      if (real) {
        const clean = cleanItemName(name);
        if (!householdId || !clean) return;
        const { id, saved } = addItemDocument(householdId, me.id, listId, clean);
        const item: ListItem = {
          id,
          listId,
          name: clean,
          done: false,
          addedBy: me.id,
          addedAt: Date.now(),
        };
        trackWrite(saved, { kind: 'addItem', householdId, uid: me.id, item });
        return;
      }
      setState((s) => ({
        ...s,
        items: addItem(s.items, listId, name, getMockCurrentMember().id, s.online, newItemId()),
      }));
    },
    [real, householdId, me.id, listId],
  );

  const update = useCallback(
    (itemId: string, patch: ItemPatch) => {
      if (real) {
        // Sin campos cambiados no hay nada que enviar.
        const item = items.find((candidate) => candidate.id === itemId);
        if (!householdId || !item || Object.keys(patch).length === 0) return;
        trackWrite(updateItemFields(householdId, itemId, patch), {
          kind: 'editItem',
          householdId,
          uid: me.id,
          item,
          patch,
        });
        return;
      }
      setState((s) => ({ ...s, items: updateItem(s.items, itemId, patch, s.online) }));
    },
    [real, householdId, me.id, items],
  );

  const remove = useCallback(
    (itemId: string) => {
      if (real) {
        const item = items.find((candidate) => candidate.id === itemId);
        if (!householdId || !item) return;
        removed.current.set(itemId, item);
        trackWrite(setItemDeleted(householdId, me.id, itemId, true), {
          kind: 'deleteItem',
          householdId,
          uid: me.id,
          item,
          deleted: true,
        });
        return;
      }
      setState((s) => ({ ...s, items: removeItem(s.items, itemId) }));
    },
    [real, householdId, me.id, items],
  );

  const restore = useCallback(
    (itemId: string) => {
      if (real) {
        const item = removed.current.get(itemId);
        if (!householdId || !item) return;
        trackWrite(setItemDeleted(householdId, me.id, itemId, false), {
          kind: 'deleteItem',
          householdId,
          uid: me.id,
          item,
          deleted: false,
        });
        return;
      }
      setState((s) => ({ ...s, items: restoreItem(s.items, itemId) }));
    },
    [real, householdId, me.id],
  );

  const clearDone = useCallback(() => {
    // En la sesión real los comprados se acumulan hasta la Etapa 6 (limpieza al salir de la lista).
    if (real) return;
    setState((s) => ({ ...s, items: removeDone(s.items, listId) }));
  }, [real, listId]);

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
    failures,
    online,
    showConnection: !real,
    unsyncedCount: real ? 0 : countUnsynced(listItems),
    toggle,
    add,
    update,
    remove,
    restore,
    removeDone: clearDone,
    toggleOnline,
  };
}

export type ListActions = {
  /** Cambia el nombre de la lista (nada si queda vacío o igual). */
  rename: (name: string) => void;
  /** Elimina la lista para todo el hogar. */
  remove: () => void;
};

/**
 * Renombrar y eliminar una lista. En la sesión real son escrituras simples: la pantalla no espera al
 * servidor y, si lo rechaza, el fallo queda en Inicio (eliminar) o en la lista (renombrar).
 */
export function useListActions(listId: string): ListActions {
  const real = useIsRealSession();
  const data = useListData();
  const me = useCurrentMember();
  const list = useList(listId);
  const householdId = data.status === 'ready' ? data.householdId : undefined;

  const rename = useCallback(
    (name: string) => {
      if (real) {
        const clean = cleanListName(name);
        if (!householdId || !list || !clean || clean === list.name) return;
        trackWrite(renameListDocument(householdId, listId, clean), {
          kind: 'renameList',
          householdId,
          uid: me.id,
          list,
          name: clean,
        });
        return;
      }
      setState((s) => ({ ...s, lists: renameList(s.lists, listId, name) }));
    },
    [real, householdId, list, listId, me.id],
  );

  const remove = useCallback(() => {
    if (real) {
      if (!householdId || !list) return;
      trackWrite(setListDeleted(householdId, me.id, listId), {
        kind: 'deleteList',
        householdId,
        uid: me.id,
        list,
      });
      return;
    }
    setState((s) => ({ ...s, lists: deleteList(s.lists, listId) }));
  }, [real, householdId, list, listId, me.id]);

  return { rename, remove };
}

/**
 * La lista, si está eliminada (`38-lista-eliminada`): su nombre y quién la eliminó. Solo en la
 * sesión real; con los datos de ejemplo no hay otra persona que la elimine.
 */
export function useRemovedList(listId: string): { name: string; deletedBy?: string } | undefined {
  const real = useIsRealSession();
  const data = useListData();
  if (!real || data.status !== 'ready') return undefined;
  const list = data.lists.find((candidate) => candidate.id === listId);
  return list?.deleted ? { name: list.name, deletedBy: list.deletedBy } : undefined;
}

/**
 * Datos de quien agregó o tildó un ítem, para su avatar. En la sesión real salen de `miembros` de
 * todos los estados, así que quien ya salió del hogar sigue con su nombre y su color.
 */
export function useMemberLookup(): (memberId: string) => Member {
  const real = useIsRealSession();
  const data = useListData();
  return (memberId) =>
    real
      ? memberOrFallback(data.status === 'ready' ? data.members : [], memberId)
      : (mockHousehold.members.find((member) => member.id === memberId) ??
        mockHousehold.members[0]);
}
