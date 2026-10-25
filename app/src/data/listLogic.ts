import type { ListTone } from '../theme';
import type { ListInfo, ListItem } from './types';

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

export type ItemPatch = Partial<Pick<ListItem, 'name' | 'quantity' | 'note'>>;

/**
 * Cambia solo los campos del parche (nunca reescribe el ítem entero: de eso depende "gana el último,
 * por campo"). Un nombre vacío se ignora. Sin conexión queda sin sincronizar.
 */
export function updateItem(
  items: ListItem[],
  itemId: string,
  patch: ItemPatch,
  online: boolean,
): ListItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;
    const changes: ItemPatch = { ...patch };
    if ('name' in changes) {
      const name = changes.name?.trim();
      if (name) changes.name = name;
      else delete changes.name;
    }
    if (Object.keys(changes).length === 0) return item;
    return { ...item, ...changes, pendingSync: online ? item.pendingSync : true };
  });
}

export function removeItem(items: ListItem[], itemId: string): ListItem[] {
  return items.filter((item) => item.id !== itemId);
}

/** Al salir de la lista se borran los comprados de esa lista; los pendientes y las demás listas quedan. */
export function removeDone(items: ListItem[], listId: string): ListItem[] {
  return items.filter((item) => item.listId !== listId || !item.done);
}

/** Crea una lista al final. Un nombre vacío no crea nada. */
export function addList(lists: ListInfo[], name: string, tone: ListTone, id: string): ListInfo[] {
  const trimmed = name.trim();
  if (!trimmed) return lists;
  return [...lists, { id, name: trimmed, tone, icon: 'list' }];
}
