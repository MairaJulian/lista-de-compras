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
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

// La purga de la app (app/src/data/purgeSource.ts) hace estas consultas y estos lotes. Acá se
// comprueba que las reglas reales los permiten con la forma exacta que usa la app: consultas con un
// solo campo, y lotes de eliminación en el orden ítems de la lista -> lista.

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
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days) => Timestamp.fromMillis(Date.now() - days * DAY);
// Mismo corte que la app: hace 31 días.
const cutoff = () => Timestamp.fromMillis(Date.now() - 31 * DAY);

const dbOf = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());
const col = (db, name) => collection(db, 'hogares', H, name);

const baseItem = (overrides = {}) => ({
  listaId: 'activa',
  nombre: 'Leche',
  comprado: false,
  agregadoPor: 'ana',
  agregadoEn: daysAgo(90),
  borrado: false,
  ...overrides,
});
const baseList = (overrides = {}) => ({
  nombre: 'Lista',
  color: 'green',
  creadaPor: 'ana',
  creadaEn: daysAgo(100),
  eliminada: false,
  ...overrides,
});

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'hogares', H), {
      nombre: 'Casa',
      creadoPor: 'ana',
      creadoEn: daysAgo(500),
      invitacionActivaId: '',
      creadorActualId: 'ana',
    });
    await setDoc(doc(db, 'hogares', H, 'miembros', 'ana'), {
      nombre: 'ana', colorAvatar: 'green', rol: 'creador', estado: 'activo', desde: daysAgo(400),
    });
    await setDoc(doc(db, 'hogares', H, 'miembros', 'salio'), {
      nombre: 'salio', colorAvatar: 'green', rol: 'miembro', estado: 'salio', desde: daysAgo(400), hasta: daysAgo(1),
    });
    await setDoc(doc(db, 'hogares', H, 'listas', 'activa'), baseList());
    await setDoc(
      doc(db, 'hogares', H, 'listas', 'vencida'),
      baseList({ eliminada: true, eliminadaPor: 'ana', eliminadaEn: daysAgo(40) }),
    );
    await setDoc(
      doc(db, 'hogares', H, 'listas', 'reciente'),
      baseList({ eliminada: true, eliminadaPor: 'ana', eliminadaEn: daysAgo(5) }),
    );
    const items = {
      vivo: baseItem(),
      borradoViejo: baseItem({ borrado: true, borradoPor: 'ana', borradoEn: daysAgo(45) }),
      borradoReciente: baseItem({ borrado: true, borradoPor: 'ana', borradoEn: daysAgo(3) }),
      deVencida1: baseItem({ listaId: 'vencida' }),
      deVencida2: baseItem({ listaId: 'vencida', comprado: true, tildadoPor: 'ana', tildadoEn: daysAgo(60) }),
      deReciente: baseItem({ listaId: 'reciente' }),
    };
    for (const [id, data] of Object.entries(items)) {
      await setDoc(doc(db, 'hogares', H, 'items', id), data);
    }
  });
}

const ids = (snapshot) => snapshot.docs.map((d) => d.id).sort();

describe('purga: consultas', () => {
  beforeEach(seed);

  it('un miembro activo consulta solo por borradoEn y recibe los vencidos', async () => {
    const snap = await assertSucceeds(
      getDocs(query(col(dbOf('ana'), 'items'), where('borradoEn', '<', cutoff()), limit(500))),
    );
    // Un ítem sin borrar no tiene borradoEn, así que no entra; uno borrado hace poco, tampoco.
    assert(ids(snap), ['borradoViejo']);
  });

  it('consulta las listas solo por eliminadaEn', async () => {
    const snap = await assertSucceeds(
      getDocs(query(col(dbOf('ana'), 'listas'), where('eliminadaEn', '<', cutoff()), limit(500))),
    );
    assert(ids(snap), ['vencida']);
  });

  it('consulta los ítems de una lista solo por listaId', async () => {
    const snap = await assertSucceeds(
      getDocs(query(col(dbOf('ana'), 'items'), where('listaId', '==', 'vencida'), limit(500))),
    );
    assert(ids(snap), ['deVencida1', 'deVencida2']);
  });

  it('quien salió del hogar o no tiene sesión no puede consultar', async () => {
    for (const uid of ['salio', null]) {
      await assertFails(
        getDocs(query(col(dbOf(uid), 'items'), where('borradoEn', '<', cutoff()), limit(500))),
      );
    }
  });
});

describe('purga: lotes de eliminación', () => {
  beforeEach(seed);

  it('elimina ítems borrados viejos, ítems de listas vencidas y luego las listas vencidas', async () => {
    const db = dbOf('ana');
    const items = writeBatch(db);
    items.delete(doc(db, 'hogares', H, 'items', 'borradoViejo'));
    await assertSucceeds(items.commit());

    const ofList = writeBatch(db);
    ofList.delete(doc(db, 'hogares', H, 'items', 'deVencida1'));
    ofList.delete(doc(db, 'hogares', H, 'items', 'deVencida2'));
    await assertSucceeds(ofList.commit());

    const lists = writeBatch(db);
    lists.delete(doc(db, 'hogares', H, 'listas', 'vencida'));
    await assertSucceeds(lists.commit());

    for (const [name, id] of [['items', 'borradoViejo'], ['items', 'deVencida1'], ['listas', 'vencida']]) {
      const snap = await getDoc(doc(db, 'hogares', H, name, id));
      if (snap.exists()) throw new Error(`${name}/${id} sigue existiendo`);
    }
    // Lo que no estaba vencido sigue ahí.
    for (const [name, id] of [['items', 'vivo'], ['items', 'borradoReciente'], ['items', 'deReciente'], ['listas', 'reciente']]) {
      const snap = await getDoc(doc(db, 'hogares', H, name, id));
      if (!snap.exists()) throw new Error(`${name}/${id} no debería haberse eliminado`);
    }
  });

  it('un lote con un solo documento no vencido se rechaza entero', async () => {
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.delete(doc(db, 'hogares', H, 'items', 'borradoViejo'));
    batch.delete(doc(db, 'hogares', H, 'items', 'borradoReciente'));
    await assertFails(batch.commit());
    let exists = false;
    await env.withSecurityRulesDisabled(async (ctx) => {
      exists = (await getDoc(doc(ctx.firestore(), 'hogares', H, 'items', 'borradoViejo'))).exists();
    });
    if (!exists) throw new Error('el lote rechazado no debería haber eliminado nada');
  });

  it('los ítems de una lista eliminada hace poco no se eliminan', async () => {
    const db = dbOf('ana');
    const batch = writeBatch(db);
    batch.delete(doc(db, 'hogares', H, 'items', 'deReciente'));
    await assertFails(batch.commit());
  });

  it('quien salió del hogar no elimina nada', async () => {
    const db = dbOf('salio');
    const batch = writeBatch(db);
    batch.delete(doc(db, 'hogares', H, 'items', 'borradoViejo'));
    await assertFails(batch.commit());
  });
});

function assert(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`esperaba ${JSON.stringify(expected)} y llegó ${JSON.stringify(actual)}`);
  }
}
