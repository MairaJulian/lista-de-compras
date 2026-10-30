import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
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

const H = 'hogar1';
const CODE = 'K7P2-9XQ-4MN';
const OTHER_CODE = 'ABCD-EFG-HJK';

const HOUR = 60 * 60 * 1000;
const inHours = (hours) => Timestamp.fromMillis(Date.now() + hours * HOUR);
const ago = (hours) => Timestamp.fromMillis(Date.now() - hours * HOUR);

const dbOf = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

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

/** Estado inicial escrito sin reglas. `members`: { uid: overrides }. */
async function seed({ members = {}, creator = 'ana', hogar = {}, invitations = {}, users = {} } = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'hogares', H), {
      nombre: 'Nuestra casa',
      creadoPor: 'ana',
      creadoEn: ago(48),
      invitacionActivaId: '',
      creadorActualId: creator,
      ...hogar,
    });
    for (const [uid, overrides] of Object.entries(members)) {
      await setDoc(doc(db, 'hogares', H, 'miembros', uid), member({ nombre: uid, ...overrides }));
    }
    for (const [code, overrides] of Object.entries(invitations)) {
      await setDoc(doc(db, 'invitaciones', code), invitation(overrides));
    }
    for (const [uid, overrides] of Object.entries(users)) {
      await setDoc(doc(db, 'usuarios', uid), {
        nombre: uid,
        email: `${uid}@example.com`,
        creadoEn: Timestamp.now(),
        hogarActualId: H,
        ...overrides,
      });
    }
  });
}

const invitation = (overrides = {}) => ({
  hogarId: H,
  creadaPor: 'ana',
  venceEn: inHours(24),
  estado: 'activa',
  hogarNombre: 'Nuestra casa',
  invitadoPorNombre: 'ana',
  ...overrides,
});

// Familia base: ana (creadora), beto y cami (miembros) y una invitación activa.
const family = () =>
  seed({
    members: {
      ana: { rol: 'creador', desde: ago(100) },
      beto: { desde: ago(50) },
      cami: { desde: ago(10) },
    },
    hogar: { invitacionActivaId: CODE },
    invitations: { [CODE]: {} },
  });

const joinData = (overrides = {}) => ({
  nombre: 'Nuevo',
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

const memberRef = (db, uid) => doc(db, 'hogares', H, 'miembros', uid);
const hogarRef = (db) => doc(db, 'hogares', H);
const invRef = (db, code = CODE) => doc(db, 'invitaciones', code);

describe('hogares: leer', () => {
  beforeEach(family);

  it('un miembro activo lee el hogar y a los demás miembros', async () => {
    const db = dbOf('beto');
    await assertSucceeds(getDoc(hogarRef(db)));
    await assertSucceeds(getDoc(memberRef(db, 'ana')));
    await assertSucceeds(getDocs(collection(db, 'hogares', H, 'miembros')));
  });

  it('una persona ajena no lee el hogar ni sus miembros', async () => {
    const db = dbOf('intrusa');
    await assertFails(getDoc(hogarRef(db)));
    await assertFails(getDoc(memberRef(db, 'ana')));
    await assertFails(getDocs(collection(db, 'hogares', H, 'miembros')));
  });

  it('nadie sin sesión lee nada', async () => {
    const db = dbOf(null);
    await assertFails(getDoc(hogarRef(db)));
    await assertFails(getDoc(memberRef(db, 'ana')));
    await assertFails(getDoc(invRef(db)));
  });

  it('no se puede listar la colección de hogares', async () => {
    await assertFails(getDocs(collection(dbOf('ana'), 'hogares')));
  });

  it('quien salió o fue quitado ya no lee el hogar ni a los demás, pero sí su propio miembro', async () => {
    await seed({
      members: {
        ana: { rol: 'creador' },
        saliente: { estado: 'salio', hasta: ago(1) },
        quitada: { estado: 'quitado', hasta: ago(1) },
      },
    });
    for (const uid of ['saliente', 'quitada']) {
      const db = dbOf(uid);
      await assertFails(getDoc(hogarRef(db)));
      await assertFails(getDoc(memberRef(db, 'ana')));
      await assertSucceeds(getDoc(memberRef(db, uid)));
    }
  });

  it('el hogar no se autoriza por usuarios/{uid}.hogarActualId', async () => {
    await seed({
      members: { ana: { rol: 'creador' } },
      users: { intrusa: { hogarActualId: H } },
    });
    await assertFails(getDoc(hogarRef(dbOf('intrusa'))));
  });

  it('nadie lee el documento de usuario de otra persona', async () => {
    await seed({ members: { ana: { rol: 'creador' }, beto: {} }, users: { ana: {}, beto: {} } });
    await assertFails(getDoc(doc(dbOf('beto'), 'usuarios', 'ana')));
  });
});

describe('hogares: crear', () => {
  const newHogar = (overrides = {}) => ({
    nombre: 'Nuestra casa',
    creadoPor: 'ana',
    creadoEn: serverTimestamp(),
    invitacionActivaId: '',
    creadorActualId: 'ana',
    ...overrides,
  });
  const newCreator = (overrides = {}) =>
    member({ nombre: 'Ana', rol: 'creador', desde: serverTimestamp(), ...overrides });

  const create = (uid = 'ana', { hogar = {}, miembro = {}, id = H } = {}) => {
    const db = dbOf(uid);
    const batch = writeBatch(db);
    batch.set(doc(db, 'hogares', id), newHogar(hogar));
    batch.set(doc(db, 'hogares', id, 'miembros', uid), newCreator(miembro));
    return batch.commit();
  };

  it('crea hogar y miembro creador en un mismo lote', async () => {
    await assertSucceeds(create());
    await assertSucceeds(getDoc(hogarRef(dbOf('ana'))));
  });

  it('el hogar sin el miembro creador se rechaza', async () => {
    const db = dbOf('ana');
    await assertFails(setDoc(hogarRef(db), newHogar()));
  });

  it('el miembro creador sin hogar se rechaza', async () => {
    const db = dbOf('ana');
    await assertFails(setDoc(memberRef(db, 'ana'), newCreator()));
  });

  it('sin sesión no se crea', async () => {
    const db = dbOf(null);
    const batch = writeBatch(db);
    batch.set(hogarRef(db), newHogar());
    batch.set(memberRef(db, 'ana'), newCreator());
    await assertFails(batch.commit());
  });

  it('creadoPor tiene que ser quien crea', async () => {
    await assertFails(create('ana', { hogar: { creadoPor: 'beto' } }));
  });

  it('creadorActualId tiene que ser quien crea', async () => {
    await assertFails(create('ana', { hogar: { creadorActualId: 'beto' } }));
  });

  it('el miembro de quien crea no puede quedar como `miembro` ni inactivo', async () => {
    await assertFails(create('ana', { miembro: { rol: 'miembro' } }));
    await assertFails(create('ana', { miembro: { estado: 'salio' } }));
  });

  it('no se crea con un nombre vacío, en blanco o demasiado largo', async () => {
    await assertFails(create('ana', { hogar: { nombre: '' } }));
    await assertFails(create('ana', { hogar: { nombre: '   ' } }));
    await assertFails(create('ana', { hogar: { nombre: 'x'.repeat(61) } }));
  });

  it('no se crea con campos de más ni con una invitación ya cargada', async () => {
    await assertFails(create('ana', { hogar: { extra: 1 } }));
    await assertFails(create('ana', { hogar: { invitacionActivaId: CODE } }));
  });

  it('no se puede crear el propio miembro creador en un hogar que ya existe', async () => {
    await family();
    const db = dbOf('intrusa');
    await assertFails(setDoc(memberRef(db, 'intrusa'), newCreator()));
  });

  it('no se puede crear el miembro creador de otra persona', async () => {
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.set(hogarRef(db), newHogar());
    batch.set(memberRef(db, 'ana'), newCreator());
    batch.set(memberRef(db, 'beto'), newCreator({ nombre: 'Beto' }));
    await assertFails(batch.commit());
  });

  it('no se puede borrar un hogar', async () => {
    await family();
    await assertFails(deleteDoc(hogarRef(dbOf('ana'))));
  });
});

describe('hogares: editar nombre e invitación activa', () => {
  beforeEach(family);

  it('cualquier miembro activo edita el nombre', async () => {
    await assertSucceeds(updateDoc(hogarRef(dbOf('beto')), { nombre: 'Casa nueva' }));
    await assertSucceeds(updateDoc(hogarRef(dbOf('ana')), { nombre: 'Otra más' }));
  });

  it('nombre vacío, en blanco o que no es texto se rechaza', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(hogarRef(db), { nombre: '' }));
    await assertFails(updateDoc(hogarRef(db), { nombre: '   ' }));
    await assertFails(updateDoc(hogarRef(db), { nombre: 5 }));
  });

  it('una persona ajena, alguien que salió o fue quitado no editan el nombre', async () => {
    await seed({
      members: {
        ana: { rol: 'creador' },
        saliente: { estado: 'salio' },
        quitada: { estado: 'quitado' },
      },
    });
    for (const uid of ['intrusa', 'saliente', 'quitada']) {
      await assertFails(updateDoc(hogarRef(dbOf(uid)), { nombre: 'Hackeado' }));
    }
  });

  it('creadoPor y creadoEn no cambian', async () => {
    const db = dbOf('ana');
    await assertFails(updateDoc(hogarRef(db), { creadoPor: 'beto' }));
    await assertFails(updateDoc(hogarRef(db), { creadoEn: serverTimestamp() }));
  });

  it('no se agregan campos nuevos al hogar', async () => {
    await assertFails(updateDoc(hogarRef(dbOf('ana')), { extra: true }));
  });

  it('creadorActualId no se cambia por las buenas, ni siquiera quien es creador', async () => {
    await assertFails(updateDoc(hogarRef(dbOf('beto')), { creadorActualId: 'beto' }));
    await assertFails(updateDoc(hogarRef(dbOf('ana')), { creadorActualId: 'beto' }));
  });

  it('un miembro desactiva la invitación: la revoca y vacía invitacionActivaId en el mismo lote', async () => {
    const db = dbOf('beto');
    const batch = writeBatch(db);
    batch.update(invRef(db), { estado: 'revocada' });
    batch.update(hogarRef(db), { invitacionActivaId: '' });
    await assertSucceeds(batch.commit());
  });

  it('no se vacía invitacionActivaId dejando la invitación activa', async () => {
    await assertFails(updateDoc(hogarRef(dbOf('beto')), { invitacionActivaId: '' }));
  });

  it('regenerar: crea la invitación nueva, revoca la anterior y actualiza el puntero', async () => {
    const db = dbOf('beto');
    const batch = writeBatch(db);
    batch.update(invRef(db), { estado: 'revocada' });
    batch.set(
      invRef(db, OTHER_CODE),
      invitation({ creadaPor: 'beto', invitadoPorNombre: 'beto', venceEn: inHours(48) }),
    );
    batch.update(hogarRef(db), { invitacionActivaId: OTHER_CODE });
    await assertSucceeds(batch.commit());
  });

  it('regenerar sin revocar la anterior se rechaza', async () => {
    const db = dbOf('beto');
    const batch = writeBatch(db);
    batch.set(
      invRef(db, OTHER_CODE),
      invitation({ creadaPor: 'beto', invitadoPorNombre: 'beto', venceEn: inHours(48) }),
    );
    batch.update(hogarRef(db), { invitacionActivaId: OTHER_CODE });
    await assertFails(batch.commit());
  });

  it('invitacionActivaId no puede apuntar a una invitación de otro hogar ni a una revocada', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(invRef(db, 'AJENA-HOGAR-1'), invitation({ hogarId: 'otro' }));
      await setDoc(invRef(db, 'VIEJA-REVOK-1'), invitation({ estado: 'revocada' }));
      await updateDoc(hogarRef(db), { invitacionActivaId: '' });
      await updateDoc(invRef(db), { estado: 'revocada' });
    });
    const db = dbOf('beto');
    await assertFails(updateDoc(hogarRef(db), { invitacionActivaId: 'AJENA-HOGAR-1' }));
    await assertFails(updateDoc(hogarRef(db), { invitacionActivaId: 'VIEJA-REVOK-1' }));
  });
});

describe('invitaciones', () => {
  beforeEach(family);

  const freshInvitation = (overrides = {}) => ({
    hogarId: H,
    creadaPor: 'beto',
    venceEn: inHours(48),
    estado: 'activa',
    hogarNombre: 'Nuestra casa',
    invitadoPorNombre: 'beto',
    ...overrides,
  });

  it('un miembro activo crea una invitación a 48 horas', async () => {
    await assertSucceeds(setDoc(invRef(dbOf('beto'), OTHER_CODE), freshInvitation()));
  });

  it('un vencimiento menor a 48 horas se acepta; mayor, en el pasado o no fecha, no', async () => {
    const db = dbOf('beto');
    await assertSucceeds(setDoc(invRef(db, OTHER_CODE), freshInvitation({ venceEn: inHours(1) })));
    await assertFails(setDoc(invRef(db, 'OTRO-CODIGO-2'), freshInvitation({ venceEn: inHours(49) })));
    await assertFails(setDoc(invRef(db, 'OTRO-CODIGO-3'), freshInvitation({ venceEn: ago(1) })));
    await assertFails(setDoc(invRef(db, 'OTRO-CODIGO-4'), freshInvitation({ venceEn: '2030-01-01' })));
  });

  it('una persona ajena o que ya no es miembro no crea invitaciones', async () => {
    await seed({
      members: { ana: { rol: 'creador' }, saliente: { estado: 'salio' }, quitada: { estado: 'quitado' } },
    });
    for (const uid of ['intrusa', 'saliente', 'quitada']) {
      await assertFails(
        setDoc(invRef(dbOf(uid), OTHER_CODE), freshInvitation({ creadaPor: uid, invitadoPorNombre: uid })),
      );
    }
  });

  it('sin sesión no se crea', async () => {
    await assertFails(setDoc(invRef(dbOf(null), OTHER_CODE), freshInvitation()));
  });

  it('creadaPor es quien la crea', async () => {
    await assertFails(setDoc(invRef(dbOf('beto'), OTHER_CODE), freshInvitation({ creadaPor: 'ana' })));
  });

  it('estado inicial tiene que ser activa', async () => {
    await assertFails(setDoc(invRef(dbOf('beto'), OTHER_CODE), freshInvitation({ estado: 'revocada' })));
  });

  it('hogarNombre e invitadoPorNombre tienen que ser los reales (sin suplantar)', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(invRef(db, OTHER_CODE), freshInvitation({ hogarNombre: 'Banco' })));
    await assertFails(setDoc(invRef(db, OTHER_CODE), freshInvitation({ invitadoPorNombre: 'Ana' })));
  });

  it('no se crean invitaciones con campos de más ni a medias', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(invRef(db, OTHER_CODE), freshInvitation({ extra: 1 })));
    const { hogarNombre, ...sinNombre } = freshInvitation();
    await assertFails(setDoc(invRef(db, OTHER_CODE), sinNombre));
  });

  it('el código tiene que tener al menos 10 caracteres reales y solo letras, números y guiones', async () => {
    const db = dbOf('beto');
    await assertFails(setDoc(invRef(db, 'ABC123'), freshInvitation()));
    await assertFails(setDoc(invRef(db, 'AB-CD-EF-GH'), freshInvitation()));
    await assertFails(setDoc(invRef(db, 'ABCD_EFGH_JKLM'), freshInvitation()));
    await assertSucceeds(setDoc(invRef(db, 'ABCDEFGHJK'), freshInvitation()));
  });

  it('no se pisa una invitación existente', async () => {
    await assertFails(setDoc(invRef(dbOf('beto'), CODE), freshInvitation()));
  });

  it('cualquier persona con sesión lee una invitación, de a una', async () => {
    await assertSucceeds(getDoc(invRef(dbOf('intrusa'))));
    await assertSucceeds(getDoc(invRef(dbOf('beto'))));
  });

  it('sin sesión no se lee una invitación', async () => {
    await assertFails(getDoc(invRef(dbOf(null))));
  });

  it('no se pueden listar invitaciones, ni siquiera filtrando', async () => {
    for (const uid of ['intrusa', 'ana']) {
      const db = dbOf(uid);
      await assertFails(getDocs(collection(db, 'invitaciones')));
      await assertFails(getDocs(query(collection(db, 'invitaciones'), where('hogarId', '==', H))));
    }
  });

  it('un miembro revoca la invitación', async () => {
    await assertSucceeds(updateDoc(invRef(dbOf('beto')), { estado: 'revocada' }));
  });

  it('una persona ajena o que ya no es miembro no revoca', async () => {
    await seed({
      members: { ana: { rol: 'creador' }, saliente: { estado: 'salio' } },
      invitations: { [CODE]: {} },
    });
    await assertFails(updateDoc(invRef(dbOf('intrusa')), { estado: 'revocada' }));
    await assertFails(updateDoc(invRef(dbOf('saliente')), { estado: 'revocada' }));
  });

  it('solo se puede pasar de activa a revocada: no se reactiva ni se alteran otros campos', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(invRef(db), { venceEn: inHours(40) }));
    await assertFails(updateDoc(invRef(db), { hogarId: 'otro' }));
    await assertFails(updateDoc(invRef(db), { hogarNombre: 'Otro nombre' }));
    await assertFails(updateDoc(invRef(db), { estado: 'revocada', venceEn: inHours(40) }));
    await env.withSecurityRulesDisabled((ctx) => updateDoc(invRef(ctx.firestore()), { estado: 'revocada' }));
    await assertFails(updateDoc(invRef(db), { estado: 'activa' }));
  });

  it('no se borran invitaciones', async () => {
    await assertFails(deleteDoc(invRef(dbOf('ana'))));
  });
});

describe('miembros: unirse', () => {
  beforeEach(family);

  const join = (uid = 'nuevo', overrides = {}) => {
    const db = dbOf(uid);
    return setDoc(memberRef(db, uid), joinData(overrides));
  };

  it('se une con una invitación válida y pasa a leer el hogar', async () => {
    await assertSucceeds(join());
    await assertSucceeds(getDoc(hogarRef(dbOf('nuevo'))));
  });

  it('antes de unirse no lee el hogar', async () => {
    await assertFails(getDoc(hogarRef(dbOf('nuevo'))));
  });

  it('con una invitación vencida se rechaza', async () => {
    await seed({
      members: { ana: { rol: 'creador' } },
      invitations: { [CODE]: { venceEn: ago(1) } },
    });
    await assertFails(join());
  });

  it('con una invitación revocada se rechaza', async () => {
    await seed({
      members: { ana: { rol: 'creador' } },
      invitations: { [CODE]: { estado: 'revocada' } },
    });
    await assertFails(join());
  });

  it('con una invitación de otro hogar se rechaza', async () => {
    await seed({
      members: { ana: { rol: 'creador' } },
      invitations: { [CODE]: { hogarId: 'otro-hogar' } },
    });
    await assertFails(join());
  });

  it('con un código inexistente se rechaza', async () => {
    await assertFails(join('nuevo', { invitacionId: 'NOEXISTE-123' }));
  });

  it('sin código, con un código malformado o con una ruta camuflada se rechaza', async () => {
    await assertFails(join('nuevo', { invitacionId: null }));
    await assertFails(join('nuevo', { invitacionId: '' }));
    await assertFails(join('nuevo', { invitacionId: `${CODE}/x` }));
    await assertFails(join('nuevo', { invitacionId: 12345678901 }));
  });

  it('no se puede unir con rol creador', async () => {
    await assertFails(join('nuevo', { rol: 'creador' }));
  });

  it('no se puede unir ya como `salio` o `quitado`', async () => {
    await assertFails(join('nuevo', { estado: 'salio' }));
    await assertFails(join('nuevo', { estado: 'quitado' }));
  });

  it('invitadoPor tiene que ser quien creó la invitación', async () => {
    await assertFails(join('nuevo', { invitadoPor: 'beto' }));
    await assertFails(join('nuevo', { invitadoPor: null }));
  });

  it('sin sesión no se une', async () => {
    const db = dbOf(null);
    await assertFails(setDoc(memberRef(db, 'nuevo'), joinData()));
  });

  it('nadie crea el documento de miembro de otra persona', async () => {
    const db = dbOf('intrusa');
    await assertFails(setDoc(memberRef(db, 'nuevo'), joinData()));
  });

  it('desde tiene que ser la hora del servidor y hasta estar vacío', async () => {
    await assertFails(join('nuevo', { desde: ago(1000) }));
    await assertFails(join('nuevo', { hasta: serverTimestamp() }));
  });

  it('no se aceptan campos de más', async () => {
    await assertFails(join('nuevo', { admin: true }));
  });

  it('la invitación sirve a más de una persona', async () => {
    await assertSucceeds(join('nuevo'));
    await assertSucceeds(join('otro'));
  });

  it('un miembro activo no puede volver a "unirse" pisando su propio documento', async () => {
    await assertFails(join('beto'));
  });

  it('en un hogar sin creador activo no entra nadie, aunque la invitación esté activa', async () => {
    await seed({
      creator: 'ana',
      members: { ana: { rol: 'creador', estado: 'salio', hasta: ago(1) } },
      invitations: { [CODE]: {} },
    });
    await assertFails(join());
  });
});

describe('miembros: volver a unirse', () => {
  beforeEach(async () => {
    await seed({
      members: {
        ana: { rol: 'creador' },
        quitada: { estado: 'quitado', hasta: ago(2) },
        saliente: { estado: 'salio', hasta: ago(2) },
        beto: {},
      },
      hogar: { invitacionActivaId: CODE },
      invitations: { [CODE]: {} },
    });
  });

  const rejoin = (uid, overrides = {}) =>
    setDoc(memberRef(dbOf(uid), uid), joinData({ nombre: uid, ...overrides }));

  it('quien fue quitado vuelve con una invitación vigente', async () => {
    await assertSucceeds(rejoin('quitada'));
    await assertSucceeds(getDoc(hogarRef(dbOf('quitada'))));
  });

  it('quien salió vuelve con una invitación vigente', async () => {
    await assertSucceeds(rejoin('saliente'));
  });

  it('quien fue quitado no vuelve con una invitación vencida, revocada o inexistente', async () => {
    await assertFails(rejoin('quitada', { invitacionId: 'NOEXISTE-123' }));
    await env.withSecurityRulesDisabled((ctx) => updateDoc(invRef(ctx.firestore()), { estado: 'revocada' }));
    await assertFails(rejoin('quitada'));
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(invRef(ctx.firestore()), { estado: 'activa', venceEn: ago(1) }),
    );
    await assertFails(rejoin('quitada'));
  });

  it('quien fue quitado no se reactiva sin invitación (cambiando solo el estado)', async () => {
    await assertFails(updateDoc(memberRef(dbOf('quitada'), 'quitada'), { estado: 'activo' }));
    await assertFails(updateDoc(memberRef(dbOf('saliente'), 'saliente'), { estado: 'activo', hasta: null }));
  });

  it('no vuelve como creador', async () => {
    await assertFails(rejoin('quitada', { rol: 'creador' }));
  });

  it('nadie reactiva a otra persona', async () => {
    await assertFails(setDoc(memberRef(dbOf('beto'), 'quitada'), joinData({ nombre: 'quitada' })));
    await assertFails(updateDoc(memberRef(dbOf('ana'), 'quitada'), { estado: 'activo', hasta: null }));
  });
});

describe('miembros: quitar', () => {
  beforeEach(family);

  const remove = (actor, target) =>
    updateDoc(memberRef(dbOf(actor), target), { estado: 'quitado', hasta: serverTimestamp() });

  it('el creador quita a un miembro', async () => {
    await assertSucceeds(remove('ana', 'beto'));
    await assertFails(getDoc(hogarRef(dbOf('beto'))));
    await assertSucceeds(getDoc(memberRef(dbOf('beto'), 'beto')));
  });

  it('un miembro común no quita a otro, ni siquiera al creador', async () => {
    await assertFails(remove('beto', 'cami'));
    await assertFails(remove('beto', 'ana'));
  });

  it('el creador no se quita a sí mismo (eso es salir)', async () => {
    await assertFails(remove('ana', 'ana'));
  });

  it('un miembro no se quita a sí mismo como `quitado`', async () => {
    await assertFails(remove('beto', 'beto'));
  });

  it('una persona ajena no quita a nadie', async () => {
    await assertFails(remove('intrusa', 'beto'));
  });

  it('un creador que ya salió no quita a nadie', async () => {
    await seed({
      creator: 'ana',
      members: {
        ana: { rol: 'creador', estado: 'salio', hasta: ago(1) },
        beto: {},
      },
    });
    await assertFails(remove('ana', 'beto'));
  });

  it('el creador de otro hogar no quita en este', async () => {
    await family();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'hogares', 'otro'), {
        nombre: 'Otro',
        creadoPor: 'zoe',
        creadoEn: ago(1),
        invitacionActivaId: '',
        creadorActualId: 'zoe',
      });
      await setDoc(doc(db, 'hogares', 'otro', 'miembros', 'zoe'), member({ nombre: 'Zoe', rol: 'creador' }));
    });
    await assertFails(remove('zoe', 'beto'));
  });

  it('no se quita a alguien que ya salió ni se pisan otros campos', async () => {
    await assertFails(
      updateDoc(memberRef(dbOf('ana'), 'beto'), { estado: 'quitado', hasta: serverTimestamp(), nombre: 'X' }),
    );
    await assertFails(
      updateDoc(memberRef(dbOf('ana'), 'beto'), { estado: 'quitado', hasta: serverTimestamp(), rol: 'creador' }),
    );
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(memberRef(ctx.firestore(), 'cami'), { estado: 'salio', hasta: ago(1) }),
    );
    await assertFails(remove('ana', 'cami'));
  });

  it('quitar exige hasta con la hora del servidor', async () => {
    await assertFails(updateDoc(memberRef(dbOf('ana'), 'beto'), { estado: 'quitado', hasta: ago(5) }));
    await assertFails(updateDoc(memberRef(dbOf('ana'), 'beto'), { estado: 'quitado' }));
  });

  it('nadie borra un documento de miembro', async () => {
    await assertFails(deleteDoc(memberRef(dbOf('ana'), 'beto')));
    await assertFails(deleteDoc(memberRef(dbOf('beto'), 'beto')));
  });
});

describe('miembros: salir y traspaso', () => {
  beforeEach(family);

  const leaveFields = () => ({ estado: 'salio', hasta: serverTimestamp() });

  it('un miembro común sale por su cuenta', async () => {
    await assertSucceeds(updateDoc(memberRef(dbOf('beto'), 'beto'), leaveFields()));
    await assertFails(getDoc(hogarRef(dbOf('beto'))));
    await assertSucceeds(getDoc(memberRef(dbOf('beto'), 'beto')));
  });

  it('nadie hace salir a otra persona', async () => {
    await assertFails(updateDoc(memberRef(dbOf('beto'), 'cami'), leaveFields()));
    await assertFails(updateDoc(memberRef(dbOf('ana'), 'cami'), leaveFields()));
  });

  it('salir exige hasta con la hora del servidor y no deja tocar otros campos', async () => {
    const ref = memberRef(dbOf('beto'), 'beto');
    await assertFails(updateDoc(ref, { estado: 'salio', hasta: ago(30) }));
    await assertFails(updateDoc(ref, { ...leaveFields(), nombre: 'Otro' }));
  });

  it('un miembro común no se hace creador al salir ni de otra forma', async () => {
    await assertFails(updateDoc(memberRef(dbOf('beto'), 'beto'), { ...leaveFields(), rol: 'creador' }));
    await assertFails(updateDoc(memberRef(dbOf('beto'), 'beto'), { rol: 'creador' }));
  });

  it('el creador traspasa el rol a otro miembro y sale, en un solo lote', async () => {
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.update(memberRef(db, 'ana'), { ...leaveFields(), rol: 'miembro' });
    batch.update(memberRef(db, 'beto'), { rol: 'creador' });
    batch.update(hogarRef(db), { creadorActualId: 'beto' });
    await assertSucceeds(batch.commit());

    // Beto ya puede quitar a Cami y el hogar admite nuevos miembros.
    await assertSucceeds(
      updateDoc(memberRef(dbOf('beto'), 'cami'), { estado: 'quitado', hasta: serverTimestamp() }),
    );
    await assertSucceeds(setDoc(memberRef(dbOf('nuevo'), 'nuevo'), joinData({ invitadoPor: 'ana' })));
  });

  it('el creador no se va como `miembro` sin dejar a otro creador', async () => {
    await assertFails(updateDoc(memberRef(dbOf('ana'), 'ana'), { ...leaveFields(), rol: 'miembro' }));
  });

  it('traspaso sin ascender de verdad al elegido se rechaza', async () => {
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.update(memberRef(db, 'ana'), { ...leaveFields(), rol: 'miembro' });
    batch.update(hogarRef(db), { creadorActualId: 'beto' });
    await assertFails(batch.commit());
  });

  it('traspaso a alguien que ya no está activo se rechaza', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(memberRef(ctx.firestore(), 'beto'), { estado: 'salio', hasta: ago(1) }),
    );
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.update(memberRef(db, 'ana'), { ...leaveFields(), rol: 'miembro' });
    batch.update(memberRef(db, 'beto'), { rol: 'creador' });
    batch.update(hogarRef(db), { creadorActualId: 'beto' });
    await assertFails(batch.commit());
  });

  it('el creador no puede ascender a otro sin salir (nunca dos creadores)', async () => {
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.update(memberRef(db, 'beto'), { rol: 'creador' });
    batch.update(hogarRef(db), { creadorActualId: 'beto' });
    await assertFails(batch.commit());
    await assertFails(updateDoc(memberRef(db, 'beto'), { rol: 'creador' }));
  });

  it('un miembro común no puede ascender a nadie ni quedarse con el hogar', async () => {
    const db = dbOf('beto');
    await assertFails(updateDoc(memberRef(db, 'cami'), { rol: 'creador' }));
    const batch = writeBatch(db);
    batch.update(memberRef(db, 'beto'), { rol: 'creador' });
    batch.update(hogarRef(db), { creadorActualId: 'beto' });
    await assertFails(batch.commit());
  });

  it('un miembro común no puede cederle el rol a otro aunque lo arme como traspaso', async () => {
    const db = dbOf('beto');
    const batch = writeBatch(db);
    batch.update(memberRef(db, 'beto'), { ...leaveFields() });
    batch.update(memberRef(db, 'cami'), { rol: 'creador' });
    batch.update(hogarRef(db), { creadorActualId: 'cami' });
    await assertFails(batch.commit());
  });

  it('la última persona (creadora) sale sin traspaso y el hogar queda archivado', async () => {
    await seed({ members: { ana: { rol: 'creador' } }, hogar: { invitacionActivaId: CODE }, invitations: { [CODE]: {} } });
    await assertSucceeds(updateDoc(memberRef(dbOf('ana'), 'ana'), leaveFields()));
    await assertFails(getDoc(hogarRef(dbOf('ana'))));
    // Nadie nuevo puede entrar: el hogar no tiene creador activo.
    await assertFails(setDoc(memberRef(dbOf('nuevo'), 'nuevo'), joinData()));
    // Y quien salió no vuelve a un hogar sin creador.
    await assertFails(
      setDoc(memberRef(dbOf('ana'), 'ana'), joinData({ nombre: 'ana' })),
    );
  });

  it('el creador no se queda como `miembro` y como creador del hogar a la vez', async () => {
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.update(memberRef(db, 'ana'), { ...leaveFields(), rol: 'miembro' });
    batch.update(hogarRef(db), { creadorActualId: 'ana' });
    await assertFails(batch.commit());
  });

  it('quien salió no se reactiva sin invitación y no edita nada', async () => {
    await seed({
      members: { ana: { rol: 'creador' }, saliente: { estado: 'salio', hasta: ago(1) } },
    });
    const db = dbOf('saliente');
    await assertFails(updateDoc(memberRef(db, 'saliente'), { estado: 'activo' }));
    await assertFails(updateDoc(memberRef(db, 'saliente'), { nombre: 'Vuelvo' }));
    await assertFails(updateDoc(hogarRef(db), { nombre: 'Vuelvo' }));
  });
});

describe('lotes exactos de la app: salir, traspasar y vaciar hogarActualId', () => {
  beforeEach(async () => {
    await family();
    await env.withSecurityRulesDisabled(async (ctx) => {
      for (const uid of ['ana', 'beto', 'cami']) {
        await setDoc(doc(ctx.firestore(), 'usuarios', uid), {
          nombre: uid,
          email: `${uid}@example.com`,
          creadoEn: Timestamp.now(),
          hogarActualId: H,
        });
      }
    });
  });

  const userRef = (db, uid) => doc(db, 'usuarios', uid);

  it('el creador sale con traspaso y vacía su hogarActualId en el mismo lote', async () => {
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.update(memberRef(db, 'ana'), { estado: 'salio', hasta: serverTimestamp(), rol: 'miembro' });
    batch.update(memberRef(db, 'beto'), { rol: 'creador' });
    batch.update(hogarRef(db), { creadorActualId: 'beto' });
    batch.update(userRef(db, 'ana'), { hogarActualId: null });
    await assertSucceeds(batch.commit());
  });

  it('un miembro común sale y vacía su hogarActualId en el mismo lote', async () => {
    const db = dbOf('cami');
    const batch = writeBatch(db);
    batch.update(memberRef(db, 'cami'), { estado: 'salio', hasta: serverTimestamp() });
    batch.update(userRef(db, 'cami'), { hogarActualId: null });
    await assertSucceeds(batch.commit());
  });

  it('quien fue quitado se entera por su propio documento y vacía su hogarActualId', async () => {
    await updateDoc(memberRef(dbOf('ana'), 'beto'), { estado: 'quitado', hasta: serverTimestamp() });
    const db = dbOf('beto');
    const own = await assertSucceeds(getDoc(memberRef(db, 'beto')));
    assert.equal(own.data().estado, 'quitado');
    await assertSucceeds(updateDoc(userRef(db, 'beto'), { hogarActualId: null }));
  });

  it('nadie vacía el hogarActualId de otra persona', async () => {
    await assertFails(updateDoc(userRef(dbOf('ana'), 'beto'), { hogarActualId: null }));
  });
});

describe('miembros: refrescar nombre y foto propios', () => {
  beforeEach(family);

  it('cada miembro actualiza su nombre y su foto', async () => {
    await assertSucceeds(
      updateDoc(memberRef(dbOf('beto'), 'beto'), { nombre: 'Beto G.', foto: 'https://example.com/b.jpg' }),
    );
  });

  it('no actualiza los de otra persona', async () => {
    await assertFails(updateDoc(memberRef(dbOf('beto'), 'cami'), { nombre: 'Cami X' }));
    await assertFails(updateDoc(memberRef(dbOf('ana'), 'cami'), { nombre: 'Cami X' }));
  });

  it('no cambia rol, estado, desde ni invitaciones por esta vía', async () => {
    const ref = memberRef(dbOf('beto'), 'beto');
    await assertFails(updateDoc(ref, { rol: 'creador' }));
    await assertFails(updateDoc(ref, { desde: serverTimestamp() }));
    await assertFails(updateDoc(ref, { invitadoPor: 'cami' }));
    await assertFails(updateDoc(ref, { colorAvatar: 'otro' }));
  });

  it('nombre vacío no se acepta', async () => {
    await assertFails(updateDoc(memberRef(dbOf('beto'), 'beto'), { nombre: '' }));
  });
});

describe('sin sesión y aislamiento', () => {
  beforeEach(family);

  it('sin sesión no se escribe nada', async () => {
    const db = dbOf(null);
    await assertFails(updateDoc(hogarRef(db), { nombre: 'x' }));
    await assertFails(updateDoc(memberRef(db, 'beto'), { nombre: 'x' }));
    await assertFails(updateDoc(invRef(db), { estado: 'revocada' }));
    await assertFails(deleteDoc(hogarRef(db)));
  });

  it('lo que cuelga del hogar y no está en las reglas sigue bloqueado', async () => {
    const db = dbOf('ana');
    // listas e items ya tienen reglas (Etapa 4, ver listas-items.rules.test.mjs).
    await assertFails(getDoc(doc(db, 'hogares', H, 'presencia', 'ana')));
    await assertFails(setDoc(doc(db, 'hogares', H, 'presencia', 'ana'), { listaId: 'l1' }));
    await assertFails(getDoc(doc(db, 'hogares', H, 'eventos', 'e1')));
  });

  it('nadie escribe en usuarios/{otro}', async () => {
    await seed({ members: { ana: { rol: 'creador' } }, users: { ana: {} } });
    await assertFails(updateDoc(doc(dbOf('beto'), 'usuarios', 'ana'), { hogarActualId: '' }));
  });
});
