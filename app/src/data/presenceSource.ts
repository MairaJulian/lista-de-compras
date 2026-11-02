import { AppState } from 'react-native';
import {
  collection,
  doc,
  getDocsFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';

import {
  HEARTBEAT_MS,
  isListOpenByOthers,
  presenceFromDocument,
  type Presence,
} from './presenceLogic';

/** Cuánto se espera al servidor al leer la presencia antes de darla por fallida. */
export const PRESENCE_READ_TIMEOUT_MS = 4000;

function presenceRef(householdId: string, uid: string) {
  return doc(getFirestore(), 'hogares', householdId, 'presencia', uid);
}

/**
 * Escribe la propia presencia: `setDoc` con `merge` de `listaId` y `ultimoLatido` (hora del
 * servidor). Con `listId` vacío indica que no hay ninguna lista abierta. Nunca falla hacia afuera:
 * un latido perdido no es un error para la persona (el siguiente lo repone).
 */
export function writePresence(householdId: string, uid: string, listId: string): Promise<void> {
  return setDoc(
    presenceRef(householdId, uid),
    { listaId: listId, ultimoLatido: serverTimestamp() },
    { merge: true },
  ).catch(() => {});
}

/**
 * Mantiene el latido mientras la lista está abierta: uno al empezar y uno cada 30 segundos. Cuando
 * la app pasa a segundo plano el latido se detiene (y se retoma al volver). Devuelve la función que
 * lo termina y vacía `listaId`.
 */
export function startPresence(householdId: string, uid: string, listId: string): () => void {
  let timer: ReturnType<typeof setInterval> | undefined;
  const beat = () => void writePresence(householdId, uid, listId);
  const stopTimer = () => {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  };
  const startTimer = () => {
    if (timer !== undefined) return;
    beat();
    timer = setInterval(beat, HEARTBEAT_MS);
  };

  if (AppState.currentState === 'active') startTimer();
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') startTimer();
    else stopTimer();
  });

  return () => {
    subscription.remove();
    stopTimer();
    void writePresence(householdId, uid, '');
  };
}

/**
 * Lee la presencia de todo el hogar con una lectura puntual forzada al servidor (no una
 * suscripción). Falla si no hay conexión o el servidor no responde a tiempo.
 */
export async function readPresencesFromServer(householdId: string): Promise<Presence[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('presence-timeout')), PRESENCE_READ_TIMEOUT_MS);
  });
  try {
    const snapshot = await Promise.race([
      getDocsFromServer(collection(getFirestore(), 'hogares', householdId, 'presencia')),
      timeout,
    ]);
    return snapshot.docs.map((document) => presenceFromDocument(document.id, document.data()));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Si se pueden borrar los comprados al salir de la lista: nadie más la tiene abierta. Ante
 * cualquier falla (sin conexión, sin respuesta, sin permiso) devuelve `false`: no se borra nada.
 */
export async function canCleanUpList(
  householdId: string,
  listId: string,
  uid: string,
): Promise<boolean> {
  try {
    const presences = await readPresencesFromServer(householdId);
    return !isListOpenByOthers(presences, listId, uid, Date.now());
  } catch {
    return false;
  }
}
