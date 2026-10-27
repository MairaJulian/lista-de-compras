import { getAuth } from '@react-native-firebase/auth';
import {
  doc,
  getFirestore,
  onSnapshot,
  runTransaction,
  Timestamp,
} from '@react-native-firebase/firestore';
import { getRandomBytes } from 'expo-crypto';

import { generateInviteCode, inviteExpiry } from './inviteLogic';

function currentUid(): string {
  const uid = getAuth().currentUser?.uid;
  if (!uid) {
    throw new Error('No hay una sesión abierta.');
  }
  return uid;
}

/**
 * Crea una invitación nueva (con vencimiento a 48 h), revoca la anterior si seguía activa y apunta
 * `invitacionActivaId` del hogar a la nueva. Todo en una transacción: las reglas exigen que la
 * anterior quede revocada en el mismo lote, y sin conexión falla al instante (una escritura común
 * quedaría en cola y la pantalla esperando). Devuelve el código.
 */
export async function createInvite(householdId: string): Promise<string> {
  const uid = currentUid();
  const db = getFirestore();
  const householdRef = doc(db, 'hogares', householdId);
  const memberRef = doc(db, 'hogares', householdId, 'miembros', uid);
  const code = generateInviteCode(getRandomBytes);
  const inviteRef = doc(db, 'invitaciones', code);

  await runTransaction(db, async (transaction) => {
    // Primero todas las lecturas (también obligan a hablar con el servidor).
    const household = await transaction.get(householdRef);
    const member = await transaction.get(memberRef);
    if (!household.exists() || !member.exists()) {
      throw new Error('El hogar o la membresía no existen.');
    }
    const previousId = household.data()?.invitacionActivaId;
    const previousRef =
      typeof previousId === 'string' && previousId
        ? doc(db, 'invitaciones', previousId)
        : undefined;
    const previous = previousRef ? await transaction.get(previousRef) : undefined;

    if (previousRef && previous?.exists() && previous.data()?.estado === 'activa') {
      transaction.update(previousRef, { estado: 'revocada' });
    }
    transaction.set(inviteRef, {
      hogarId: householdId,
      creadaPor: uid,
      venceEn: Timestamp.fromMillis(inviteExpiry(Date.now())),
      estado: 'activa',
      hogarNombre: household.data()?.nombre,
      invitadoPorNombre: member.data()?.nombre,
    });
    transaction.update(householdRef, { invitacionActivaId: code });
  });
  return code;
}

/** Revoca la invitación vigente y deja `invitacionActivaId` vacío. Transacción, por lo mismo que `createInvite`. */
export async function revokeInvite(householdId: string): Promise<void> {
  currentUid();
  const db = getFirestore();
  const householdRef = doc(db, 'hogares', householdId);

  await runTransaction(db, async (transaction) => {
    const household = await transaction.get(householdRef);
    if (!household.exists()) {
      throw new Error('El hogar no existe.');
    }
    const previousId = household.data()?.invitacionActivaId;
    if (typeof previousId !== 'string' || !previousId) {
      return;
    }
    const previousRef = doc(db, 'invitaciones', previousId);
    const previous = await transaction.get(previousRef);
    if (previous.exists() && previous.data()?.estado === 'activa') {
      transaction.update(previousRef, { estado: 'revocada' });
    }
    transaction.update(householdRef, { invitacionActivaId: null });
  });
}

/** Datos crudos de una invitación (`undefined` si no existe). Devuelve la función para dejar de escuchar. */
export function watchInvite(
  code: string,
  onData: (data: { estado?: unknown; venceEn?: unknown } | undefined) => void,
  onError: () => void,
): () => void {
  return onSnapshot(
    doc(getFirestore(), 'invitaciones', code),
    (snapshot) => onData(snapshot.data()),
    onError,
  );
}
