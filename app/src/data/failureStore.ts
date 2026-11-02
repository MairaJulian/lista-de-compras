import { useSyncExternalStore } from 'react';

import { pendingDocOf, scopeOf, type FailedDescriptor, type FailedWrite } from './failureLogic';
import { isActiveMember } from './householdSource';
import {
  addItem,
  createList,
  renameList,
  setItemDeleted,
  setItemDone,
  setListDeleted,
  updateItemFields,
} from './listSource';
import { clearPending, trackPending } from './pendingStore';

// Escrituras que el servidor rechazó (las reglas), guardadas por la app: Firestore deshace el cambio en
// el celular y no avisa en ninguna lectura, así que sin esto se perdería sin que nadie se entere. Viven
// en memoria: si se cierra la app, se pierden (ver `ETAPA-4.md`, PR 6).

let failures: FailedWrite[] = [];
let nextId = 1;
// Sube al vaciar: un rechazo que llega de una lectura anterior (otro hogar, otra sesión) no cuenta.
let generation = 0;
const listeners = new Set<() => void>();

function setFailures(next: FailedWrite[]) {
  failures = next;
  listeners.forEach((listener) => listener());
}

const isPermissionDenied = (error: unknown) =>
  String((error as { code?: unknown } | null)?.code ?? '').endsWith('permission-denied');

/**
 * Vigila una escritura. La promesa solo se rechaza cuando el servidor dice que no (con conexión, en
 * ~100 ms; sin conexión queda pendiente y el rechazo llega al volver, aunque la pantalla ya no esté):
 * ahí se guarda el fallo. Una escritura sin conexión no es un fallo, se envía sola. Mientras espera
 * al servidor cuenta como "cambio sin sincronizar" (`pendingStore`).
 *
 * Excepción: si el rechazo es de permisos y la persona ya no es miembro activa del hogar (la
 * quitaron mientras estaba sin conexión), no es un error de guardado: el cambio se descarta y la app
 * muestra "Ya no sos parte de…" (lo dispara la lectura de la membresía, ver `householdStore`).
 */
export function trackWrite(saved: Promise<unknown>, descriptor: FailedDescriptor) {
  const startedIn = generation;
  trackPending(saved, pendingDocOf(descriptor));
  saved.then(undefined, async (error: unknown) => {
    if (startedIn !== generation) return;
    if (isPermissionDenied(error) && (await isActiveMember(descriptor.householdId)) === false) {
      console.warn(`Cambio descartado, ya no sos parte del hogar (${descriptor.kind}).`);
      return;
    }
    if (startedIn !== generation) return;
    console.warn(`No se pudo guardar (${descriptor.kind}):`, error);
    setFailures([...failures, { ...descriptor, id: nextId++ }]);
  });
}

function send(failure: FailedWrite): Promise<unknown> {
  const { householdId, uid } = failure;
  switch (failure.kind) {
    case 'addItem':
      // Mismo id: la creación se rechazó, así que no puede quedar duplicado.
      return addItem(householdId, uid, failure.item.listId, failure.item.name, failure.item.id)
        .saved;
    case 'toggleItem':
      return setItemDone(householdId, uid, failure.item.id, failure.done);
    case 'editItem':
      return updateItemFields(householdId, failure.item.id, failure.patch);
    case 'deleteItem':
      return setItemDeleted(householdId, uid, failure.item.id, failure.deleted);
    case 'createList':
      return createList(householdId, uid, failure.list.name, failure.tone, failure.list.id).saved;
    case 'renameList':
      return renameList(householdId, failure.list.id, failure.name);
    case 'deleteList':
      return setListDeleted(householdId, uid, failure.list.id);
  }
}

/**
 * "Reintentar": vuelve a enviar los cambios fallidos de esa pantalla, en el orden en que se hicieron.
 * Salen de la lista de fallidos; si el servidor los rechaza otra vez, vuelven a entrar.
 */
export function retryFailures(scope: string) {
  const mine = failures.filter((failure) => scopeOf(failure) === scope);
  if (mine.length === 0) return;
  setFailures(failures.filter((failure) => !mine.includes(failure)));
  for (const failure of mine) {
    trackWrite(send(failure), failure);
  }
}

/** "Descartar": los saca de la lista de fallidos (el cambio ya estaba deshecho). */
export function discardFailures(scope: string) {
  setFailures(failures.filter((failure) => scopeOf(failure) !== scope));
}

/** Los cambios fallidos de una pantalla (`HOME_SCOPE` o el id de una lista). */
export function useFailures(scope: string): FailedWrite[] {
  const all = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => failures,
  );
  return all.filter((failure) => scopeOf(failure) === scope);
}

/** Sin cambios fallidos (al dejar de leer el hogar, y en los tests). */
export function clearFailures() {
  generation++;
  clearPending();
  if (failures.length > 0) setFailures([]);
}
