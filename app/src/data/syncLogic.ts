/**
 * Lógica pura del indicador Sincronizado / Sin conexión (`05`, `07`) y del aviso "N cambios sin
 * sincronizar". Prioridad, de mayor a menor: Sin guardar (el servidor rechazó algo) → Sin conexión →
 * Sincronizado. Lo que espera conexión no es un error.
 */

export type SyncKind =
  /** El servidor rechazó cambios (`37`). */
  | 'unsaved'
  | 'offline'
  | 'synced'
  /** Hay conexión pero todavía hay cambios en camino (dura lo que tarda el servidor en confirmar). */
  | 'syncing'
  /** Recién arrancó y todavía no se sabe si hay conexión: no se muestra nada para no mentir. */
  | 'connecting';

export type SyncInput = {
  /** Hay cambios rechazados por el servidor. */
  unsaved: boolean;
  /** Las lecturas vienen de la copia local: Firestore no pudo confirmarlas con el servidor. */
  fromCache: boolean;
  /** Desde que se empezó a leer el hogar llegó al menos una lectura confirmada por el servidor. */
  connectedOnce: boolean;
  /** Pasó el tiempo de espera inicial sin que llegara una lectura del servidor. */
  graceOver: boolean;
  /** Documentos con cambios que el servidor todavía no confirmó. */
  pendingCount: number;
};

/**
 * Qué estado tiene la conexión. Ante la duda gana "Sin conexión": nunca "Sincronizado" si hay
 * cambios sin confirmar o las lecturas no vienen del servidor.
 */
export function syncKind(input: SyncInput): SyncKind {
  if (input.unsaved) return 'unsaved';
  if (input.fromCache) {
    // Al arrancar, la primera lectura sale de la copia local antes de que el servidor responda: no es
    // "sin conexión" todavía. Con cambios pendientes sí lo avisamos desde el principio.
    if (!input.connectedOnce && !input.graceOver && input.pendingCount === 0) return 'connecting';
    return 'offline';
  }
  return input.pendingCount > 0 ? 'syncing' : 'synced';
}

/** Lo que realmente se dibuja: igual que `SyncKind`, sin el estado transitorio `syncing`. */
export type ShownKind = Exclude<SyncKind, 'syncing'>;

/**
 * Lo que se muestra en el indicador. Con conexión, un cambio recién hecho tarda ~100 ms en
 * confirmarse: durante `syncing` se sigue mostrando lo que había (hasta `holdOver`) en vez de
 * parpadear a "Sin conexión" en cada tilde. Pasado ese tiempo sin confirmar, se muestra "Sin conexión".
 * Si ya estaba "Sin conexión" sigue así hasta que se confirme todo.
 */
export function shownKind(kind: SyncKind, previous: ShownKind, holdOver: boolean): ShownKind {
  if (kind !== 'syncing') return kind;
  if (holdOver) return 'offline';
  return previous === 'unsaved' ? 'synced' : previous;
}

/** Una clave por documento (`item:id`, `list:id`): un ítem con varios campos cambiados cuenta una vez. */
export const itemKey = (id: string) => `item:${id}`;
export const listKey = (id: string) => `list:${id}`;

/** Cuántos documentos de la lista tienen cambios pendientes (se suman sin repetir). */
export function countPending(...groups: Iterable<string>[]): number {
  const keys = new Set<string>();
  for (const group of groups) for (const key of group) keys.add(key);
  return keys.size;
}

/** "1 cambio sin sincronizar" / "3 cambios sin sincronizar" (aviso de `07`). */
export function offlineNotice(pendingCount: number): string {
  if (pendingCount === 0) {
    return 'Los cambios se guardan en tu celular y se sincronizan cuando vuelva la conexión.';
  }
  return pendingCount === 1
    ? '1 cambio sin sincronizar. Se enviará solo cuando vuelva la conexión.'
    : `${pendingCount} cambios sin sincronizar. Se enviarán solos cuando vuelva la conexión.`;
}
