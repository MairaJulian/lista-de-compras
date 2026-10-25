import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@react-native-firebase/firestore';

export type GoogleProfile = {
  uid: string;
  name: string;
  email: string;
  photo: string | null;
};

/**
 * Crea `usuarios/{uid}` en el primer ingreso. En los siguientes no pisa nada: actualiza solo
 * `nombre` y `foto`, y solo si cambiaron (campos sueltos, nunca el documento entero).
 */
export async function saveUserOnSignIn(profile: GoogleProfile): Promise<void> {
  const ref = doc(getFirestore(), 'usuarios', profile.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      nombre: profile.name,
      email: profile.email,
      foto: profile.photo,
      creadoEn: serverTimestamp(),
      hogarActualId: null,
    });
    return;
  }

  const current = snapshot.data() ?? {};
  const changes: { nombre?: string; foto?: string | null } = {};
  if (current.nombre !== profile.name) changes.nombre = profile.name;
  if ((current.foto ?? null) !== profile.photo) changes.foto = profile.photo;
  if (Object.keys(changes).length > 0) {
    await updateDoc(ref, changes);
  }
}
