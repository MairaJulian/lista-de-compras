import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

let env;

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

const H = 'hogar1';
const OTHER_H = 'hogar2';
const HOUR = 60 * 60 * 1000;
const ago = (hours) => Timestamp.fromMillis(Date.now() - hours * HOUR);

const dbOf = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());
const presRef = (db, uid, hogar = H) => doc(db, 'hogares', hogar, 'presencia', uid);

const member = (overrides = {}) => ({
  nombre: 'Persona',
  foto: null,
  colorAvatar: 'green',
  rol: 'miembro',
  estado: 'activo',
  desde: ago(24),
  hasta: null,
  invitacionId: null,
  invitadoPor: null,
  ...overrides,
});

const latido = (overrides = {}) => ({ listaId: 'lista1', ultimoLatido: serverTimestamp(), ...overrides });

/** Ana (creadora), beto y cami activos; salio y quitada ya no; dos hogares. */
async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const hogar of [H, OTHER_H]) {
      await setDoc(doc(db, 'hogares', hogar), {
        nombre: 'Casa',
        creadoPor: 'ana',
        creadoEn: ago(500),
        invitacionActivaId: '',
        creadorActualId: 'ana',
      });
    }
    const members = {
      ana: { rol: 'creador' },
      beto: {},
      cami: {},
      salio: { estado: 'salio', hasta: ago(1) },
      quitada: { estado: 'quitado', hasta: ago(1) },
    };
    for (const [uid, overrides] of Object.entries(members)) {
      await setDoc(doc(db, 'hogares', H, 'miembros', uid), member({ nombre: uid, ...overrides }));
    }
    await setDoc(doc(db, 'hogares', OTHER_H, 'miembros', 'otra'), member({ nombre: 'otra' }));
    await setDoc(presRef(db, 'beto'), { listaId: 'lista1', ultimoLatido: ago(0.01) });
    await setDoc(presRef(db, 'cami'), { listaId: '', ultimoLatido: ago(1) });
    await setDoc(presRef(db, 'otra', OTHER_H), { listaId: 'x', ultimoLatido: ago(0.01) });
  });
}

describe('presencia: escribir la propia', () => {
  beforeEach(seed);

  it('un miembro activo crea y renueva su latido con la hora del servidor', async () => {
    await assertSucceeds(setDoc(presRef(dbOf('ana'), 'ana'), latido()));
    await assertSucceeds(setDoc(presRef(dbOf('beto'), 'beto'), latido({ listaId: 'lista2' })));
  });

  it('el latido con merge (listaId y ultimoLatido) funciona', async () => {
    await assertSucceeds(setDoc(presRef(dbOf('beto'), 'beto'), latido(), { merge: true }));
    await assertSucceeds(setDoc(presRef(dbOf('ana'), 'ana'), latido(), { merge: true }));
  });

  it('vaciar listaId al salir de la lista', async () => {
    await assertSucceeds(updateDoc(presRef(dbOf('beto'), 'beto'), { listaId: '', ultimoLatido: serverTimestamp() }));
    await assertSucceeds(setDoc(presRef(dbOf('beto'), 'beto'), latido({ listaId: '' })));
  });

  it('no se escribe la presencia de otra persona', async () => {
    await assertFails(setDoc(presRef(dbOf('beto'), 'cami'), latido()));
    await assertFails(updateDoc(presRef(dbOf('beto'), 'cami'), { listaId: 'lista1', ultimoLatido: serverTimestamp() }));
    await assertFails(setDoc(presRef(dbOf('ana'), 'beto'), latido()));
  });

  it('quien no es miembro activo no escribe, ni siquiera la propia', async () => {
    for (const uid of ['salio', 'quitada', 'otra', null]) {
      await assertFails(setDoc(presRef(dbOf(uid), uid ?? 'beto'), latido()));
    }
  });

  it('el latido tiene que ser la hora del servidor', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(presRef(db, 'beto'), latido({ ultimoLatido: ago(0) })));
    await assertFails(setDoc(presRef(db, 'beto'), latido({ ultimoLatido: Timestamp.fromMillis(Date.now() + 3600 * 1000) })));
    await assertFails(setDoc(presRef(db, 'beto'), latido({ ultimoLatido: 123 })));
    await assertFails(setDoc(presRef(db, 'beto'), latido({ ultimoLatido: null })));
  });

  it('listaId es texto de hasta 100 caracteres (vacío permitido)', async () => {
    const db = dbOf('beto');
    await assertSucceeds(setDoc(presRef(db, 'beto'), latido({ listaId: 'a'.repeat(100) })));
    await assertFails(setDoc(presRef(db, 'beto'), latido({ listaId: 'a'.repeat(101) })));
    await assertFails(setDoc(presRef(db, 'beto'), latido({ listaId: null })));
    await assertFails(setDoc(presRef(db, 'beto'), latido({ listaId: 5 })));
  });

  it('no admite campos de más ni falta ninguno', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(presRef(db, 'beto'), latido({ extra: 1 })));
    await assertFails(setDoc(presRef(db, 'beto'), { ultimoLatido: serverTimestamp() }));
    await assertFails(setDoc(presRef(db, 'beto'), { listaId: 'lista1' }));
    await assertFails(updateDoc(presRef(db, 'beto'), { listaId: deleteField(), ultimoLatido: serverTimestamp() }));
    await assertFails(updateDoc(presRef(db, 'beto'), { ultimoLatido: deleteField() }));
    await assertFails(updateDoc(presRef(db, 'beto'), { nombre: 'X', ultimoLatido: serverTimestamp() }));
  });

  it('actualizar solo listaId, sin renovar el latido, es rechazado', async () => {
    await assertFails(updateDoc(presRef(dbOf('beto'), 'beto'), { listaId: 'lista9' }));
  });

  it('la presencia no se borra, ni la propia', async () => {
    await assertFails(deleteDoc(presRef(dbOf('beto'), 'beto')));
    await assertFails(deleteDoc(presRef(dbOf('ana'), 'beto')));
    await assertFails(deleteDoc(presRef(dbOf('ana'), 'ana')));
  });
});

describe('presencia: leer', () => {
  beforeEach(seed);

  it('un miembro activo lee la presencia de cualquiera del hogar', async () => {
    await assertSucceeds(getDoc(presRef(dbOf('ana'), 'beto')));
    await assertSucceeds(getDoc(presRef(dbOf('beto'), 'cami')));
    await assertSucceeds(getDoc(presRef(dbOf('beto'), 'beto')));
  });

  it('un miembro activo lista toda la presencia del hogar', async () => {
    const snap = await assertSucceeds(getDocs(collection(dbOf('cami'), 'hogares', H, 'presencia')));
    if (snap.size !== 2) throw new Error('esperaba 2 documentos, hay ' + snap.size);
  });

  it('quien no es miembro activo no lee ni lista', async () => {
    for (const uid of ['salio', 'quitada', 'otra', null]) {
      await assertFails(getDoc(presRef(dbOf(uid), 'beto')));
      await assertFails(getDocs(collection(dbOf(uid), 'hogares', H, 'presencia')));
    }
  });

  it('un miembro de un hogar no lee ni escribe la presencia del otro', async () => {
    await assertFails(getDoc(presRef(dbOf('beto'), 'otra', OTHER_H)));
    await assertFails(getDocs(collection(dbOf('beto'), 'hogares', OTHER_H, 'presencia')));
    await assertFails(setDoc(presRef(dbOf('beto'), 'beto', OTHER_H), latido()));
    await assertFails(setDoc(presRef(dbOf('otra'), 'otra', H), latido()));
  });
});

describe('presencia: otras rutas siguen bloqueadas', () => {
  beforeEach(seed);

  it('subcolecciones dentro de presencia y eventos', async () => {
    await assertFails(setDoc(doc(dbOf('beto'), 'hogares', H, 'presencia', 'beto', 'sub', 'x'), { a: 1 }));
    await assertFails(setDoc(doc(dbOf('beto'), 'hogares', H, 'eventos', 'e1'), { tipo: 'x' }));
  });
});
