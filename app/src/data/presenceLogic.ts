/**
 * Presencia (Etapa 6): quién tiene una lista abierta. Lógica pura; la lectura y la escritura en
 * Firestore están en `presenceSource.ts`. Ver `ESQUEMA-DATOS.md`, "Presencia".
 */

/** Cada cuánto renueva su latido quien tiene una lista abierta. */
export const HEARTBEAT_MS = 30_000;
/**
 * Pasado este tiempo sin latido se considera cerrada. Es amplio a propósito: absorbe la diferencia
 * entre el reloj del celular y el del servidor.
 */
export const PRESENCE_EXPIRES_MS = 120_000;

export type Presence = {
  /** Uid de la persona (el id del documento). */
  uid: string;
  /** Lista que tiene abierta; vacía si ninguna. */
  listId: string;
  /** Milisegundos de `ultimoLatido`; sin hora (documento incompleto) no cuenta como abierta. */
  lastBeat?: number;
};

type Data = Record<string, unknown> | undefined;

/** Presencia de la app a partir de su documento. */
export function presenceFromDocument(uid: string, data: Data): Presence {
  const toMillis = (data?.ultimoLatido as { toMillis?: () => number } | null | undefined)?.toMillis;
  return {
    uid,
    listId: typeof data?.listaId === 'string' ? data.listaId : '',
    lastBeat: typeof toMillis === 'function' ? toMillis.call(data?.ultimoLatido) : undefined,
  };
}

/**
 * Si alguna otra persona tiene esa lista abierta: su `listaId` es la lista y su último latido tiene
 * menos de 2 minutos. Quien consulta (`selfId`) no se cuenta. Un latido "del futuro" (reloj
 * adelantado) cuenta como reciente: ante la duda, no se borra.
 */
export function isListOpenByOthers(
  presences: Presence[],
  listId: string,
  selfId: string,
  now: number,
): boolean {
  return presences.some(
    (presence) =>
      presence.uid !== selfId &&
      presence.listId === listId &&
      presence.lastBeat !== undefined &&
      now - presence.lastBeat < PRESENCE_EXPIRES_MS,
  );
}
