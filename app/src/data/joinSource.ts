import { getAuth } from '@react-native-firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  runTransaction,
  serverTimestamp,
} from '@react-native-firebase/firestore';

import {
  InviteInvalidError,
  isInviteUsable,
  isPlausibleCode,
  newJoinMember,
  type JoiningProfile,
} from './joinLogic';

/** Lo que se muestra de la invitación antes de unirse (`02-invitacion-recibida`). */
export type InvitePreview = {
  code: string;
  householdName: string;
  invitedByName: string;
};

function currentUid(): string {
  const uid = getAuth().currentUser?.uid;
  if (!uid) {
    throw new Error('No hay una sesión abierta.');
  }
  return uid;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Lee una invitación (de a una; la colección no se puede listar). Va al servidor: una copia vieja
 * del caché podría mostrar como vigente una invitación que ya se revocó, y sin conexión tiene que
 * fallar. Rechaza con `InviteInvalidError` si no existe, está revocada o venció.
 */
export async function readInvitePreview(code: string): Promise<InvitePreview> {
  currentUid();
  if (!isPlausibleCode(code)) {
    throw new InviteInvalidError();
  }
  const snapshot = await getDocFromServer(doc(getFirestore(), 'invitaciones', code));
  const data = snapshot.data();
  if (!snapshot.exists() || !isInviteUsable(data, Date.now())) {
    throw new InviteInvalidError();
  }
  return {
    code,
    householdName: text(data?.hogarNombre),
    invitedByName: text(data?.invitadoPorNombre),
  };
}

/**
 * Se une al hogar de la invitación: crea (o reactiva, si había salido o la habían quitado) su
 * documento de `miembros` con rol `miembro` y pone `hogarActualId`, todo en una transacción. Una
 * transacción, a diferencia de una escritura común, falla al instante sin conexión en vez de
 * quedar en cola. Las reglas vuelven a verificar que la invitación esté activa y no haya vencido.
 * Rechaza con `InviteInvalidError` si la invitación no sirve.
 */
export async function joinHousehold(code: string, account: Omit<JoiningProfile, 'uid'>) {
  const uid = currentUid();
  if (!isPlausibleCode(code)) {
    throw new InviteInvalidError();
  }
  const db = getFirestore();
  const inviteRef = doc(db, 'invitaciones', code);
  const userRef = doc(db, 'usuarios', uid);

  await runTransaction(db, async (transaction) => {
    // Primero todas las lecturas (también obligan a hablar con el servidor).
    const invite = await transaction.get(inviteRef);
    const data = invite.data();
    if (!invite.exists() || !isInviteUsable(data, Date.now())) {
      throw new InviteInvalidError();
    }
    const householdId = data?.hogarId as string;
    const memberRef = doc(db, 'hogares', householdId, 'miembros', uid);
    const member = await transaction.get(memberRef);
    const user = await transaction.get(userRef);
    if (!user.exists()) {
      throw new Error('Todavía no existe el documento de la persona.');
    }

    // Si ya figuraba activa en ese hogar solo falta apuntar `hogarActualId`.
    if (!(member.exists() && member.data()?.estado === 'activo')) {
      transaction.set(
        memberRef,
        newJoinMember(
          { uid, ...account },
          { code, createdBy: text(data?.creadaPor) },
          serverTimestamp(),
        ),
      );
    }
    transaction.update(userRef, { hogarActualId: householdId });
  });
}
