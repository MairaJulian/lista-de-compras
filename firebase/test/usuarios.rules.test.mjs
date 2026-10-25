import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, Timestamp } from 'firebase/firestore';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

let env;

const validUser = () => ({
  nombre: 'Maira',
  email: 'maira@example.com',
  foto: 'https://example.com/foto.jpg',
  creadoEn: Timestamp.now(),
  hogarActualId: null,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'changuito-rules-test',
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const seed = (uid, data = validUser()) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'usuarios', uid), data));

describe('usuarios/{uid}', () => {
  it('una persona crea y lee su propio documento', async () => {
    const db = env.authenticatedContext('maira').firestore();
    await assertSucceeds(setDoc(doc(db, 'usuarios', 'maira'), validUser()));
    await assertSucceeds(getDoc(doc(db, 'usuarios', 'maira')));
  });

  it('acepta una cuenta sin foto y preferencias válidas', async () => {
    const db = env.authenticatedContext('maira').firestore();
    const { foto, ...sinFoto } = validUser();
    await assertSucceeds(
      setDoc(doc(db, 'usuarios', 'maira'), {
        ...sinFoto,
        preferencias: { avisarAgregadosBorrados: true, listasSilenciadas: ['a'] },
      }),
    );
  });

  it('actualiza nombre y foto de su propio documento', async () => {
    await seed('maira');
    const db = env.authenticatedContext('maira').firestore();
    await assertSucceeds(updateDoc(doc(db, 'usuarios', 'maira'), { nombre: 'Maira J.', foto: null }));
  });

  it('no lee ni escribe el documento de otra persona', async () => {
    await seed('otra');
    const db = env.authenticatedContext('maira').firestore();
    await assertFails(getDoc(doc(db, 'usuarios', 'otra')));
    await assertFails(updateDoc(doc(db, 'usuarios', 'otra'), { nombre: 'Hackeada' }));
    await assertFails(setDoc(doc(db, 'usuarios', 'otra'), validUser()));
    await assertFails(deleteDoc(doc(db, 'usuarios', 'otra')));
  });

  it('no puede listar la colección de usuarios', async () => {
    await seed('maira');
    const db = env.authenticatedContext('maira').firestore();
    await assertFails(getDocs(collection(db, 'usuarios')));
  });

  it('sin sesión no accede a nada', async () => {
    await seed('maira');
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'usuarios', 'maira')));
    await assertFails(setDoc(doc(db, 'usuarios', 'maira'), validUser()));
    await assertFails(updateDoc(doc(db, 'usuarios', 'maira'), { nombre: 'x' }));
  });

  it('rechaza campos que no existen en el esquema', async () => {
    const db = env.authenticatedContext('maira').firestore();
    await assertFails(setDoc(doc(db, 'usuarios', 'maira'), { ...validUser(), admin: true }));
    await seed('maira');
    await assertFails(updateDoc(doc(db, 'usuarios', 'maira'), { admin: true }));
  });

  it('rechaza crear sin campos obligatorios o con tipos incorrectos', async () => {
    const db = env.authenticatedContext('maira').firestore();
    const { email, ...sinEmail } = validUser();
    await assertFails(setDoc(doc(db, 'usuarios', 'maira'), sinEmail));
    await assertFails(setDoc(doc(db, 'usuarios', 'maira'), { ...validUser(), nombre: 123 }));
    await assertFails(setDoc(doc(db, 'usuarios', 'maira'), { ...validUser(), creadoEn: 'ayer' }));
    await assertFails(
      setDoc(doc(db, 'usuarios', 'maira'), { ...validUser(), preferencias: { avisarAgregadosBorrados: 'si' } }),
    );
  });

  it('no permite cambiar creadoEn ni borrar el documento', async () => {
    await seed('maira');
    const db = env.authenticatedContext('maira').firestore();
    await assertFails(updateDoc(doc(db, 'usuarios', 'maira'), { creadoEn: Timestamp.fromMillis(0) }));
    await assertFails(deleteDoc(doc(db, 'usuarios', 'maira')));
  });
});

// hogares e invitaciones tienen sus propias pruebas en hogares.rules.test.mjs.
describe('colecciones que todavía no existen', () => {
  it('siguen bloqueadas, incluso con sesión', async () => {
    const db = env.authenticatedContext('maira').firestore();
    for (const path of [
      ['ping', 'ping'],
      ['usuarios', 'maira', 'dispositivos', 'd1'],
    ]) {
      await assertFails(getDoc(doc(db, ...path)));
      await assertFails(setDoc(doc(db, ...path), { a: 1 }));
    }
  });
});
