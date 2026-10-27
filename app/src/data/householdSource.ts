import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDocFromCache,
  getFirestore,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from '@react-native-firebase/firestore';

import { activeMembers, memberFromDocument, newHouseholdDocuments } from './householdLogic';
import type { Member } from './types';

/**
 * Lo que la app necesita saber del hogar: su nombre, la membresía de quien tiene la sesión, los
 * miembros activos y el código de la invitación vigente (`null` si no hay).
 */
export type LoadedHousehold = {
  id: string;
  name: string;
  activeInviteId: string | null;
  me: Member;
  members: Member[];
};

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
  return { id: householdRef.id, name, activeInviteId: null, me, members: [me] };
}

/**
 * Cambia el nombre del hogar. Es una transacción por lo mismo que crear el hogar: una escritura
 * común sin conexión queda en cola y la pantalla se quedaría esperando; la transacción falla al
 * instante y el panel muestra el error. Solo toca el campo `nombre`.
 */
export async function renameHousehold(householdId: string, name: string): Promise<void> {
  currentUid();
  const db = getFirestore();
  const householdRef = doc(db, 'hogares', householdId);
  await runTransaction(db, async (transaction) => {
    // Leer primero obliga a hablar con el servidor: sin conexión la transacción falla acá.
    const household = await transaction.get(householdRef);
    if (!household.exists()) {
      throw new Error('El hogar no existe.');
    }
    transaction.update(householdRef, { nombre: name });
  });
}

/**
 * Quita a un miembro: pasa su estado a `quitado` con la hora de salida. Solo toca esos dos campos
 * (las reglas exigen que quien lo hace sea el creador activo). Es una transacción por lo mismo que
 * crear el hogar: sin conexión falla al instante en vez de quedar en cola. Si esa persona ya no
 * estaba activa (se fue mientras tanto) no hay nada que hacer.
 */
export async function removeMemberFromHousehold(householdId: string, memberId: string) {
  currentUid();
  const db = getFirestore();
  const memberRef = doc(db, 'hogares', householdId, 'miembros', memberId);
  await runTransaction(db, async (transaction) => {
    const member = await transaction.get(memberRef);
    const data = member.data();
    if (!member.exists() || data?.estado !== 'activo') {
      return;
    }
    if (data.rol !== 'miembro') {
      throw new Error('Quien creó el hogar no se puede quitar.');
    }
    transaction.update(memberRef, { estado: 'quitado', hasta: serverTimestamp() });
  });
}

/**
 * Sale del hogar y vacía `hogarActualId`, todo en una transacción. Si quien sale es el creador y
 * queda alguien (`successorId`, el que lleva más tiempo), en el mismo lote le pasa el rol: la
 * persona que sale queda como `miembro`, `successorId` como `creador` y el hogar apunta a ella en
 * `creadorActualId`. Sin `successorId` (miembro común, o la última persona) solo sale.
 */
export async function leaveCurrentHousehold(householdId: string, successorId?: string) {
  const uid = currentUid();
  const db = getFirestore();
  const memberRef = doc(db, 'hogares', householdId, 'miembros', uid);
  const householdRef = doc(db, 'hogares', householdId);
  const userRef = doc(db, 'usuarios', uid);

  await runTransaction(db, async (transaction) => {
    // Primero todas las lecturas (también obligan a hablar con el servidor).
    const member = await transaction.get(memberRef);
    const user = await transaction.get(userRef);
    const successorRef = successorId
      ? doc(db, 'hogares', householdId, 'miembros', successorId)
      : undefined;
    const successor = successorRef ? await transaction.get(successorRef) : undefined;
    if (!user.exists()) {
      throw new Error('Todavía no existe el documento de la persona.');
    }

    // Si ya no figuraba activa (salió desde otro celular) solo falta vaciar `hogarActualId`.
    if (member.exists() && member.data()?.estado === 'activo') {
      if (successorRef && successorId && member.data()?.rol === 'creador') {
        if (successor?.data()?.estado !== 'activo' || successor.data()?.rol !== 'miembro') {
          throw new Error('Esa persona ya no puede quedar a cargo del hogar.');
        }
        transaction.update(memberRef, {
          estado: 'salio',
          hasta: serverTimestamp(),
          rol: 'miembro',
        });
        transaction.update(successorRef, { rol: 'creador' });
        transaction.update(householdRef, { creadorActualId: successorId });
      } else {
        transaction.update(memberRef, { estado: 'salio', hasta: serverTimestamp() });
      }
    }
    transaction.update(userRef, { hogarActualId: null });
  });
}

/**
 * Vacía el `hogarActualId` propio si todavía apunta a este hogar (cuando te sacaron o saliste desde
 * otro celular). Condicional para no pisar un hogar al que la persona ya se unió después.
 */
export async function forgetHousehold(householdId: string) {
  const uid = currentUid();
  const db = getFirestore();
  const userRef = doc(db, 'usuarios', uid);
  await runTransaction(db, async (transaction) => {
    const user = await transaction.get(userRef);
    if (user.data()?.hogarActualId === householdId) {
      transaction.update(userRef, { hogarActualId: null });
    }
  });
}

/** Por qué la membresía propia dejó de estar activa. */
export type RemovalReason = 'quitado' | 'salio';

/** Último nombre del hogar que quedó en el caché del celular (vacío si no hay). */
async function cachedHouseholdName(householdId: string): Promise<string> {
  try {
    const snapshot = await getDocFromCache(doc(getFirestore(), 'hogares', householdId));
    const name = snapshot.data()?.nombre;
    return typeof name === 'string' ? name : '';
  } catch {
    return '';
  }
}

/**
 * Escucha el hogar, la membresía de quien tiene la sesión (su propio documento de `miembros`) y los
 * miembros activos del hogar. Avisa cada vez que cambian y, si no se puede leer alguno, con `onError`.
 * Si la membresía propia deja de estar activa (te quitaron o saliste) avisa con `onRemoved`, con el
 * nombre del hogar si se conoce. Devuelve la función para dejar de escuchar.
 */
export function watchHousehold(
  householdId: string,
  onData: (household: LoadedHousehold) => void,
  onError: () => void,
  onRemoved: (reason: RemovalReason, householdName: string) => void,
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
  let activeInviteId: string | null = null;
  let me: Member | undefined;
  let members: Member[] | undefined;

  const emit = () => {
    if (name !== undefined && me && members) {
      onData({ id: householdId, name, activeInviteId, me, members });
    }
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
      activeInviteId =
        typeof data.invitacionActivaId === 'string' && data.invitacionActivaId
          ? data.invitacionActivaId
          : null;
      emit();
    },
    onError,
  );
  const stopMember = onSnapshot(
    doc(db, 'hogares', householdId, 'miembros', uid),
    (snapshot) => {
      const data = snapshot.data();
      me = memberFromDocument(uid, data);
      if (!me) {
        // Su propio documento siempre se puede leer: si dice que ya no está activa, la sacaron.
        const reason = snapshot.exists() ? data?.estado : undefined;
        if (reason === 'quitado' || reason === 'salio') {
          // Sin el nombre a mano (la app se abrió ya sin acceso) se busca el que quedó en el caché.
          void (name !== undefined ? Promise.resolve(name) : cachedHouseholdName(householdId)).then(
            (known) => onRemoved(reason, known),
          );
        } else {
          onError();
        }
        return;
      }
      emit();
    },
    onError,
  );

  const stopMembers = onSnapshot(
    query(collection(db, 'hogares', householdId, 'miembros'), where('estado', '==', 'activo')),
    (snapshot) => {
      members = activeMembers(
        snapshot.docs.map((document) => ({ id: document.id, data: document.data() })),
      );
      emit();
    },
    onError,
  );

  return () => {
    stopHousehold();
    stopMember();
    stopMembers();
  };
}
