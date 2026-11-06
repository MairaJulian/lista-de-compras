import { useSyncExternalStore } from 'react';

// El aviso "Ya no sos parte de <grupo>" (`19`) cuando a la persona le queda otro grupo: se muestra
// sobre Inicio de ese otro grupo. Si no le queda ninguno, el aviso va en Sin grupo (parámetro de la
// ruta). Al cerrarse conserva el nombre para que el texto no cambie mientras se desvanece.

type Notice = { groupName: string; visible: boolean };

let notice: Notice = { groupName: '', visible: false };
const listeners = new Set<() => void>();

function set(next: Notice) {
  notice = next;
  listeners.forEach((listener) => listener());
}

export function showRemovedNotice(groupName: string) {
  set({ groupName, visible: true });
}

export function dismissRemovedNotice() {
  if (notice.visible) set({ ...notice, visible: false });
}

export function useRemovedNotice(): Notice {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => notice,
  );
}

/** Vuelve a "sin aviso" (para los tests). */
export function resetRemovedNotice() {
  set({ groupName: '', visible: false });
}
