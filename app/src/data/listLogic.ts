import type { ListTone } from '../theme';
import type { ListInfo, ListItem, ListSummary } from './types';

/** Lógica pura de la pantalla Lista: tildar, agregar y contar. Nunca modifica los arreglos recibidos. */

export const MAX_LIST_NAME = 80;
export const MAX_ITEM_NAME = 120;
export const MAX_ITEM_NOTE = 500;

/** Nombre de lista listo para guardar, o `undefined` si queda vacío o demasiado largo. */
export function cleanListName(name: string): string | undefined {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_LIST_NAME ? trimmed : undefined;
}

/** Nombre de ítem listo para guardar, o `undefined` si queda vacío o demasiado largo. */
export function cleanItemName(name: string): string | undefined {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_ITEM_NAME ? trimmed : undefined;
}

/**
 * De más nuevo a más viejo. Sin marca de tiempo (datos de ejemplo) no se reordena; con marca, el
 * empate se desempata por id para que el orden no cambie entre lecturas.
 */
function newestFirst(key: 'addedAt' | 'doneAt') {
  return (a: ListItem, b: ListItem) => {
    const x = a[key] ?? 0;
    const y = b[key] ?? 0;
    if (x !== y) return y - x;
    return a[key] === undefined ? 0 : a.id.localeCompare(b.id);
  };
}

const visible = (items: ListItem[]) => items.filter((item) => !item.deleted);

/** Pendientes por `agregadoEn` descendente y comprados por `tildadoEn` descendente; los borrados no cuentan. */
export function splitItems(items: ListItem[]) {
  const shown = visible(items);
  return {
    pending: shown.filter((item) => !item.done).sort(newestFirst('addedAt')),
    done: shown.filter((item) => item.done).sort(newestFirst('doneAt')),
  };
}

export function countPending(items: ListItem[]): number {
  return visible(items).filter((item) => !item.done).length;
}

/** Las listas (sin las eliminadas) con la cantidad de pendientes que sale de los ítems de cada una. */
export function summarizeLists(lists: ListInfo[], items: ListItem[]): ListSummary[] {
  return lists
    .filter((list) => !list.deleted)
    .map((list) => ({
      ...list,
      pendingCount: countPending(items.filter((item) => item.listId === list.id)),
    }));
}

/** Las listas de más vieja a más nueva; sin hora (la escritura todavía no tiene marca) van al final. */
export function sortLists(lists: ListInfo[]): ListInfo[] {
  const time = (list: ListInfo) => list.createdAt ?? Number.MAX_SAFE_INTEGER;
  return [...lists].sort((a, b) => time(a) - time(b) || a.id.localeCompare(b.id));
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
  const trimmed = cleanItemName(name);
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

/**
 * "×2" cuando la cantidad es mayor que 1, "1 kg" cuando hay unidad. Una cantidad ausente vale 1, así
 * que sin unidad no se muestra nada.
 */
export function formatQuantity(item: Pick<ListItem, 'quantity' | 'unit'>): string | undefined {
  const quantity = item.quantity ?? 1;
  if (item.unit) return `${quantity} ${item.unit}`;
  return quantity > 1 ? `×${quantity}` : undefined;
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

/**
 * Qué campos cambió la persona en el detalle (ninguno si no tocó nada). El nombre se compara sin los
 * espacios de los costados; una nota vacía es `undefined` (se borra).
 */
export function changedFields(
  item: Pick<ListItem, 'name' | 'quantity' | 'note'>,
  draft: { name: string; quantity: number; note: string },
): ItemPatch {
  const patch: ItemPatch = {};
  const name = draft.name.trim();
  const note = draft.note.trim();
  if (name !== item.name) patch.name = name;
  if (draft.quantity !== (item.quantity ?? 1)) patch.quantity = draft.quantity;
  if (note !== (item.note ?? '')) patch.note = note || undefined;
  return patch;
}

/** Borra el ítem: queda marcado (como en Firestore), así se puede deshacer. */
export function removeItem(items: ListItem[], itemId: string): ListItem[] {
  return items.map((item) => (item.id === itemId ? { ...item, deleted: true } : item));
}

/** Deshace `removeItem`. */
export function restoreItem(items: ListItem[], itemId: string): ListItem[] {
  return items.map((item) => (item.id === itemId ? { ...item, deleted: false } : item));
}

/** Al salir de la lista se borran los comprados de esa lista; los pendientes y las demás listas quedan. */
export function removeDone(items: ListItem[], listId: string): ListItem[] {
  return items.filter((item) => item.listId !== listId || !item.done);
}

/** Crea una lista al final. Un nombre vacío no crea nada. */
export function addList(lists: ListInfo[], name: string, tone: ListTone, id: string): ListInfo[] {
  const trimmed = cleanListName(name);
  if (!trimmed) return lists;
  return [...lists, { id, name: trimmed, tone, icon: 'list' }];
}

/** Cambia el nombre de una lista. Un nombre vacío no cambia nada. */
export function renameList(lists: ListInfo[], listId: string, name: string): ListInfo[] {
  const trimmed = cleanListName(name);
  if (!trimmed) return lists;
  return lists.map((list) => (list.id === listId ? { ...list, name: trimmed } : list));
}

/** Elimina una lista: queda marcada (como en Firestore), no se muestra y sus ítems se ignoran. */
export function deleteList(lists: ListInfo[], listId: string): ListInfo[] {
  return lists.map((list) => (list.id === listId ? { ...list, deleted: true } : list));
}
