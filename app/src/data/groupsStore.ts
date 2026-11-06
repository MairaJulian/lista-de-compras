import { currentUserId, fetchMyGroups } from './groupSource';
import type { GroupSummary } from './groupLogic';

// Los grupos de la persona, leídos una vez (no hay listeners): el panel `47`, la pantalla `48` y el
// límite de grupos comparten la misma lectura mientras sea reciente, para cuidar las lecturas del
// plan gratuito.

/** Cuánto se reutiliza una lectura antes de volver a pedirla (milisegundos). */
export const GROUPS_CACHE_MS = 60 * 1000;

type Cached = { uid: string; at: number; groups: GroupSummary[] };

let cached: Cached | undefined;
let generation = 0;
let inFlight: { uid: string; promise: Promise<GroupSummary[]> } | undefined;

/** Lo último leído de la misma persona, sin importar su antigüedad (para mostrar algo mientras se actualiza). */
export function peekGroups(): GroupSummary[] | undefined {
  const uid = currentUserId();
  return cached && uid && cached.uid === uid ? cached.groups : undefined;
}

/**
 * Los grupos de la persona: la lectura reciente si la hay, si no una nueva (varios pedidos a la
 * vez comparten una sola). `force` ignora la reciente (por ejemplo en "Reintentar").
 */
export async function loadGroups(force = false): Promise<GroupSummary[]> {
  const uid = currentUserId();
  if (!uid) throw new Error('No hay una sesión abierta.');
  if (!force && cached && cached.uid === uid && Date.now() - cached.at < GROUPS_CACHE_MS) {
    return cached.groups;
  }
  if (inFlight && inFlight.uid === uid) return inFlight.promise;
  const started = generation;
  const promise = fetchMyGroups()
    .then((groups) => {
      // Si la lista cambió mientras se leía (crear, unirse, salir), esta lectura ya quedó vieja.
      if (started === generation) cached = { uid, at: Date.now(), groups };
      return groups;
    })
    .finally(() => {
      if (inFlight?.promise === promise) inFlight = undefined;
    });
  inFlight = { uid, promise };
  return promise;
}

/** Descarta lo leído (al crear un grupo, unirse o salir: la lista cambió). */
export function invalidateGroups() {
  generation += 1;
  cached = undefined;
}

/** Vuelve a "sin leer" (para los tests). */
export function resetGroupsStore() {
  generation += 1;
  cached = undefined;
  inFlight = undefined;
}
