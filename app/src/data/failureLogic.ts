import type { ListTone } from '../theme';
import type { ItemPatch } from './listLogic';
import type { ListInfo, ListItem } from './types';

/**
 * Lógica pura de "Error al guardar" (`37`). Cuando el servidor rechaza una escritura, Firestore deshace
 * el cambio en el celular; la app guarda por su cuenta qué se intentó para mostrarlo marcado y poder
 * reintentarlo o descartarlo.
 */

/** Lo que cambia según el tipo de escritura; `item` y `list` son cómo estaban antes del cambio. */
export type FailedChange =
  | { kind: 'addItem'; item: ListItem }
  | { kind: 'toggleItem'; item: ListItem; done: boolean }
  | { kind: 'editItem'; item: ListItem; patch: ItemPatch }
  | { kind: 'deleteItem'; item: ListItem; deleted: boolean }
  | { kind: 'createList'; list: ListInfo; tone: ListTone }
  | { kind: 'renameList'; list: ListInfo; name: string }
  | { kind: 'deleteList'; list: ListInfo };

export type FailedWrite = FailedChange & {
  id: number;
  householdId: string;
  uid: string;
};

/** Lo que se pasa al guardar un fallo: el `id` lo pone el registro. */
export type FailedDescriptor = FailedChange & { householdId: string; uid: string };

/** Pantalla Inicio. */
export const HOME_SCOPE = 'home';

/** Dónde se muestra el fallo: crear y eliminar listas, en Inicio; lo demás, en la lista afectada. */
export function scopeOf(failure: FailedChange): string {
  switch (failure.kind) {
    case 'createList':
    case 'deleteList':
      return HOME_SCOPE;
    case 'renameList':
      return failure.list.id;
    default:
      return failure.item.listId;
  }
}

/** Si el fallo se ve como una fila marcada de la lista (los de ítems) o solo en el aviso. */
export function isRowFailure(
  failure: FailedChange,
): failure is Extract<FailedChange, { item: ListItem }> {
  return 'item' in failure;
}

const quantityText = (item: Pick<ListItem, 'quantity' | 'unit'>) =>
  `${item.quantity ?? 1}${item.unit ? ` ${item.unit}` : ''}`;

/** Por qué no se guardó la fila ("ítem nuevo", "cantidad (antes 1 kg)"); sin el prefijo "No se guardó". */
export function rowReason(failure: Extract<FailedChange, { item: ListItem }>): string {
  switch (failure.kind) {
    case 'addItem':
      return 'ítem nuevo';
    case 'toggleItem':
      return failure.done ? 'marcar como comprado' : 'volver a pendientes';
    case 'deleteItem':
      return failure.deleted ? 'eliminar' : 'deshacer';
    case 'editItem': {
      const { item, patch } = failure;
      const parts: string[] = [];
      if (patch.name !== undefined) parts.push(`nombre (antes ${item.name})`);
      if (patch.quantity !== undefined) parts.push(`cantidad (antes ${quantityText(item)})`);
      if ('note' in patch) parts.push('nota');
      return parts.join(', ');
    }
  }
}

/** Una fila de la lista: el ítem y, si no se pudo guardar, el motivo. */
export type ListRow = {
  item: ListItem;
  /** "No se guardó: ítem nuevo". */
  error?: string;
  /** El ítem no existe en el servidor (se rechazó crearlo o deshacer su borrado): no se puede tocar. */
  local?: boolean;
};

/** El ítem como se intentó dejar, para mostrarlo con el cambio que no se guardó. */
function withAttempt(item: ListItem, failures: FailedChange[]): ListItem {
  return failures.reduce(
    (current, failure) =>
      failure.kind === 'editItem' ? { ...current, ...failure.patch } : current,
    item,
  );
}

/**
 * Marca las filas con cambios sin guardar. Un ítem que el servidor no tiene (el nuevo que se rechazó,
 * o uno cuyo "deshacer" se rechazó) se agrega arriba de su sección; los demás quedan en su lugar,
 * con el valor que se quiso guardar.
 */
export function markFailures(
  split: { pending: ListItem[]; done: ListItem[] },
  failures: FailedChange[],
): { pending: ListRow[]; done: ListRow[] } {
  const itemFailures = failures.filter(isRowFailure);
  const rowOf = (item: ListItem): ListRow => {
    const mine = itemFailures.filter((failure) => failure.item.id === item.id);
    if (mine.length === 0) return { item };
    return {
      item: withAttempt(item, mine),
      error: `No se guardó: ${mine.map(rowReason).join(', ')}`,
    };
  };
  const present = new Set([...split.pending, ...split.done].map((item) => item.id));
  const missing = new Map<string, Extract<FailedChange, { item: ListItem }>[]>();
  for (const failure of itemFailures) {
    if (present.has(failure.item.id)) continue;
    missing.set(failure.item.id, [...(missing.get(failure.item.id) ?? []), failure]);
  }
  const absent = [...missing.values()].map((mine) => ({
    done: mine[0].item.done,
    row: {
      item: mine[0].item,
      error: `No se guardó: ${mine.map(rowReason).join(', ')}`,
      local: true,
    } satisfies ListRow,
  }));
  const absentIn = (done: boolean) =>
    absent.filter((entry) => entry.done === done).map((entry) => entry.row);
  return {
    pending: [...absentIn(false), ...split.pending.map(rowOf)],
    done: [...absentIn(true), ...split.done.map(rowOf)],
  };
}

const plural = (count: number) => (count === 1 ? '1 cambio' : `${count} cambios`);

/** Una línea por cada fallo que no se ve como fila (listas). */
function listLine(failure: FailedChange): string | undefined {
  switch (failure.kind) {
    case 'createList':
      return `No se creó «${failure.list.name}».`;
    case 'renameList':
      return `No se guardó el nombre «${failure.name}».`;
    case 'deleteList':
      return `No se eliminó «${failure.list.name}».`;
    default:
      return undefined;
  }
}

/** Título y texto del aviso rojo ("No pudimos guardar 2 cambios"). */
export function noticeCopy(failures: FailedChange[]): { title: string; message: string } {
  const lines = failures.flatMap((failure) => listLine(failure) ?? []);
  const marked = failures.some(isRowFailure);
  const message = [marked ? 'Siguen en tu celular, marcados abajo.' : undefined, ...lines]
    .filter(Boolean)
    .join(' ');
  return {
    title: `No pudimos guardar ${plural(failures.length)}`,
    message: `${message} Probá de nuevo.`,
  };
}
