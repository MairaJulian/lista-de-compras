/** Purga de lo borrado hace más de 30 días (Etapa 6). Lógica pura; ver `purgeSource.ts`. */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Documentos por tanda: el límite de un lote de escrituras de Firestore. */
export const PURGE_BATCH_SIZE = 500;
/** Tope de tandas por pasada, para no quedar en un ciclo si algo no se llega a borrar. */
export const PURGE_MAX_ROUNDS = 20;

/**
 * Fecha de corte (milisegundos): lo marcado antes de este momento se elimina. Las reglas permiten
 * eliminar pasados 30 días del servidor; se usa un día más para que un reloj adelantado en el
 * celular no haga rechazar el lote entero.
 */
export function purgeCutoff(now: number): number {
  return now - 31 * DAY_MS;
}

/**
 * Elimina de a tandas: pide hasta `PURGE_BATCH_SIZE` ids, los elimina y repite hasta que una
 * consulta trae menos que una tanda llena (o se llega al tope). Devuelve cuántos eliminó. Si una
 * tanda falla, el error sale y se corta (se reintenta en la próxima apertura de la app).
 */
export async function drainInBatches(
  fetchBatch: () => Promise<string[]>,
  removeBatch: (ids: string[]) => Promise<void>,
): Promise<number> {
  let total = 0;
  for (let round = 0; round < PURGE_MAX_ROUNDS; round++) {
    const ids = await fetchBatch();
    if (ids.length === 0) break;
    await removeBatch(ids);
    total += ids.length;
    if (ids.length < PURGE_BATCH_SIZE) break;
  }
  return total;
}
