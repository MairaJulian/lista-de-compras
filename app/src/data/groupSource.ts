import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  collectionGroup,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

import type { GroupSummary } from './groupLogic';
import { groupTypeFromDocument, isArchivedDocument } from './householdLogic';

// Lecturas puntuales de los grupos de la persona. Nunca hay listeners sobre grupos que no están
// abiertos: se lee una vez al abrir el panel `47` o la pantalla `48` (y se guarda un rato).

function currentUid(): string {
  const uid = getAuth().currentUser?.uid;
  if (!uid) {
    throw new Error('No hay una sesión abierta.');
  }
  return uid;
}

/** uid de quien tiene la sesión, o `null` sin sesión (sin lanzar). */
export function currentUserId(): string | null {
  return getAuth().currentUser?.uid ?? null;
}

function millis(value: unknown): number | undefined {
  const toMillis = (value as { toMillis?: () => number } | null | undefined)?.toMillis;
  return typeof toMillis === 'function' ? toMillis.call(value) : undefined;
}

async function countOf(source: ReturnType<typeof query>): Promise<number | undefined> {
  try {
    return (await getCountFromServer(source)).data().count;
  } catch {
    return undefined;
  }
}

/**
 * Todos los grupos activos de la persona. Costo por apertura: la consulta de "mis grupos" (1 lectura
 * por grupo), el documento de cada grupo (1) y, para los no archivados, dos consultas de conteo
 * (miembros y pendientes; cada una cuenta como 1 lectura cada 1.000 documentos, o sea 1). Sin
 * conexión la consulta falla; un conteo que falla queda sin dato y el renglón no lo muestra.
 *
 * Los pendientes cuentan los ítems con `borrado == false` y `comprado == false`, incluidos los de
 * una lista eliminada que todavía no se purgó: puede diferir en uno o dos del número de Inicio.
 */
export async function fetchMyGroups(): Promise<GroupSummary[]> {
  const uid = currentUid();
  const db = getFirestore();
  const memberships = await getDocs(
    query(
      collectionGroup(db, 'miembros'),
      where('uid', '==', uid),
      where('estado', '==', 'activo'),
    ),
  );

  const groups = await Promise.all(
    memberships.docs.map(async (membership): Promise<GroupSummary | undefined> => {
      const householdId = membership.ref.parent.parent?.id;
      if (!householdId) return undefined;
      const member = membership.data();
      try {
        const household = await getDoc(doc(db, 'hogares', householdId));
        const data = household.data();
        if (!household.exists() || typeof data?.nombre !== 'string') return undefined;
        const archived = isArchivedDocument(data.archivado);
        const [memberCount, pendingCount] = !archived
          ? await Promise.all([
              countOf(
                query(
                  collection(db, 'hogares', householdId, 'miembros'),
                  where('estado', '==', 'activo'),
                ),
              ),
              countOf(
                query(
                  collection(db, 'hogares', householdId, 'items'),
                  where('borrado', '==', false),
                  where('comprado', '==', false),
                ),
              ),
            ])
          : [undefined, undefined];
        return {
          id: householdId,
          name: data.nombre,
          type: groupTypeFromDocument(data.tipo),
          archived,
          archivedAt: millis(data.archivadoEn),
          role: member.rol === 'creador' ? 'creator' : 'member',
          since: millis(member.desde),
          memberCount,
          pendingCount,
        };
      } catch {
        // Un grupo que no se pudo leer no tira abajo la lista de los demás.
        return undefined;
      }
    }),
  );
  return groups.flatMap((group) => group ?? []);
}

/**
 * Pasa a otro grupo: solo cambia `hogarActualId` (el último grupo usado) y marca `ultimoUso` en la
 * membresía propia. Son escrituras simples: funcionan sin conexión y la sesión lo ve al instante.
 * `ultimoUso` es opcional (si falla no importa) y las reglas no lo admiten en un grupo archivado.
 */
export async function switchToGroup(householdId: string, archived: boolean): Promise<void> {
  const uid = currentUid();
  const db = getFirestore();
  if (!archived) {
    updateDoc(doc(db, 'hogares', householdId, 'miembros', uid), {
      ultimoUso: serverTimestamp(),
    }).catch(() => {});
  }
  await updateDoc(doc(db, 'usuarios', uid), { hogarActualId: householdId });
}
