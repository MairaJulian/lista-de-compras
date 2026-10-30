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
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
const DAYS_31 = 31 * 24;
const DAYS_29 = 29 * 24;

const dbOf = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

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

const listRef = (db, id = 'lista1', hogar = H) => doc(db, 'hogares', hogar, 'listas', id);
const itemRef = (db, id = 'item1', hogar = H) => doc(db, 'hogares', hogar, 'items', id);

const newList = (overrides = {}) => ({
  nombre: 'Supermercado',
  color: 'green',
  creadaPor: 'beto',
  creadaEn: serverTimestamp(),
  eliminada: false,
  ...overrides,
});

const newItem = (overrides = {}) => ({
  listaId: 'lista1',
  nombre: 'Leche',
  comprado: false,
  agregadoPor: 'beto',
  agregadoEn: serverTimestamp(),
  borrado: false,
  ...overrides,
});

/** Ana (creadora), beto y cami activos; salio y quitada ya no; dos hogares. */
async function seed({ lists = {}, items = {} } = {}) {
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
    for (const [id, overrides] of Object.entries(lists)) {
      await setDoc(
        listRef(db, id),
        newList({ creadaPor: 'ana', creadaEn: ago(100), ...overrides }),
      );
    }
    for (const [id, overrides] of Object.entries(items)) {
      await setDoc(
        itemRef(db, id),
        newItem({ agregadoPor: 'ana', agregadoEn: ago(50), ...overrides }),
      );
    }
    await setDoc(doc(db, 'usuarios', 'beto'), {
      nombre: 'beto',
      email: 'beto@example.com',
      creadoEn: ago(10),
      hogarActualId: OTHER_H,
    });
  });
}

// ---------------------------------------------------------------
// Listas
// ---------------------------------------------------------------

describe('listas: leer', () => {
  beforeEach(() => seed({ lists: { lista1: {}, vieja: { eliminada: true, eliminadaPor: 'ana', eliminadaEn: ago(5) } } }));

  it('un miembro activo lee una lista y la colección, también las eliminadas', async () => {
    const db = dbOf('beto');
    await assertSucceeds(getDoc(listRef(db)));
    await assertSucceeds(getDocs(collection(db, 'hogares', H, 'listas')));
    await assertSucceeds(getDoc(listRef(db, 'vieja')));
  });

  it('quien es de otro hogar no lee las listas', async () => {
    const db = dbOf('otra');
    await assertFails(getDoc(listRef(db)));
    await assertFails(getDocs(collection(db, 'hogares', H, 'listas')));
  });

  it('quien salió o fue quitado no lee las listas', async () => {
    for (const uid of ['salio', 'quitada']) {
      const db = dbOf(uid);
      await assertFails(getDoc(listRef(db)));
      await assertFails(getDocs(collection(db, 'hogares', H, 'listas')));
    }
  });

  it('una persona sin membresía no lee, aunque su hogarActualId apunte al hogar', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'usuarios', 'intrusa'), {
        nombre: 'intrusa',
        email: 'i@example.com',
        creadoEn: ago(1),
        hogarActualId: H,
      });
    });
    await assertFails(getDoc(listRef(dbOf('intrusa'))));
  });

  it('sin sesión no se lee nada', async () => {
    const db = dbOf(null);
    await assertFails(getDoc(listRef(db)));
    await assertFails(getDocs(collection(db, 'hogares', H, 'listas')));
  });
});

describe('listas: crear', () => {
  beforeEach(() => seed());

  it('un miembro activo crea una lista válida (cada uno de los cuatro colores)', async () => {
    for (const [i, color] of ['green', 'amber', 'blue', 'neutral'].entries()) {
      await assertSucceeds(setDoc(listRef(dbOf('beto'), `l${i}`), newList({ color })));
    }
  });

  it('el creador del hogar también crea', async () => {
    await assertSucceeds(setDoc(listRef(dbOf('ana')), newList({ creadaPor: 'ana' })));
  });

  it('quien no es miembro activo no crea (otro hogar, salió, quitado, sin sesión)', async () => {
    for (const uid of ['otra', 'salio', 'quitada', null]) {
      await assertFails(setDoc(listRef(dbOf(uid)), newList({ creadaPor: uid ?? 'x' })));
    }
  });

  it('nombre vacío, solo espacios, demasiado largo o que no es texto es rechazado', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(listRef(db), newList({ nombre: '' })));
    await assertFails(setDoc(listRef(db), newList({ nombre: '   ' })));
    await assertFails(setDoc(listRef(db), newList({ nombre: 'a'.repeat(81) })));
    await assertFails(setDoc(listRef(db), newList({ nombre: 5 })));
    await assertSucceeds(setDoc(listRef(db), newList({ nombre: 'a'.repeat(80) })));
  });

  it('un color fuera de los cuatro es rechazado', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(listRef(db), newList({ color: 'red' })));
    await assertFails(setDoc(listRef(db), newList({ color: '' })));
    await assertFails(setDoc(listRef(db), newList({ color: 1 })));
  });

  it('creadaPor de otra persona o creadaEn que no es la hora del servidor es rechazado', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(listRef(db), newList({ creadaPor: 'ana' })));
    await assertFails(setDoc(listRef(db), newList({ creadaEn: ago(1) })));
    await assertFails(setDoc(listRef(db), newList({ creadaEn: Timestamp.now() })));
  });

  it('eliminada tiene que ser false; no se crea ya eliminada', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(listRef(db), newList({ eliminada: true })));
    await assertFails(
      setDoc(listRef(db), newList({ eliminada: true, eliminadaPor: 'beto', eliminadaEn: serverTimestamp() })),
    );
    const sinCampo = newList();
    delete sinCampo.eliminada;
    await assertFails(setDoc(listRef(db), sinCampo));
  });

  it('faltan campos o sobran campos: rechazado', async () => {
    const db = dbOf('beto');
    const sinNombre = newList();
    delete sinNombre.nombre;
    await assertFails(setDoc(listRef(db), sinNombre));
    await assertFails(setDoc(listRef(db), newList({ extra: 1 })));
    await assertFails(setDoc(listRef(db), newList({ eliminadaPor: 'beto' })));
  });

  it('no se crea en un hogar ajeno', async () => {
    await assertFails(setDoc(listRef(dbOf('beto'), 'l', OTHER_H), newList()));
  });
});

describe('listas: renombrar y cambiar color', () => {
  beforeEach(() => seed({ lists: { lista1: {} } }));

  it('cualquier miembro activo renombra y cambia el color (no solo quien la creó)', async () => {
    await assertSucceeds(updateDoc(listRef(dbOf('beto')), { nombre: 'Verdulería' }));
    await assertSucceeds(updateDoc(listRef(dbOf('cami')), { color: 'blue' }));
    await assertSucceeds(updateDoc(listRef(dbOf('cami')), { nombre: 'Feria', color: 'amber' }));
  });

  it('nombre inválido o color inválido es rechazado', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(listRef(db), { nombre: '' }));
    await assertFails(updateDoc(listRef(db), { nombre: '  ' }));
    await assertFails(updateDoc(listRef(db), { nombre: 'a'.repeat(81) }));
    await assertFails(updateDoc(listRef(db), { color: 'red' }));
  });

  it('creadaPor y creadaEn no cambian', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(listRef(db), { creadaPor: 'beto' }));
    await assertFails(updateDoc(listRef(db), { creadaEn: serverTimestamp() }));
    await assertFails(updateDoc(listRef(db), { nombre: 'Otra', creadaPor: 'beto' }));
  });

  it('no se agregan campos que no existen en el esquema', async () => {
    await assertFails(updateDoc(listRef(dbOf('beto')), { icono: 'carrito' }));
    await assertFails(updateDoc(listRef(dbOf('beto')), { nombre: 'Otra', extra: 1 }));
  });

  it('quien no es miembro activo no modifica', async () => {
    for (const uid of ['otra', 'salio', 'quitada', null]) {
      await assertFails(updateDoc(listRef(dbOf(uid)), { nombre: 'Hackeada' }));
    }
  });

  it('no se mezcla renombrar con eliminar en una misma escritura', async () => {
    await assertFails(
      updateDoc(listRef(dbOf('beto')), {
        nombre: 'Otra',
        eliminada: true,
        eliminadaPor: 'beto',
        eliminadaEn: serverTimestamp(),
      }),
    );
  });
});

describe('listas: eliminar (marcar como eliminada)', () => {
  beforeEach(() => seed({ lists: { lista1: {} } }));

  const eliminar = (extra = {}) => ({
    eliminada: true,
    eliminadaPor: 'beto',
    eliminadaEn: serverTimestamp(),
    ...extra,
  });

  it('cualquier miembro activo la elimina con su uid y la hora del servidor', async () => {
    await assertSucceeds(updateDoc(listRef(dbOf('beto')), eliminar()));
  });

  it('el creador del hogar también la elimina', async () => {
    await assertSucceeds(updateDoc(listRef(dbOf('ana')), eliminar({ eliminadaPor: 'ana' })));
  });

  it('eliminadaPor de otra persona es rechazado', async () => {
    await assertFails(updateDoc(listRef(dbOf('beto')), eliminar({ eliminadaPor: 'ana' })));
  });

  it('eliminadaEn que no es la hora del servidor es rechazado', async () => {
    await assertFails(updateDoc(listRef(dbOf('beto')), eliminar({ eliminadaEn: ago(1) })));
    await assertFails(updateDoc(listRef(dbOf('beto')), eliminar({ eliminadaEn: Timestamp.now() })));
  });

  it('faltan eliminadaPor o eliminadaEn: rechazado', async () => {
    await assertFails(updateDoc(listRef(dbOf('beto')), { eliminada: true }));
    await assertFails(updateDoc(listRef(dbOf('beto')), { eliminada: true, eliminadaPor: 'beto' }));
    await assertFails(updateDoc(listRef(dbOf('beto')), { eliminada: true, eliminadaEn: serverTimestamp() }));
  });

  it('eliminada solo puede ser true (no se "elimina" con otro valor)', async () => {
    await assertFails(updateDoc(listRef(dbOf('beto')), eliminar({ eliminada: false })));
    await assertFails(updateDoc(listRef(dbOf('beto')), eliminar({ eliminada: 'si' })));
  });

  it('quien no es miembro activo no la elimina', async () => {
    for (const uid of ['otra', 'salio', 'quitada', null]) {
      await assertFails(updateDoc(listRef(dbOf(uid)), eliminar({ eliminadaPor: uid ?? 'x' })));
    }
  });

  it('una lista eliminada no se des-elimina ni se modifica más', async () => {
    await assertSucceeds(updateDoc(listRef(dbOf('beto')), eliminar()));
    const db = dbOf('cami');
    await assertFails(updateDoc(listRef(db), { eliminada: false }));
    await assertFails(updateDoc(listRef(db), { eliminada: false, eliminadaPor: deleteField(), eliminadaEn: deleteField() }));
    await assertFails(updateDoc(listRef(db), { nombre: 'Resucitada' }));
    await assertFails(updateDoc(listRef(db), { color: 'blue' }));
    await assertFails(updateDoc(listRef(db), eliminar({ eliminadaPor: 'cami' })));
  });
});

describe('listas: borrado definitivo', () => {
  beforeEach(() =>
    seed({
      lists: {
        activa: {},
        reciente: { eliminada: true, eliminadaPor: 'ana', eliminadaEn: ago(DAYS_29) },
        vieja: { eliminada: true, eliminadaPor: 'ana', eliminadaEn: ago(DAYS_31) },
      },
    }),
  );

  it('una lista eliminada hace más de 30 días se borra de verdad', async () => {
    await assertSucceeds(deleteDoc(listRef(dbOf('beto'), 'vieja')));
  });

  it('una lista eliminada hace menos de 30 días no', async () => {
    await assertFails(deleteDoc(listRef(dbOf('beto'), 'reciente')));
  });

  it('una lista que no está eliminada no se borra', async () => {
    await assertFails(deleteDoc(listRef(dbOf('beto'), 'activa')));
  });

  it('quien no es miembro activo no borra, ni siquiera una vencida', async () => {
    for (const uid of ['otra', 'salio', 'quitada', null]) {
      await assertFails(deleteDoc(listRef(dbOf(uid), 'vieja')));
    }
  });
});

// ---------------------------------------------------------------
// Ítems
// ---------------------------------------------------------------

describe('items: leer', () => {
  beforeEach(() => seed({ items: { item1: {}, item2: { borrado: true, borradoPor: 'ana', borradoEn: ago(2) } } }));

  it('un miembro activo lee un ítem y consulta los no borrados del hogar', async () => {
    const db = dbOf('beto');
    await assertSucceeds(getDoc(itemRef(db)));
    const snap = await assertSucceeds(
      getDocs(query(collection(db, 'hogares', H, 'items'), where('borrado', '==', false))),
    );
    // La consulta de la app trae solo los no borrados.
    if (snap.size !== 1) throw new Error(`se esperaba 1 ítem y llegaron ${snap.size}`);
    await assertSucceeds(getDocs(collection(db, 'hogares', H, 'items')));
  });

  it('quien es de otro hogar, salió, fue quitado o no tiene sesión no lee', async () => {
    for (const uid of ['otra', 'salio', 'quitada', null]) {
      const db = dbOf(uid);
      await assertFails(getDoc(itemRef(db)));
      await assertFails(getDocs(collection(db, 'hogares', H, 'items')));
      await assertFails(getDocs(query(collection(db, 'hogares', H, 'items'), where('borrado', '==', false))));
    }
  });
});

describe('items: crear', () => {
  beforeEach(() => seed());

  it('un miembro activo crea un ítem mínimo', async () => {
    await assertSucceeds(setDoc(itemRef(dbOf('beto')), newItem()));
  });

  it('con cantidad, unidad y nota válidas', async () => {
    await assertSucceeds(
      setDoc(itemRef(dbOf('beto')), newItem({ cantidad: 3, unidad: 'kg', nota: 'La que está en oferta' })),
    );
  });

  it('quien no es miembro activo no crea (otro hogar, salió, quitado, sin sesión)', async () => {
    for (const uid of ['otra', 'salio', 'quitada', null]) {
      await assertFails(setDoc(itemRef(dbOf(uid)), newItem({ agregadoPor: uid ?? 'x' })));
    }
  });

  it('no se crea en un hogar ajeno', async () => {
    await assertFails(setDoc(itemRef(dbOf('beto'), 'i', OTHER_H), newItem()));
  });

  it('nombre vacío, solo espacios, demasiado largo o que no es texto es rechazado', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(itemRef(db), newItem({ nombre: '' })));
    await assertFails(setDoc(itemRef(db), newItem({ nombre: '   ' })));
    await assertFails(setDoc(itemRef(db), newItem({ nombre: 'a'.repeat(121) })));
    await assertFails(setDoc(itemRef(db), newItem({ nombre: 7 })));
    await assertSucceeds(setDoc(itemRef(db), newItem({ nombre: 'a'.repeat(120) })));
  });

  it('listaId vacío o que no es texto es rechazado', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(itemRef(db), newItem({ listaId: '' })));
    await assertFails(setDoc(itemRef(db), newItem({ listaId: 3 })));
    const sinLista = newItem();
    delete sinLista.listaId;
    await assertFails(setDoc(itemRef(db), sinLista));
  });

  it('agregadoPor de otra persona o agregadoEn que no es la hora del servidor es rechazado', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(itemRef(db), newItem({ agregadoPor: 'ana' })));
    await assertFails(setDoc(itemRef(db), newItem({ agregadoEn: ago(1) })));
    await assertFails(setDoc(itemRef(db), newItem({ agregadoEn: Timestamp.now() })));
  });

  it('comprado o borrado en true al crear es rechazado', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(itemRef(db), newItem({ comprado: true, tildadoPor: 'beto', tildadoEn: serverTimestamp() })));
    await assertFails(setDoc(itemRef(db), newItem({ comprado: true })));
    await assertFails(setDoc(itemRef(db), newItem({ borrado: true, borradoPor: 'beto', borradoEn: serverTimestamp() })));
    await assertFails(setDoc(itemRef(db), newItem({ borrado: true })));
  });

  it('comprado y borrado se escriben siempre y son booleanos', async () => {
    const db = dbOf('beto');
    const sinComprado = newItem();
    delete sinComprado.comprado;
    await assertFails(setDoc(itemRef(db), sinComprado));
    const sinBorrado = newItem();
    delete sinBorrado.borrado;
    await assertFails(setDoc(itemRef(db), sinBorrado));
    await assertFails(setDoc(itemRef(db), newItem({ comprado: 'no' })));
    await assertFails(setDoc(itemRef(db), newItem({ borrado: 0 })));
  });

  it('no nace con marcas de tildado o borrado, ni siquiera vacías con valor', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(itemRef(db), newItem({ tildadoPor: 'beto' })));
    await assertFails(setDoc(itemRef(db), newItem({ tildadoEn: serverTimestamp() })));
    await assertFails(setDoc(itemRef(db), newItem({ borradoPor: 'beto' })));
    await assertFails(setDoc(itemRef(db), newItem({ borradoEn: serverTimestamp() })));
  });

  it('cantidad: entera y positiva', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(itemRef(db), newItem({ cantidad: 0 })));
    await assertFails(setDoc(itemRef(db), newItem({ cantidad: -2 })));
    await assertFails(setDoc(itemRef(db), newItem({ cantidad: 1.5 })));
    await assertFails(setDoc(itemRef(db), newItem({ cantidad: '2' })));
    await assertFails(setDoc(itemRef(db), newItem({ cantidad: null })));
    await assertSucceeds(setDoc(itemRef(db), newItem({ cantidad: 1 })));
  });

  it('nota de hasta 500 caracteres y unidad de hasta 30', async () => {
    const db = dbOf('beto');
    await assertSucceeds(setDoc(itemRef(db, 'a'), newItem({ nota: 'n'.repeat(500) })));
    await assertFails(setDoc(itemRef(db, 'b'), newItem({ nota: 'n'.repeat(501) })));
    await assertFails(setDoc(itemRef(db, 'c'), newItem({ nota: 5 })));
    await assertFails(setDoc(itemRef(db, 'd'), newItem({ unidad: 'u'.repeat(31) })));
    await assertFails(setDoc(itemRef(db, 'e'), newItem({ unidad: 2 })));
  });

  it('campos que no existen en el esquema son rechazados', async () => {
    await assertFails(setDoc(itemRef(dbOf('beto')), newItem({ precio: 10 })));
  });
});

describe('items: editar', () => {
  beforeEach(() => seed({ items: { item1: { cantidad: 2, unidad: 'kg' } } }));

  it('cualquier miembro activo cambia nombre, cantidad, unidad y nota por campo', async () => {
    await assertSucceeds(updateDoc(itemRef(dbOf('beto')), { nombre: 'Leche entera' }));
    await assertSucceeds(updateDoc(itemRef(dbOf('cami')), { cantidad: 4 }));
    await assertSucceeds(updateDoc(itemRef(dbOf('beto')), { nota: 'Sin lactosa' }));
    await assertSucceeds(updateDoc(itemRef(dbOf('beto')), { unidad: 'pack' }));
    await assertSucceeds(updateDoc(itemRef(dbOf('beto')), { nota: '' }));
    await assertSucceeds(updateDoc(itemRef(dbOf('beto')), { nota: deleteField(), unidad: deleteField(), cantidad: deleteField() }));
  });

  it('quien no es miembro activo no edita', async () => {
    for (const uid of ['otra', 'salio', 'quitada', null]) {
      await assertFails(updateDoc(itemRef(dbOf(uid)), { nombre: 'Hackeado' }));
    }
  });

  it('listaId, agregadoPor y agregadoEn no cambian', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(itemRef(db), { listaId: 'otra-lista' }));
    await assertFails(updateDoc(itemRef(db), { agregadoPor: 'beto' }));
    await assertFails(updateDoc(itemRef(db), { agregadoEn: serverTimestamp() }));
    await assertFails(updateDoc(itemRef(db), { nombre: 'Otro', listaId: 'otra-lista' }));
    await assertFails(updateDoc(itemRef(db), { agregadoPor: deleteField() }));
  });

  it('valores inválidos son rechazados', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(itemRef(db), { nombre: '' }));
    await assertFails(updateDoc(itemRef(db), { nombre: '  ' }));
    await assertFails(updateDoc(itemRef(db), { nombre: 'a'.repeat(121) }));
    await assertFails(updateDoc(itemRef(db), { cantidad: 0 }));
    await assertFails(updateDoc(itemRef(db), { cantidad: 2.5 }));
    await assertFails(updateDoc(itemRef(db), { cantidad: '3' }));
    await assertFails(updateDoc(itemRef(db), { nota: 'n'.repeat(501) }));
    await assertFails(updateDoc(itemRef(db), { precio: 10 }));
  });

  it('no se puede borrar un campo obligatorio', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(itemRef(db), { nombre: deleteField() }));
    await assertFails(updateDoc(itemRef(db), { comprado: deleteField() }));
    await assertFails(updateDoc(itemRef(db), { borrado: deleteField() }));
    await assertFails(updateDoc(itemRef(db), { listaId: deleteField() }));
  });

  it('dos personas editan campos distintos y se conservan los dos cambios', async () => {
    await assertSucceeds(updateDoc(itemRef(dbOf('ana')), { cantidad: 5 }));
    await assertSucceeds(updateDoc(itemRef(dbOf('beto')), { nota: 'Descremada' }));
    const data = (await getDoc(itemRef(dbOf('cami')))).data();
    if (data.cantidad !== 5 || data.nota !== 'Descremada') throw new Error('se perdió un cambio');
  });
});

describe('items: tildar y destildar', () => {
  beforeEach(() =>
    seed({
      items: {
        pendiente: {},
        hecho: { comprado: true, tildadoPor: 'ana', tildadoEn: ago(3) },
      },
    }),
  );

  const tildar = (extra = {}) => ({
    comprado: true,
    tildadoPor: 'beto',
    tildadoEn: serverTimestamp(),
    ...extra,
  });

  it('tildar con el propio uid y la hora del servidor', async () => {
    await assertSucceeds(updateDoc(itemRef(dbOf('beto'), 'pendiente'), tildar()));
  });

  it('tildar con el uid de otra persona es rechazado', async () => {
    await assertFails(updateDoc(itemRef(dbOf('beto'), 'pendiente'), tildar({ tildadoPor: 'ana' })));
  });

  it('tildar sin tildadoPor, sin tildadoEn o con otra hora es rechazado', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(itemRef(db, 'pendiente'), { comprado: true }));
    await assertFails(updateDoc(itemRef(db, 'pendiente'), { comprado: true, tildadoPor: 'beto' }));
    await assertFails(updateDoc(itemRef(db, 'pendiente'), { comprado: true, tildadoEn: serverTimestamp() }));
    await assertFails(updateDoc(itemRef(db, 'pendiente'), tildar({ tildadoEn: ago(1) })));
  });

  it('no se dejan marcas de tildado en un ítem que sigue pendiente', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(itemRef(db, 'pendiente'), { tildadoPor: 'beto', tildadoEn: serverTimestamp() }));
    await assertFails(updateDoc(itemRef(db, 'pendiente'), { tildadoPor: 'beto' }));
  });

  it('destildar vacía tildadoPor y tildadoEn', async () => {
    await assertSucceeds(
      updateDoc(itemRef(dbOf('cami'), 'hecho'), { comprado: false, tildadoPor: deleteField(), tildadoEn: deleteField() }),
    );
  });

  it('destildar también se acepta dejando las marcas en null', async () => {
    await assertSucceeds(
      updateDoc(itemRef(dbOf('cami'), 'hecho'), { comprado: false, tildadoPor: null, tildadoEn: null }),
    );
  });

  it('destildar sin vaciar las marcas es rechazado', async () => {
    const db = dbOf('cami');
    await assertFails(updateDoc(itemRef(db, 'hecho'), { comprado: false }));
    await assertFails(updateDoc(itemRef(db, 'hecho'), { comprado: false, tildadoPor: deleteField() }));
    await assertFails(updateDoc(itemRef(db, 'hecho'), { comprado: false, tildadoEn: deleteField() }));
  });

  it('retildar un comprado a nombre de otra persona es rechazado; a nombre propio, no', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(itemRef(db, 'hecho'), { tildadoPor: 'cami', tildadoEn: serverTimestamp() }));
    await assertFails(updateDoc(itemRef(db, 'hecho'), { tildadoPor: 'beto' }));
    await assertSucceeds(updateDoc(itemRef(db, 'hecho'), { tildadoPor: 'beto', tildadoEn: serverTimestamp() }));
  });

  it('editar otro campo de un comprado no toca quién lo tildó', async () => {
    await assertSucceeds(updateDoc(itemRef(dbOf('beto'), 'hecho'), { nota: 'ok' }));
  });

  it('quien no es miembro activo no tilda', async () => {
    for (const uid of ['otra', 'salio', 'quitada', null]) {
      await assertFails(updateDoc(itemRef(dbOf(uid), 'pendiente'), tildar({ tildadoPor: uid ?? 'x' })));
    }
  });

  it('comprado tiene que ser booleano', async () => {
    await assertFails(updateDoc(itemRef(dbOf('beto'), 'pendiente'), tildar({ comprado: 'si' })));
  });
});

describe('items: borrar (marcar) y deshacer', () => {
  beforeEach(() =>
    seed({
      items: {
        vivo: {},
        borrado: { borrado: true, borradoPor: 'ana', borradoEn: ago(2) },
      },
    }),
  );

  const borrar = (extra = {}) => ({
    borrado: true,
    borradoPor: 'beto',
    borradoEn: serverTimestamp(),
    ...extra,
  });

  it('borrar con el propio uid y la hora del servidor', async () => {
    await assertSucceeds(updateDoc(itemRef(dbOf('beto'), 'vivo'), borrar()));
  });

  it('borrar con el uid de otra persona, sin marcas o con otra hora es rechazado', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(itemRef(db, 'vivo'), borrar({ borradoPor: 'ana' })));
    await assertFails(updateDoc(itemRef(db, 'vivo'), { borrado: true }));
    await assertFails(updateDoc(itemRef(db, 'vivo'), { borrado: true, borradoPor: 'beto' }));
    await assertFails(updateDoc(itemRef(db, 'vivo'), borrar({ borradoEn: ago(40 * 24) })));
  });

  it('no se puede adelantar borradoEn hacia atrás para saltarse el plazo de 30 días', async () => {
    await assertFails(updateDoc(itemRef(dbOf('beto'), 'vivo'), borrar({ borradoEn: ago(DAYS_31) })));
  });

  it('deshacer vacía borradoPor y borradoEn', async () => {
    await assertSucceeds(
      updateDoc(itemRef(dbOf('cami'), 'borrado'), { borrado: false, borradoPor: deleteField(), borradoEn: deleteField() }),
    );
  });

  it('deshacer sin vaciar las marcas es rechazado', async () => {
    const db = dbOf('cami');
    await assertFails(updateDoc(itemRef(db, 'borrado'), { borrado: false }));
    await assertFails(updateDoc(itemRef(db, 'borrado'), { borrado: false, borradoPor: deleteField() }));
  });

  it('tildar un ítem ya borrado se acepta y sigue borrado (gana el borrado)', async () => {
    await assertSucceeds(
      updateDoc(itemRef(dbOf('beto'), 'borrado'), { comprado: true, tildadoPor: 'beto', tildadoEn: serverTimestamp() }),
    );
    const data = (await getDoc(itemRef(dbOf('beto'), 'borrado'))).data();
    if (data.borrado !== true) throw new Error('el ítem dejó de estar borrado');
  });

  it('quien no es miembro activo no borra ni deshace', async () => {
    for (const uid of ['otra', 'salio', 'quitada', null]) {
      await assertFails(updateDoc(itemRef(dbOf(uid), 'vivo'), borrar({ borradoPor: uid ?? 'x' })));
      await assertFails(
        updateDoc(itemRef(dbOf(uid), 'borrado'), { borrado: false, borradoPor: deleteField(), borradoEn: deleteField() }),
      );
    }
  });
});

describe('items: borrado definitivo', () => {
  beforeEach(() =>
    seed({
      items: {
        vivo: {},
        reciente: { borrado: true, borradoPor: 'ana', borradoEn: ago(DAYS_29) },
        viejo: { borrado: true, borradoPor: 'ana', borradoEn: ago(DAYS_31) },
      },
    }),
  );

  it('un ítem borrado hace más de 30 días se elimina de verdad', async () => {
    await assertSucceeds(deleteDoc(itemRef(dbOf('beto'), 'viejo')));
  });

  it('uno borrado hace menos de 30 días no', async () => {
    await assertFails(deleteDoc(itemRef(dbOf('beto'), 'reciente')));
  });

  it('uno que no está borrado no se elimina', async () => {
    await assertFails(deleteDoc(itemRef(dbOf('beto'), 'vivo')));
  });

  it('quien no es miembro activo no elimina, ni siquiera uno vencido', async () => {
    for (const uid of ['otra', 'salio', 'quitada', null]) {
      await assertFails(deleteDoc(itemRef(dbOf(uid), 'viejo')));
    }
  });
});

// ---------------------------------------------------------------
// Aislamiento
// ---------------------------------------------------------------

describe('listas e ítems: aislamiento entre hogares y con otras colecciones', () => {
  beforeEach(async () => {
    await seed({ lists: { lista1: {} }, items: { item1: {} } });
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(listRef(db, 'ajena', OTHER_H), newList({ creadaPor: 'otra', creadaEn: ago(5) }));
      await setDoc(itemRef(db, 'ajeno', OTHER_H), newItem({ agregadoPor: 'otra', agregadoEn: ago(5) }));
    });
  });

  it('un miembro de un hogar no toca listas ni ítems de otro', async () => {
    const db = dbOf('beto');
    await assertFails(getDoc(listRef(db, 'ajena', OTHER_H)));
    await assertFails(getDoc(itemRef(db, 'ajeno', OTHER_H)));
    await assertFails(updateDoc(listRef(db, 'ajena', OTHER_H), { nombre: 'X' }));
    await assertFails(updateDoc(itemRef(db, 'ajeno', OTHER_H), { nombre: 'X' }));
    await assertFails(getDocs(collection(db, 'hogares', OTHER_H, 'items')));
  });

  it('ser miembro de un hogar no da acceso a las listas del otro por el hogarActualId', async () => {
    // beto tiene hogarActualId = OTHER_H en su perfil, pero no es miembro de él.
    await assertFails(getDoc(listRef(dbOf('beto'), 'ajena', OTHER_H)));
    await assertSucceeds(getDoc(listRef(dbOf('beto'))));
  });

  it('crear listas e ítems no cambia los permisos de las otras colecciones', async () => {
    await assertSucceeds(setDoc(listRef(dbOf('beto'), 'nueva'), newList()));
    await assertSucceeds(setDoc(itemRef(dbOf('beto'), 'nuevo'), newItem()));
    await assertFails(getDoc(doc(dbOf('beto'), 'usuarios', 'cami')));
    await assertSucceeds(getDoc(doc(dbOf('beto'), 'usuarios', 'beto')));
    await assertFails(getDoc(doc(dbOf('otra'), 'hogares', H)));
    await assertFails(setDoc(doc(dbOf('beto'), 'hogares', H, 'presencia', 'beto'), { listaId: 'lista1' }));
    await assertFails(setDoc(doc(dbOf('beto'), 'hogares', H, 'eventos', 'e1'), { tipo: 'x' }));
  });

  it('una colección con otro nombre dentro del hogar sigue bloqueada', async () => {
    await assertFails(setDoc(doc(dbOf('beto'), 'hogares', H, 'cosas', 'x'), { a: 1 }));
    await assertFails(getDoc(doc(dbOf('beto'), 'hogares', H, 'cosas', 'x')));
  });
});
