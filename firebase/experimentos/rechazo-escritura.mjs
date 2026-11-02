// Experimento (no es una prueba de CI): cómo rechaza Firestore una escritura que las reglas no dejan.
// Usa el SDK web contra el emulador con las reglas reales; el SDK nativo de Android que usa la app
// (`@react-native-firebase/firestore`) comparte el mismo motor y mapea los códigos igual (ver PR 6).
//
//   cd firebase && npx firebase emulators:exec --only firestore --config firebase.json \
//     --project changuito-rules-test "node experimentos/rechazo-escritura.mjs"
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  disableNetwork,
  doc,
  enableNetwork,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const env = await initializeTestEnvironment({
  projectId: 'changuito-rules-test',
  firestore: { rules, host: '127.0.0.1', port: 8080 },
});
const H = 'hogar1';
const t0 = Date.now();
const log = (...args) => console.log(`[+${String(Date.now() - t0).padStart(4)} ms]`, ...args);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const member = { nombre: 'Maira', colorAvatar: 'green', rol: 'creador', estado: 'activo', desde: new Date() };
  await setDoc(doc(db, 'hogares', H, 'miembros', 'maira'), member);
  await setDoc(doc(db, 'hogares', H, 'items', 'leche'), {
    listaId: 'l1', nombre: 'Leche', comprado: false, borrado: false, agregadoPor: 'maira', agregadoEn: new Date(),
  });
});

const db = env.authenticatedContext('maira').firestore();
const itemsQuery = query(collection(db, 'hogares', H, 'items'), where('borrado', '==', false));
const stop = onSnapshot(itemsQuery, { includeMetadataChanges: true }, (snap) => {
  log(
    'onSnapshot:',
    snap.docs.map((d) => `${d.get('nombre')}${d.metadata.hasPendingWrites ? '(pendiente)' : ''}`).join(', ') || '(vacío)',
    `fromCache=${snap.metadata.fromCache}`,
  );
});
await sleep(500);

const describeError = (error) => `code=${error.code} name=${error.name} message=${JSON.stringify(error.message)}`;

console.log('\n--- 1. Escritura rechazada por las reglas (agregadoPor de otra persona), con conexión');
setDoc(doc(db, 'hogares', H, 'items', 'mermelada'), {
  listaId: 'l1', nombre: 'Mermelada', comprado: false, borrado: false, agregadoPor: 'otra', agregadoEn: serverTimestamp(),
}).then(
  () => log('promesa: resuelta (inesperado)'),
  (error) => log('promesa: RECHAZADA', describeError(error)),
);
await sleep(1500);

console.log('\n--- 2. Edición rechazada (cambiar agregadoPor de un ítem existente)');
updateDoc(doc(db, 'hogares', H, 'items', 'leche'), { cantidad: 2, agregadoPor: 'otra' }).then(
  () => log('promesa: resuelta (inesperado)'),
  (error) => log('promesa: RECHAZADA', describeError(error)),
);
await sleep(1500);

console.log('\n--- 3. Dos escrituras seguidas: la primera rechazada, la segunda válida');
setDoc(doc(db, 'hogares', H, 'items', 'malo'), {
  listaId: 'l1', nombre: '', comprado: false, borrado: false, agregadoPor: 'maira', agregadoEn: serverTimestamp(),
}).then(() => log('malo: resuelta'), (error) => log('malo: RECHAZADA', error.code));
updateDoc(doc(db, 'hogares', H, 'items', 'leche'), { cantidad: 3 }).then(
  () => log('cantidad 3: resuelta (confirmada por el servidor)'),
  (error) => log('cantidad 3: RECHAZADA', error.code),
);
await sleep(1500);

console.log('\n--- 4. Sin conexión: la promesa no se resuelve ni se rechaza; al volver la conexión se rechaza');
await disableNetwork(db);
log('red apagada');
setDoc(doc(db, 'hogares', H, 'items', 'sinred'), {
  listaId: 'l1', nombre: 'Sin red (válido)', comprado: false, borrado: false, agregadoPor: 'maira', agregadoEn: serverTimestamp(),
}).then(() => log('sinred: confirmada'), (error) => log('sinred: RECHAZADA', error.code));
setDoc(doc(db, 'hogares', H, 'items', 'sinred-malo'), {
  listaId: 'l1', nombre: 'Sin red (inválido)', comprado: false, borrado: false, agregadoPor: 'otra', agregadoEn: serverTimestamp(),
}).then(() => log('sinred-malo: confirmada'), (error) => log('sinred-malo: RECHAZADA', describeError(error)));
await sleep(1500);
log('pasó 1,5 s sin red: ninguna promesa terminó');
await enableNetwork(db);
log('red encendida');
await sleep(2000);

console.log('\n--- 5. Editar un documento que no existe en el servidor (por ejemplo, tildar un ítem cuya creación se rechazó)');
updateDoc(doc(db, 'hogares', H, 'items', 'no-existe'), { comprado: true }).then(
  () => log('promesa: resuelta (inesperado)'),
  (error) => log('promesa: RECHAZADA', describeError(error)),
);
await sleep(1500);

stop();
await env.cleanup();
