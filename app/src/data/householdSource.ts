import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from '@react-native-firebase/firestore';

import { memberFromDocument, newHouseholdDocuments } from './householdLogic';
import type { Member } from './types';

/** Lo que la app necesita saber del hogar: su nombre y la membresía de quien tiene la sesión. */
export type LoadedHousehold = { id: string; name: string; me: Member };

function currentUid(): string {
  const uid = getAuth().currentUser?.uid;
  if (!uid) {
    throw new Error('No hay una sesión abierta.');
  }
  return uid;
}

/**
 * Crea el hogar, el miembro creador y `hogarActualId` en una sola transacción. Una transacción
 * (a diferencia de una escritura común) no se queda en cola sin conexión: falla al instante, y la
 * pantalla puede mostrar el error en vez de quedarse esperando. Las reglas verifican que el hogar
 * y su miembro creador se creen juntos.
 */
export async function createHousehold(
  name: string,
  account: { name: string; photo: string | null },
): Promise<LoadedHousehold> {
  const uid = currentUid();
  const db = getFirestore();
  const householdRef = doc(collection(db, 'hogares'));
  const userRef = doc(db, 'usuarios', uid);
  const documents = newHouseholdDocuments({ uid, ...account }, name, serverTimestamp());

  await runTransaction(db, async (transaction) => {
    // Leer primero obliga a hablar con el servidor: sin conexión la transacción falla acá.
    const user = await transaction.get(userRef);
    if (!user.exists()) {
      throw new Error('Todavía no existe el documento de la persona.');
    }
    transaction.set(householdRef, documents.household);
    transaction.set(doc(db, 'hogares', householdRef.id, 'miembros', uid), documents.member);
    transaction.update(userRef, { hogarActualId: householdRef.id });
  });

  const me = memberFromDocument(uid, documents.member);
  if (!me) {
    throw new Error('El miembro creador no quedó activo.');
  }
  return { id: householdRef.id, name, me };
}

/**
 * Escucha el hogar y la membresía de quien tiene la sesión (su propio documento de `miembros`).
 * Avisa cada vez que cambian y, si no se puede leer alguno, con `onError`. Devuelve la función
 * para dejar de escuchar.
 */
export function watchHousehold(
  householdId: string,
  onData: (household: LoadedHousehold) => void,
  onError: () => void,
): () => void {
  let uid: string;
  try {
    uid = currentUid();
  } catch {
    onError();
    return () => {};
  }
  const db = getFirestore();
  let name: string | undefined;
  let me: Member | undefined;

  const emit = () => {
    if (name !== undefined && me) onData({ id: householdId, name, me });
  };

  const stopHousehold = onSnapshot(
    doc(db, 'hogares', householdId),
    (snapshot) => {
      const data = snapshot.data();
      if (!snapshot.exists() || typeof data?.nombre !== 'string') {
        onError();
        return;
      }
      name = data.nombre;
      emit();
    },
    onError,
  );
  const stopMember = onSnapshot(
    doc(db, 'hogares', householdId, 'miembros', uid),
    (snapshot) => {
      // Si ya no está activa (la sacaron) la pantalla "te sacaron" llega en el PR 6.
      me = memberFromDocument(uid, snapshot.data());
      if (!me) {
        onError();
        return;
      }
      emit();
    },
    onError,
  );

  return () => {
    stopHousehold();
    stopMember();
  };
}
