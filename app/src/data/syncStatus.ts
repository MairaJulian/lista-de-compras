import { useEffect, useState } from 'react';

import { useFailures } from './failureStore';
import { useListData } from './listStore';
import { usePendingKeys } from './pendingStore';
import { countPending, itemKey, listKey, shownKind, syncKind, type ShownKind } from './syncLogic';

/** Cuánto se espera, al arrancar, a que el servidor responda antes de decir "Sin conexión". */
export const CONNECT_GRACE_MS = 4000;
/** Cuánto se tolera un cambio sin confirmar con conexión antes de dejar de decir "Sincronizado". */
export const CONFIRM_HOLD_MS = 2000;

export type SyncStatus = {
  /** Qué mostrar en el indicador de la lista (`connecting`: nada todavía). */
  kind: ShownKind;
  /** Documentos de esta lista (ítems y la propia lista) con cambios sin confirmar. */
  pendingCount: number;
};

/**
 * Estado de sincronización de una lista, para el indicador de la pantalla Lista. Combina lo que
 * dice Firestore (lecturas de la copia local o del servidor, documentos con cambios pendientes), las
 * escrituras en vuelo de esta sesión (`pendingStore`) y los cambios que el servidor rechazó
 * (`failureStore`). La prioridad y los textos están en `syncLogic.ts`.
 */
export function useSyncStatus(listId: string): SyncStatus {
  const data = useListData();
  const unsaved = useFailures(listId).length > 0;
  const inFlight = usePendingKeys(listId);
  const ready = data.status === 'ready' ? data : undefined;

  const fromCache = ready ? ready.sync.fromCache : true;
  const connectedOnce = ready?.connectedOnce ?? false;
  const startedAt = ready?.startedAt;

  const pendingCount = countPending(
    ready?.sync.pendingItemIds
      .filter((id) => ready.items.some((item) => item.id === id && item.listId === listId))
      .map(itemKey) ?? [],
    ready?.sync.pendingListIds.filter((id) => id === listId).map(listKey) ?? [],
    inFlight,
  );

  // Tiempo de espera inicial: pasado ese tiempo sin respuesta del servidor, es "Sin conexión".
  const [graceOver, setGraceOver] = useState(false);
  useEffect(() => {
    if (startedAt === undefined) return;
    const left = Math.max(0, startedAt + CONNECT_GRACE_MS - Date.now());
    const timer = setTimeout(() => setGraceOver(true), left);
    return () => {
      clearTimeout(timer);
      setGraceOver(false);
    };
  }, [startedAt]);

  const raw = syncKind({ unsaved, fromCache, connectedOnce, graceOver, pendingCount });

  // Con conexión, un cambio recién hecho se confirma en ~100 ms: no se parpadea a "Sin conexión".
  const [holdOver, setHoldOver] = useState(false);
  const syncing = raw === 'syncing';
  useEffect(() => {
    if (!syncing) return;
    const timer = setTimeout(() => setHoldOver(true), CONFIRM_HOLD_MS);
    return () => {
      clearTimeout(timer);
      setHoldOver(false);
    };
  }, [syncing]);

  // Lo que se mostraba antes decide qué se muestra mientras el cambio está en camino.
  const [shown, setShown] = useState<ShownKind>('connecting');
  const kind = shownKind(raw, shown, holdOver);
  if (kind !== shown) setShown(kind);

  return { kind, pendingCount };
}
