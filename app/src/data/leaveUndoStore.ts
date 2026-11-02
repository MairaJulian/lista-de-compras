import { useSyncExternalStore } from 'react';

import { trackWrite } from './failureStore';
import { setItemDeleted } from './listSource';
import type { ListItem } from './types';

// "Deshacer" del borrado de comprados al salir de una lista (Etapa 6). Vive fuera de la pantalla
// Lista porque quien sale ya volvió a Inicio cuando necesita el botón: el aviso se muestra ahí.

/** Cuánto dura el aviso con "Deshacer". */
export const LEAVE_UNDO_MS = 8000;

export type LeaveUndo = {
  householdId: string;
  uid: string;
  items: ListItem[];
  /** Cambia con cada borrado: reinicia la cuenta regresiva del aviso. */
  token: number;
};

let state: LeaveUndo | undefined;
let nextToken = 1;
const listeners = new Set<() => void>();

function setState(next: LeaveUndo | undefined) {
  state = next;
  listeners.forEach((listener) => listener());
}

/** Muestra el aviso para deshacer el borrado de esos ítems. */
export function showLeaveUndo(householdId: string, uid: string, items: ListItem[]) {
  if (items.length === 0) return;
  setState({ householdId, uid, items, token: nextToken++ });
}

/** Oculta el aviso sin deshacer nada (pasó el tiempo, o se cambió de hogar). */
export function dismissLeaveUndo() {
  if (state !== undefined) setState(undefined);
}

/** Restaura todos los ítems borrados, uno por uno, y oculta el aviso. */
export function undoLeave() {
  const current = state;
  if (!current) return;
  setState(undefined);
  for (const item of current.items) {
    trackWrite(setItemDeleted(current.householdId, current.uid, item.id, false), {
      kind: 'deleteItem',
      householdId: current.householdId,
      uid: current.uid,
      item,
      deleted: false,
    });
  }
}

export function useLeaveUndo(): LeaveUndo | undefined {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}
