import type { ListItem } from './types';

/** Lógica pura de la pantalla Lista: tildar, agregar y contar. Nunca modifica los arreglos recibidos. */

export function splitItems(items: ListItem[]) {
  return {
    pending: items.filter((item) => !item.done),
    done: items.filter((item) => item.done),
  };
}

export function countPending(items: ListItem[]): number {
  return items.filter((item) => !item.done).length;
}

export function countUnsynced(items: ListItem[]): number {
  return items.filter((item) => item.pendingSync).length;
}

/** Tilda o destilda un ítem. Sin conexión queda marcado como sin sincronizar. */
export function toggleItem(
  items: ListItem[],
  itemId: string,
  memberId: string,
  online: boolean,
): ListItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;
    const done = !item.done;
    return {
      ...item,
      done,
      doneBy: done ? memberId : undefined,
      pendingSync: online ? item.pendingSync : true,
    };
  });
}

/** Agrega arriba de todo. Un nombre vacío no agrega nada. */
export function addItem(
  items: ListItem[],
  listId: string,
  name: string,
  memberId: string,
  online: boolean,
  id: string,
): ListItem[] {
  const trimmed = name.trim();
  if (!trimmed) return items;
  const item: ListItem = {
    id,
    listId,
    name: trimmed,
    done: false,
    addedBy: memberId,
    pendingSync: online ? undefined : true,
  };
  return [item, ...items];
}

/** Al volver la conexión se sincroniza todo. */
export function markSynced(items: ListItem[]): ListItem[] {
  return items.map((item) => (item.pendingSync ? { ...item, pendingSync: undefined } : item));
}

/** "×2" para cantidades sueltas, "1 kg" cuando hay unidad. */
export function formatQuantity(item: Pick<ListItem, 'quantity' | 'unit'>): string | undefined {
  if (item.quantity === undefined) return undefined;
  return item.unit ? `${item.quantity} ${item.unit}` : `×${item.quantity}`;
}
