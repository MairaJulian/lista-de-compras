import {
  collection,
  doc,
  getDocsFromServer,
  getFirestore,
  limit,
  query,
  Timestamp,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';

import { drainInBatches, PURGE_BATCH_SIZE, purgeCutoff } from './purgeLogic';

// Los ítems borrados y las listas eliminadas hace más de 30 días se eliminan de verdad. No hay
// servidor que lo haga: lo hace la app al abrirse, cualquier miembro (las reglas lo permiten, ver
// `firestore.rules`). Cada consulta filtra por UN solo campo (`borradoEn` o `eliminadaEn` con
// "menor que", o `listaId` con "igual"), así que no hace falta ningún índice compuesto.

const ranFor = new Set<string>();

type Collection = 'items' | 'listas';

/**
 * Elimina de a tandas lo que cumple `where(field, operator, value)`. La lectura va al servidor:
 * sin conexión falla y no se encola nada. Cada tanda se elimina antes de pedir la siguiente, así la
 * consulta siempre trae lo que queda.
 */
function purgeCollection(
  householdId: string,
  name: Collection,
  field: string,
  operator: '<' | '==',
  value: unknown,
) {
  const db = getFirestore();
  const source = collection(db, 'hogares', householdId, name);
  return drainInBatches(
    async () => {
      const snapshot = await getDocsFromServer(
        query(source, where(field, operator, value), limit(PURGE_BATCH_SIZE)),
      );
      return snapshot.docs.map((document) => document.id);
    },
    async (ids) => {
      const batch = writeBatch(db);
      for (const id of ids) batch.delete(doc(source, id));
      await batch.commit();
    },
  );
}

/**
 * Ítems con `borradoEn` vencido; luego, por cada lista con `eliminadaEn` vencido, sus ítems (la
 * regla pide que la lista todavía exista) y por último la lista. Devuelve cuántos documentos
 * eliminó. Falla (con el error) si el servidor no responde o rechaza.
 */
export async function purgeExpired(householdId: string, now: number = Date.now()): Promise<number> {
  const cutoff = Timestamp.fromMillis(purgeCutoff(now));
  let total = await purgeCollection(householdId, 'items', 'borradoEn', '<', cutoff);

  const lists = await getDocsFromServer(
    query(
      collection(getFirestore(), 'hogares', householdId, 'listas'),
      where('eliminadaEn', '<', cutoff),
      limit(PURGE_BATCH_SIZE),
    ),
  );
  for (const list of lists.docs) {
    total += await purgeCollection(householdId, 'items', 'listaId', '==', list.id);
  }
  total += await purgeCollection(householdId, 'listas', 'eliminadaEn', '<', cutoff);
  return total;
}

/**
 * Una vez por apertura de la app y por hogar, en segundo plano. Si falla se ignora: se reintenta en
 * la próxima apertura. No pasa por el registro de cambios sin sincronizar ni avisa a nadie.
 */
export async function purgeOncePerOpening(householdId: string): Promise<void> {
  if (ranFor.has(householdId)) return;
  ranFor.add(householdId);
  try {
    await purgeExpired(householdId);
  } catch {
    // Sin conexión o rechazado: queda para la próxima apertura.
  }
}

/** Para los tests. */
export function resetPurgeRuns() {
  ranFor.clear();
}
