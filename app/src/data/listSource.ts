import {
  collection,
  deleteField,
  doc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

import type { ListTone } from '../theme';
import { anyMemberFromDocument, itemFromDocument, listFromDocument } from './listDocuments';
import { sortLists, type ItemPatch } from './listLogic';
import type { ListInfo, ListItem, Member } from './types';

/**
 * Lo que se lee del hogar con una sola suscripción por colección: listas (también las eliminadas,
 * para poder avisar), ítems no borrados y miembros de todos los estados.
 */
export type HouseholdData = { lists: ListInfo[]; items: ListItem[]; members: Member[] };

// Con 'estimate' un ítem recién escrito (todavía sin la hora del servidor) trae la hora del celular
// en vez de `null`, y aparece arriba al instante.
const snapshotOptions = { serverTimestamps: 'estimate' } as const;

/**
 * Escucha listas, ítems y miembros del hogar. Avisa con todo junto cuando llegó la primera lectura de
 * las tres y después cada vez que cambia alguna (también con los cambios propios, que Firestore
 * aplica al instante en el celular). Si no se puede leer alguna, avisa con `onError`.
 */
export function watchHouseholdData(
  householdId: string,
  onData: (data: HouseholdData) => void,
  onError: () => void,
): () => void {
  const db = getFirestore();
  let lists: ListInfo[] | undefined;
  let items: ListItem[] | undefined;
  let members: Member[] | undefined;

  const emit = () => {
    if (lists && items && members) {
      onData({ lists, items, members });
    }
  };

  const stopLists = onSnapshot(
    collection(db, 'hogares', householdId, 'listas'),
    (snapshot) => {
      lists = sortLists(
        snapshot.docs.flatMap(
          (document) => listFromDocument(document.id, document.data(snapshotOptions)) ?? [],
        ),
      );
      emit();
    },
    onError,
  );
  const stopItems = onSnapshot(
    query(collection(db, 'hogares', householdId, 'items'), where('borrado', '==', false)),
    (snapshot) => {
      items = snapshot.docs.flatMap(
        (document) => itemFromDocument(document.id, document.data(snapshotOptions)) ?? [],
      );
      emit();
    },
    onError,
  );
  const stopMembers = onSnapshot(
    collection(db, 'hogares', householdId, 'miembros'),
    (snapshot) => {
      members = snapshot.docs.map((document) =>
        anyMemberFromDocument(document.id, document.data()),
      );
      emit();
    },
    onError,
  );

  return () => {
    stopLists();
    stopItems();
    stopMembers();
  };
}

// Todas las escrituras son simples (nunca transacciones): Firestore las aplica al instante en el
// celular y las envía cuando hay conexión. La promesa que devuelven solo se resuelve cuando el
// servidor confirma, así que sin conexión queda pendiente: las pantallas no la esperan y la usan
// solo para enterarse de un rechazo. Cada cambio toca únicamente sus campos ("gana el último, por
// campo"), nunca reescribe el documento.

/**
 * Crea una lista. Devuelve su id (lo genera el celular) y la promesa de la escritura. Al reintentar
 * una creación rechazada se pasa el mismo `id`.
 */
export function createList(
  householdId: string,
  uid: string,
  name: string,
  tone: ListTone,
  id?: string,
): { id: string; saved: Promise<void> } {
  const db = getFirestore();
  const lists = collection(db, 'hogares', householdId, 'listas');
  const ref = id === undefined ? doc(lists) : doc(lists, id);
  const saved = setDoc(ref, {
    nombre: name,
    color: tone,
    creadaPor: uid,
    creadaEn: serverTimestamp(),
    eliminada: false,
  });
  return { id: ref.id, saved };
}

/** Renombra la lista: toca solo `nombre`. */
export function renameList(householdId: string, listId: string, name: string) {
  return updateDoc(doc(getFirestore(), 'hogares', householdId, 'listas', listId), {
    nombre: name,
  });
}

/**
 * Elimina la lista con una sola escritura: la marca `eliminada`. Sus ítems no se tocan (la app los
 * ignora y la purga de la Etapa 6 los limpia).
 */
export function setListDeleted(householdId: string, uid: string, listId: string) {
  return updateDoc(doc(getFirestore(), 'hogares', householdId, 'listas', listId), {
    eliminada: true,
    eliminadaPor: uid,
    eliminadaEn: serverTimestamp(),
  });
}

/**
 * Agrega un ítem. `comprado` y `borrado` se escriben siempre en `false`: sin `borrado` la consulta de
 * ítems no borrados no lo encontraría. Al reintentar un ítem rechazado se pasa el mismo `id`.
 */
export function addItem(
  householdId: string,
  uid: string,
  listId: string,
  name: string,
  id?: string,
): { id: string; saved: Promise<void> } {
  const db = getFirestore();
  const items = collection(db, 'hogares', householdId, 'items');
  const ref = id === undefined ? doc(items) : doc(items, id);
  const saved = setDoc(ref, {
    listaId: listId,
    nombre: name,
    comprado: false,
    agregadoPor: uid,
    agregadoEn: serverTimestamp(),
    borrado: false,
  });
  return { id: ref.id, saved };
}

function itemRef(householdId: string, itemId: string) {
  return doc(getFirestore(), 'hogares', householdId, 'items', itemId);
}

/** Tilda o destilda. Tocan `comprado`, `tildadoPor` y `tildadoEn`, y nada más. */
export function setItemDone(householdId: string, uid: string, itemId: string, done: boolean) {
  return updateDoc(
    itemRef(householdId, itemId),
    done
      ? { comprado: true, tildadoPor: uid, tildadoEn: serverTimestamp() }
      : { comprado: false, tildadoPor: deleteField(), tildadoEn: deleteField() },
  );
}

/** Edita solo los campos del parche. Una nota `undefined` se borra; la unidad nunca se toca. */
export function updateItemFields(householdId: string, itemId: string, patch: ItemPatch) {
  const fields: Record<string, unknown> = {};
  if (patch.name !== undefined) fields.nombre = patch.name;
  if (patch.quantity !== undefined) fields.cantidad = patch.quantity;
  if ('note' in patch) fields.nota = patch.note ? patch.note : deleteField();
  if (Object.keys(fields).length === 0) {
    return Promise.resolve();
  }
  return updateDoc(itemRef(householdId, itemId), fields);
}

/** Borra el ítem (lo marca; el documento sigue) o, con `deleted` en `false`, deshace el borrado. */
export function setItemDeleted(householdId: string, uid: string, itemId: string, deleted: boolean) {
  return updateDoc(
    itemRef(householdId, itemId),
    deleted
      ? { borrado: true, borradoPor: uid, borradoEn: serverTimestamp() }
      : { borrado: false, borradoPor: deleteField(), borradoEn: deleteField() },
  );
}
