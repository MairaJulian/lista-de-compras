import { useSyncExternalStore } from 'react';

// Escrituras de esta sesión que el servidor todavía no confirmó, por documento. Firestore marca como
// pendientes los documentos que siguen en la lista (`hasPendingWrites`), pero un ítem que se borró
// sin conexión ya no está en la lectura de ítems no borrados: este registro lo sigue contando hasta
// que el servidor lo confirme. Se pierde si se cierra la app (lo que Firestore guarda en disco sigue
// pendiente y se cuenta por la lectura, salvo los borrados).

type Pending = { key: string; listId: string };

let pending: Pending[] = [];
const listeners = new Set<() => void>();
// Sube al vaciar: una confirmación de una sesión o un hogar anterior no toca el registro nuevo.
let generation = 0;

function setPending(next: Pending[]) {
  pending = next;
  listeners.forEach((listener) => listener());
}

/** Registra la escritura hasta que se confirme o el servidor la rechace. */
export function trackPending(saved: Promise<unknown>, doc: Pending) {
  const entry = { ...doc };
  const startedIn = generation;
  setPending([...pending, entry]);
  const done = () => {
    if (startedIn !== generation) return;
    setPending(pending.filter((candidate) => candidate !== entry));
  };
  saved.then(done, done);
}

/** Claves de los documentos de esa lista con cambios sin confirmar. */
export function usePendingKeys(listId: string): string[] {
  const all = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pending,
  );
  return all.filter((entry) => entry.listId === listId).map((entry) => entry.key);
}

/** Sin escrituras en seguimiento (al dejar de leer el hogar, y en los tests). */
export function clearPending() {
  generation++;
  if (pending.length > 0) setPending([]);
}
