// Etapa 9: varios grupos, tipo, archivado (solo lectura) y "mis grupos".
// En Firestore los grupos siguen llamándose `hogares`.
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
  collectionGroup,
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
  writeBatch,
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

const H = 'hogar1'; // grupo que se prueba
const OTHER_H = 'hogar2'; // otro grupo (mismo creador ana)
const CODE = 'K7P2-9XQ-4MN';

const HOUR = 60 * 60 * 1000;
const inHours = (hours) => Timestamp.fromMillis(Date.now() + hours * HOUR);
const ago = (hours) => Timestamp.fromMillis(Date.now() - hours * HOUR);

const dbOf = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

const hogarRef = (db, id = H) => doc(db, 'hogares', id);
const memberRef = (db, uid, id = H) => doc(db, 'hogares', id, 'miembros', uid);
const listRef = (db, id = 'lista1') => doc(db, 'hogares', H, 'listas', id);
const itemRef = (db, id = 'item1') => doc(db, 'hogares', H, 'items', id);
const presRef = (db, uid) => doc(db, 'hogares', H, 'presencia', uid);
const invRef = (db, code = CODE) => doc(db, 'invitaciones', code);

const member = (overrides = {}) => ({
  nombre: 'Persona',
  foto: null,
  colorAvatar: 'terracota',
  rol: 'miembro',
  estado: 'activo',
  desde: ago(24),
  hasta: null,
  invitacionId: null,
  invitadoPor: null,
  ...overrides,
});

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

const invitation = (overrides = {}) => ({
  hogarId: H,
  creadaPor: 'ana',
  venceEn: inHours(24),
  estado: 'activa',
  hogarNombre: 'Cumple',
  invitadoPorNombre: 'ana',
  ...overrides,
});

/**
 * Grupo H: ana (creadora, uid completo), beto y cami (miembros). `archivado`
 * se mezcla en el documento del grupo. También: lista, ítem, presencia de beto
 * y una invitación vigente.
 */
async function seed({ hogar = {}, members = {} } = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(hogarRef(db), {
      nombre: 'Cumple',
      tipo: 'evento',
      creadoPor: 'ana',
      creadoEn: ago(48),
      invitacionActivaId: CODE,
      creadorActualId: 'ana',
      ...hogar,
    });
    const base = {
      ana: { rol: 'creador', desde: ago(100), uid: 'ana' },
      beto: { desde: ago(50), uid: 'beto' },
      cami: { desde: ago(10), uid: 'cami' },
      ...members,
    };
    for (const [uid, overrides] of Object.entries(base)) {
      await setDoc(memberRef(db, uid), member({ nombre: uid, ...overrides }));
    }
    await setDoc(listRef(db), { nombre: 'Súper', color: 'green', creadaPor: 'ana', creadaEn: ago(5), eliminada: false });
    await setDoc(itemRef(db), {
      listaId: 'lista1', nombre: 'Leche', comprado: false, agregadoPor: 'ana', agregadoEn: ago(4), borrado: false,
    });
    await setDoc(presRef(db, 'beto'), { listaId: 'lista1', ultimoLatido: ago(0.01) });
    await setDoc(invRef(db), invitation());
  });
}

const archivedFields = (overrides = {}) => ({
  archivado: true,
  archivadoPor: 'ana',
  archivadoEn: ago(2),
  ...overrides,
});

const seedArchived = (opts = {}) => seed({ ...opts, hogar: { ...archivedFields(), ...opts.hogar } });

// ---------------------------------------------------------------------------

describe('grupos: crear con tipo', () => {
  const newHogar = (overrides = {}) => ({
    nombre: 'Cumple de los chicos',
    tipo: 'evento',
    creadoPor: 'ana',
    creadoEn: serverTimestamp(),
    invitacionActivaId: '',
    creadorActualId: 'ana',
    ...overrides,
  });
  const create = (hogar = {}, id = 'nuevo', uid = 'ana') => {
    const db = dbOf(uid);
    const batch = writeBatch(db);
    batch.set(hogarRef(db, id), newHogar(hogar));
    batch.set(memberRef(db, uid, id), member({ nombre: 'Ana', rol: 'creador', desde: serverTimestamp(), uid }));
    return batch.commit();
  };

  for (const tipo of ['familia', 'amigos', 'evento']) {
    it(`admite el tipo ${tipo}`, async () => {
      await assertSucceeds(create({ tipo }));
    });
  }

  it('el tipo es opcional (ausente = familia)', async () => {
    const hogar = newHogar();
    delete hogar.tipo;
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.set(hogarRef(db, 'nuevo'), hogar);
    batch.set(memberRef(db, 'ana', 'nuevo'), member({ rol: 'creador', desde: serverTimestamp() }));
    await assertSucceeds(batch.commit());
  });

  it('rechaza un tipo que no es uno de los tres', async () => {
    await assertFails(create({ tipo: 'empresa' }));
    await assertFails(create({ tipo: '' }));
    await assertFails(create({ tipo: null }));
    await assertFails(create({ tipo: 3 }));
    await assertFails(create({ tipo: 'Familia' }));
  });

  it('un grupo nuevo no puede nacer archivado ni con campos de archivado', async () => {
    await assertFails(create({ archivado: true }));
    await assertFails(create({ archivado: false }));
    await assertFails(create({ archivadoPor: 'ana' }));
    await assertFails(create({ archivadoEn: serverTimestamp() }));
  });

  it('quien ya está en un grupo puede crear otro sin tocar el primero', async () => {
    await seed();
    await assertSucceeds(create({}, 'otro', 'ana'));
    await assertSucceeds(getDoc(hogarRef(dbOf('ana'), H)));
    await assertSucceeds(getDoc(hogarRef(dbOf('ana'), 'otro')));
  });

  it('el miembro creador puede llevar uid y ultimoUso propios', async () => {
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.set(hogarRef(db, 'nuevo'), newHogar());
    batch.set(
      memberRef(db, 'ana', 'nuevo'),
      member({ rol: 'creador', desde: serverTimestamp(), uid: 'ana', ultimoUso: serverTimestamp() }),
    );
    await assertSucceeds(batch.commit());
  });

  it('el uid del miembro tiene que ser el propio, y ultimoUso la hora del servidor', async () => {
    for (const extra of [{ uid: 'beto' }, { uid: '' }, { ultimoUso: ago(1) }]) {
      const db = dbOf('ana');
      const batch = writeBatch(db);
      batch.set(hogarRef(db, 'nuevo'), newHogar());
      batch.set(memberRef(db, 'ana', 'nuevo'), member({ rol: 'creador', desde: serverTimestamp(), ...extra }));
      await assertFails(batch.commit());
    }
  });
});

describe('grupos: el tipo no cambia', () => {
  beforeEach(() => seed());

  it('nadie cambia ni borra el tipo después de crear el grupo', async () => {
    for (const uid of ['ana', 'beto']) {
      await assertFails(updateDoc(hogarRef(dbOf(uid)), { tipo: 'familia' }));
    }
    await assertFails(updateDoc(hogarRef(dbOf('ana')), { tipo: deleteField() }));
  });

  it('un grupo sin tipo no puede recibir uno', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(hogarRef(ctx.firestore()), { tipo: deleteField() }));
    await assertFails(updateDoc(hogarRef(dbOf('ana')), { tipo: 'evento' }));
  });

  it('renombrar sigue andando y no toca el tipo', async () => {
    await assertSucceeds(updateDoc(hogarRef(dbOf('beto')), { nombre: 'Cumple 2' }));
  });
});

describe('grupos: archivar', () => {
  beforeEach(() => seed());

  const archive = (uid = 'ana', overrides = {}) =>
    updateDoc(hogarRef(dbOf(uid)), {
      archivado: true,
      archivadoPor: uid,
      archivadoEn: serverTimestamp(),
      ...overrides,
    });

  it('quien crea el grupo lo archiva en una sola escritura', async () => {
    await assertSucceeds(archive('ana'));
    let data;
    await env.withSecurityRulesDisabled(async (ctx) => {
      data = (await getDoc(hogarRef(ctx.firestore()))).data();
    });
    if (data.archivado !== true || data.archivadoPor !== 'ana') throw new Error('no quedó archivado');
  });

  it('un miembro común no archiva', async () => {
    await assertFails(archive('beto'));
    await assertFails(archive('cami'));
  });

  it('nadie archiva poniendo a otra persona como autora', async () => {
    await assertFails(archive('ana', { archivadoPor: 'beto' }));
    await assertFails(archive('beto', { archivadoPor: 'ana' }));
  });

  it('archivadoEn tiene que ser la hora del servidor', async () => {
    await assertFails(archive('ana', { archivadoEn: ago(5) }));
    await assertFails(archive('ana', { archivadoEn: null }));
  });

  it('hay que escribir los tres campos juntos', async () => {
    await assertFails(updateDoc(hogarRef(dbOf('ana')), { archivado: true }));
    await assertFails(updateDoc(hogarRef(dbOf('ana')), { archivado: true, archivadoPor: 'ana' }));
    await assertFails(updateDoc(hogarRef(dbOf('ana')), { archivadoPor: 'ana', archivadoEn: serverTimestamp() }));
  });

  it('archivar no se mezcla con otros cambios', async () => {
    await assertFails(archive('ana', { nombre: 'Otro nombre' }));
    await assertFails(archive('ana', { creadorActualId: 'beto' }));
    await assertFails(archive('ana', { invitacionActivaId: '' }));
  });

  it('archivado tiene que ser un booleano true al archivar', async () => {
    await assertFails(archive('ana', { archivado: 'si' }));
    await assertFails(archive('ana', { archivado: false }));
  });

  it('quien salió, fue quitado o es ajeno no archiva', async () => {
    await seed({
      members: {
        salio: { estado: 'salio', hasta: ago(1), uid: 'salio' },
        quitada: { estado: 'quitado', hasta: ago(1), uid: 'quitada' },
      },
    });
    for (const uid of ['salio', 'quitada', 'intrusa']) {
      await assertFails(archive(uid));
    }
    await assertFails(archive(null));
  });

  it('un creador que ya no es el creador actual no archiva (aunque conserve el rol viejo)', async () => {
    await seed({ hogar: { creadorActualId: 'beto' }, members: { beto: { rol: 'creador' } } });
    await assertFails(archive('ana'));
    await assertSucceeds(archive('beto'));
  });

  it('un grupo sin el campo archivado se comporta como no archivado', async () => {
    const db = dbOf('beto');
    await assertSucceeds(setDoc(listRef(db, 'nueva'), newList()));
    await assertSucceeds(setDoc(itemRef(db, 'nuevo'), newItem()));
  });

  it('un grupo con archivado en false se comporta como no archivado', async () => {
    await seed({ hogar: { archivado: false } });
    const db = dbOf('beto');
    await assertSucceeds(setDoc(listRef(db, 'nueva'), newList()));
    await assertSucceeds(updateDoc(hogarRef(db), { nombre: 'Cumple 3' }));
  });
});

describe('grupos: desarchivar', () => {
  beforeEach(() => seedArchived());

  const unarchive = (uid = 'ana', data = { archivado: false, archivadoPor: deleteField(), archivadoEn: deleteField() }) =>
    updateDoc(hogarRef(dbOf(uid)), data);

  it('quien crea el grupo lo desarchiva (vaciando archivadoPor y archivadoEn)', async () => {
    await assertSucceeds(unarchive('ana'));
    await assertSucceeds(setDoc(listRef(dbOf('beto'), 'nueva'), newList()));
  });

  it('también vale dejarlos en null o vacíos', async () => {
    await assertSucceeds(unarchive('ana', { archivado: false, archivadoPor: null, archivadoEn: null }));
  });

  it('no se desarchiva dejando archivadoPor o archivadoEn con valor', async () => {
    await assertFails(unarchive('ana', { archivado: false }));
    await assertFails(unarchive('ana', { archivado: false, archivadoPor: 'ana', archivadoEn: deleteField() }));
    await assertFails(unarchive('ana', { archivado: false, archivadoPor: deleteField(), archivadoEn: ago(1) }));
  });

  it('un miembro común no desarchiva', async () => {
    await assertFails(unarchive('beto'));
    await assertFails(unarchive('cami'));
  });

  it('quien salió o es ajeno no desarchiva', async () => {
    await seedArchived({ members: { salio: { estado: 'salio', hasta: ago(1), uid: 'salio' } } });
    await assertFails(unarchive('salio'));
    await assertFails(unarchive('intrusa'));
    await assertFails(unarchive(null));
  });

  it('desarchivar no se mezcla con otros cambios', async () => {
    await assertFails(unarchive('ana', { archivado: false, archivadoPor: deleteField(), archivadoEn: deleteField(), nombre: 'Otro' }));
  });

  it('el creador nuevo (después de un traspaso) también desarchiva', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await updateDoc(hogarRef(db), { creadorActualId: 'beto' });
      await updateDoc(memberRef(db, 'beto'), { rol: 'creador' });
      await updateDoc(memberRef(db, 'ana'), { rol: 'miembro', estado: 'salio', hasta: ago(1) });
    });
    await assertFails(unarchive('ana'));
    await assertSucceeds(unarchive('beto'));
  });
});

describe('grupos archivados: solo lectura', () => {
  beforeEach(() => seedArchived());

  it('se puede leer todo', async () => {
    const db = dbOf('beto');
    await assertSucceeds(getDoc(hogarRef(db)));
    await assertSucceeds(getDocs(collection(db, 'hogares', H, 'miembros')));
    await assertSucceeds(getDocs(collection(db, 'hogares', H, 'listas')));
    await assertSucceeds(getDocs(query(collection(db, 'hogares', H, 'items'), where('borrado', '==', false))));
    await assertSucceeds(getDoc(presRef(db, 'beto')));
  });

  it('quien no es miembro sigue sin leer', async () => {
    await assertFails(getDoc(hogarRef(dbOf('intrusa'))));
  });

  it('se rechaza crear, editar y eliminar listas (también el creador)', async () => {
    for (const uid of ['beto', 'ana']) {
      const db = dbOf(uid);
      await assertFails(setDoc(listRef(db, 'nueva'), newList({ creadaPor: uid })));
      await assertFails(updateDoc(listRef(db), { nombre: 'Renombrada' }));
      await assertFails(updateDoc(listRef(db), { color: 'blue' }));
      await assertFails(
        updateDoc(listRef(db), { eliminada: true, eliminadaPor: uid, eliminadaEn: serverTimestamp() }),
      );
    }
  });

  it('se rechaza purgar listas vencidas', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(listRef(ctx.firestore()), { eliminada: true, eliminadaPor: 'ana', eliminadaEn: ago(24 * 40) }),
    );
    await assertFails(deleteDoc(listRef(dbOf('beto'))));
  });

  it('se rechaza crear, editar, tildar, borrar y purgar ítems', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(itemRef(db, 'nuevo'), newItem()));
    await assertFails(updateDoc(itemRef(db), { nombre: 'Leche entera' }));
    await assertFails(updateDoc(itemRef(db), { cantidad: 2 }));
    await assertFails(
      updateDoc(itemRef(db), { comprado: true, tildadoPor: 'beto', tildadoEn: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(itemRef(db), { borrado: true, borradoPor: 'beto', borradoEn: serverTimestamp() }),
    );
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(itemRef(ctx.firestore()), { borrado: true, borradoPor: 'ana', borradoEn: ago(24 * 40) }),
    );
    await assertFails(deleteDoc(itemRef(db)));
  });

  it('se rechazan invitaciones nuevas y revocar la vigente', async () => {
    const db = dbOf('ana');
    await assertFails(setDoc(invRef(db, 'ABCD-EFG-HJK'), invitation({ venceEn: inHours(24) })));
    await assertFails(updateDoc(invRef(db), { estado: 'revocada' }));
    await assertFails(updateDoc(hogarRef(db), { invitacionActivaId: '' }));
  });

  it('se rechaza renombrar el grupo', async () => {
    await assertFails(updateDoc(hogarRef(dbOf('beto')), { nombre: 'Otro' }));
    await assertFails(updateDoc(hogarRef(dbOf('ana')), { nombre: 'Otro' }));
  });

  it('se rechaza la presencia', async () => {
    await assertFails(setDoc(presRef(dbOf('beto'), 'beto'), { listaId: 'lista1', ultimoLatido: serverTimestamp() }));
    await assertFails(setDoc(presRef(dbOf('beto'), 'beto'), { listaId: '', ultimoLatido: serverTimestamp() }));
    await assertFails(setDoc(presRef(dbOf('ana'), 'ana'), { listaId: '', ultimoLatido: serverTimestamp() }));
  });

  it('se rechaza quitar a alguien (el creador desarchiva primero)', async () => {
    await assertFails(
      updateDoc(memberRef(dbOf('ana'), 'beto'), { estado: 'quitado', hasta: serverTimestamp() }),
    );
  });

  it('se rechaza cambiar nombre, foto y ultimoUso propios', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(memberRef(db, 'beto'), { nombre: 'Beto B' }));
    await assertFails(updateDoc(memberRef(db, 'beto'), { foto: 'https://x/y.png' }));
    await assertFails(updateDoc(memberRef(db, 'beto'), { ultimoUso: serverTimestamp() }));
  });

  it('se puede completar el uid propio (la consulta "mis grupos" lo necesita)', async () => {
    await seedArchived({ members: { beto: { desde: ago(50) } } }); // beto sin uid
    await assertSucceeds(updateDoc(memberRef(dbOf('beto'), 'beto'), { uid: 'beto' }));
    await assertFails(updateDoc(memberRef(dbOf('cami'), 'cami'), { uid: 'ana' }));
  });

  it('se puede salir (miembro y creador)', async () => {
    await assertSucceeds(
      updateDoc(memberRef(dbOf('beto'), 'beto'), { estado: 'salio', hasta: serverTimestamp() }),
    );
    // La última persona (creadora) sale sin cambiar de rol: el grupo queda sin miembros activos.
    await seedArchived({ members: { beto: { estado: 'salio', hasta: ago(1), uid: 'beto' }, cami: { estado: 'salio', hasta: ago(1), uid: 'cami' } } });
    await assertSucceeds(
      updateDoc(memberRef(dbOf('ana'), 'ana'), { estado: 'salio', hasta: serverTimestamp() }),
    );
  });

  it('el creador puede salir traspasando el rol, aun con el grupo archivado', async () => {
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.update(memberRef(db, 'ana'), { estado: 'salio', hasta: serverTimestamp(), rol: 'miembro' });
    batch.update(memberRef(db, 'beto'), { rol: 'creador' });
    batch.update(hogarRef(db), { creadorActualId: 'beto' });
    await assertSucceeds(batch.commit());
    // El nuevo creador puede desarchivarlo.
    await assertSucceeds(
      updateDoc(hogarRef(dbOf('beto')), { archivado: false, archivadoPor: deleteField(), archivadoEn: deleteField() }),
    );
  });

  it('el traspaso no sirve para colar otros cambios en el grupo archivado', async () => {
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.update(memberRef(db, 'ana'), { estado: 'salio', hasta: serverTimestamp(), rol: 'miembro' });
    batch.update(memberRef(db, 'beto'), { rol: 'creador' });
    batch.update(hogarRef(db), { creadorActualId: 'beto', nombre: 'Colado' });
    await assertFails(batch.commit());
  });
});

describe('grupos archivados: nadie se une', () => {
  const joinData = (overrides = {}) => ({
    nombre: 'Nueva',
    foto: null,
    colorAvatar: 'oliva',
    rol: 'miembro',
    estado: 'activo',
    desde: serverTimestamp(),
    hasta: null,
    invitacionId: CODE,
    invitadoPor: 'ana',
    ...overrides,
  });

  it('con el grupo activo, una invitación vigente sirve (control)', async () => {
    await seed();
    await assertSucceeds(setDoc(memberRef(dbOf('nueva'), 'nueva'), joinData({ uid: 'nueva' })));
  });

  it('con el grupo archivado no, ni con una invitación vigente', async () => {
    await seedArchived();
    await assertFails(setDoc(memberRef(dbOf('nueva'), 'nueva'), joinData()));
    await assertFails(setDoc(memberRef(dbOf('nueva'), 'nueva'), joinData({ uid: 'nueva' })));
  });

  it('quien salió o fue quitado tampoco reingresa a un grupo archivado', async () => {
    await seedArchived({
      members: {
        salio: { estado: 'salio', hasta: ago(1), uid: 'salio' },
        quitada: { estado: 'quitado', hasta: ago(1), uid: 'quitada' },
      },
    });
    for (const uid of ['salio', 'quitada']) {
      await assertFails(setDoc(memberRef(dbOf(uid), uid), joinData()));
      await assertFails(updateDoc(memberRef(dbOf(uid), uid), joinData()));
    }
  });

  it('al desarchivar la invitación vigente vuelve a servir', async () => {
    await seedArchived();
    await updateDoc(hogarRef(dbOf('ana')), { archivado: false, archivadoPor: deleteField(), archivadoEn: deleteField() });
    await assertSucceeds(setDoc(memberRef(dbOf('nueva'), 'nueva'), joinData()));
  });

  it('unirse a otro grupo no toca los grupos que ya se tienen', async () => {
    await seed();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(hogarRef(db, OTHER_H), {
        nombre: 'Familia', creadoPor: 'ana', creadoEn: ago(500), invitacionActivaId: '', creadorActualId: 'ana',
      });
      await setDoc(memberRef(db, 'ana', OTHER_H), member({ rol: 'creador', uid: 'ana' }));
      await setDoc(memberRef(db, 'nueva', OTHER_H), member({ uid: 'nueva' }));
    });
    await assertSucceeds(setDoc(memberRef(dbOf('nueva'), 'nueva'), joinData({ uid: 'nueva' })));
    await assertSucceeds(getDoc(memberRef(dbOf('nueva'), 'nueva', OTHER_H)));
    await assertSucceeds(getDoc(hogarRef(dbOf('nueva'), OTHER_H)));
  });
});

describe('grupos: miembros con uid y ultimoUso', () => {
  beforeEach(() => seed({ members: { beto: { desde: ago(50) } } })); // beto sin uid todavía

  it('un miembro viejo completa su uid', async () => {
    await assertSucceeds(updateDoc(memberRef(dbOf('beto'), 'beto'), { uid: 'beto' }));
  });

  it('no se completa el uid de otra persona ni uno ajeno', async () => {
    await assertFails(updateDoc(memberRef(dbOf('beto'), 'beto'), { uid: 'ana' }));
    await assertFails(updateDoc(memberRef(dbOf('ana'), 'beto'), { uid: 'beto' }));
    await assertFails(updateDoc(memberRef(dbOf('intrusa'), 'beto'), { uid: 'beto' }));
  });

  it('ultimoUso se marca con la hora del servidor, solo en el documento propio', async () => {
    await assertSucceeds(updateDoc(memberRef(dbOf('cami'), 'cami'), { ultimoUso: serverTimestamp() }));
    await assertFails(updateDoc(memberRef(dbOf('cami'), 'cami'), { ultimoUso: ago(3) }));
    await assertFails(updateDoc(memberRef(dbOf('ana'), 'cami'), { ultimoUso: serverTimestamp() }));
  });

  it('uid y ultimoUso se pueden actualizar juntos con nombre y foto', async () => {
    await assertSucceeds(
      updateDoc(memberRef(dbOf('cami'), 'cami'), {
        nombre: 'Cami C', foto: null, uid: 'cami', ultimoUso: serverTimestamp(),
      }),
    );
  });

  it('el uid no se puede cambiar una vez puesto', async () => {
    await assertFails(updateDoc(memberRef(dbOf('cami'), 'cami'), { uid: 'otra' }));
  });

  it('quien salió no marca ultimoUso', async () => {
    await seed({ members: { salio: { estado: 'salio', hasta: ago(1), uid: 'salio' } } });
    await assertFails(updateDoc(memberRef(dbOf('salio'), 'salio'), { ultimoUso: serverTimestamp() }));
  });

  it('nadie puede cambiar su rol ni su estado por esta vía', async () => {
    await assertFails(updateDoc(memberRef(dbOf('cami'), 'cami'), { rol: 'creador', ultimoUso: serverTimestamp() }));
    await assertFails(updateDoc(memberRef(dbOf('cami'), 'cami'), { desde: serverTimestamp() }));
  });
});

describe('grupos: cambiar de grupo (usuarios/{uid}.hogarActualId)', () => {
  const user = (hogarActualId) => ({
    nombre: 'Beto', email: 'beto@example.com', creadoEn: Timestamp.now(), hogarActualId,
  });

  beforeEach(async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'usuarios', 'beto'), user(H)));
  });

  it('cada persona cambia su propio último grupo usado', async () => {
    await assertSucceeds(updateDoc(doc(dbOf('beto'), 'usuarios', 'beto'), { hogarActualId: OTHER_H }));
    await assertSucceeds(updateDoc(doc(dbOf('beto'), 'usuarios', 'beto'), { hogarActualId: '' }));
  });

  it('nadie cambia el de otra persona', async () => {
    await assertFails(updateDoc(doc(dbOf('ana'), 'usuarios', 'beto'), { hogarActualId: OTHER_H }));
  });

  it('apuntar a un grupo no da acceso a él', async () => {
    await seed();
    await updateDoc(doc(dbOf('beto'), 'usuarios', 'beto'), { hogarActualId: H });
    await assertFails(getDoc(hogarRef(dbOf('intrusa'))));
  });
});

describe('grupos: "mis grupos" (consulta de grupo de colecciones)', () => {
  const mine = (db, uid, estado) => {
    const filters = [where('uid', '==', uid)];
    if (estado) filters.push(where('estado', '==', estado));
    return query(collectionGroup(db, 'miembros'), ...filters);
  };

  beforeEach(async () => {
    await seed();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(hogarRef(db, OTHER_H), {
        nombre: 'Familia', creadoPor: 'cami', creadoEn: ago(500), invitacionActivaId: '', creadorActualId: 'cami',
      });
      await setDoc(memberRef(db, 'cami', OTHER_H), member({ rol: 'creador', uid: 'cami' }));
      await setDoc(memberRef(db, 'beto', OTHER_H), member({ uid: 'beto', estado: 'salio', hasta: ago(1) }));
      await setDoc(memberRef(db, 'ana', OTHER_H), member({ uid: 'ana' }));
    });
  });

  it('cada persona encuentra sus propios grupos activos', async () => {
    const snap = await assertSucceeds(getDocs(mine(dbOf('cami'), 'cami', 'activo')));
    const ids = snap.docs.map((d) => d.ref.parent.parent.id).sort();
    if (ids.join() !== [H, OTHER_H].sort().join()) throw new Error(`ids inesperados: ${ids}`);
  });

  it('también sin filtrar por estado (para ver los que dejó)', async () => {
    const snap = await assertSucceeds(getDocs(mine(dbOf('beto'), 'beto')));
    if (snap.size !== 2) throw new Error(`esperaba 2, vinieron ${snap.size}`);
  });

  it('con el filtro de estado, quien salió de un grupo solo ve el otro', async () => {
    const snap = await assertSucceeds(getDocs(mine(dbOf('beto'), 'beto', 'activo')));
    if (snap.size !== 1 || snap.docs[0].ref.parent.parent.id !== H) throw new Error('debía ver solo hogar1');
  });

  it('una persona no consulta los grupos de otra', async () => {
    await assertFails(getDocs(mine(dbOf('beto'), 'cami', 'activo')));
    await assertFails(getDocs(mine(dbOf('intrusa'), 'ana', 'activo')));
  });

  it('la consulta sin filtro por uid se rechaza (no se pueden listar todos los miembros)', async () => {
    await assertFails(getDocs(collectionGroup(dbOf('ana'), 'miembros')));
    await assertFails(getDocs(query(collectionGroup(dbOf('ana'), 'miembros'), where('estado', '==', 'activo'))));
  });

  it('sin sesión no se consulta', async () => {
    await assertFails(getDocs(mine(dbOf(null), 'ana', 'activo')));
  });

  it('con un uid sin grupos devuelve vacío, no error', async () => {
    const snap = await assertSucceeds(getDocs(mine(dbOf('nadie'), 'nadie', 'activo')));
    if (snap.size !== 0) throw new Error('debía estar vacío');
  });

  it('un miembro sin uid cargado no aparece (por eso la app lo completa al abrir)', async () => {
    await seed({ members: { beto: { desde: ago(50) } } });
    const snap = await assertSucceeds(getDocs(mine(dbOf('beto'), 'beto', 'activo')));
    // Solo el hogar2 (donde beto salió) tiene uid, pero está en `salio`: ninguno activo.
    if (snap.size !== 0) throw new Error(`esperaba 0, vinieron ${snap.size}`);
  });

  it('los grupos archivados también aparecen (la app los muestra aparte)', async () => {
    await seedArchived();
    const snap = await assertSucceeds(getDocs(mine(dbOf('ana'), 'ana', 'activo')));
    if (snap.size !== 2) throw new Error(`esperaba 2, vinieron ${snap.size}`);
  });

  it('la consulta no abre otras colecciones: el resto sigue cerrado para quien no es miembro', async () => {
    await assertFails(getDocs(collection(dbOf('intrusa'), 'hogares', H, 'listas')));
    await assertFails(getDoc(memberRef(dbOf('intrusa'), 'ana')));
  });
});
