import { avatarTones, listTones, type AvatarTone, type ListTone } from '../theme';
import type { ListInfo, ListItem, Member } from './types';

/** De documentos de `listas`, `items` y `miembros` (nombres de campos tal cual `ESQUEMA-DATOS.md`) a los tipos de la app. */

const avatarToneOrder = Object.keys(avatarTones) as AvatarTone[];
const listToneOrder = Object.keys(listTones) as ListTone[];

type Data = Record<string, unknown> | undefined;

/**
 * Milisegundos de un `Timestamp` de Firestore. Mientras la escritura espera al servidor la hora es
 * una estimación del celular (`serverTimestamps: 'estimate'` al leer); si aun así no hubiera hora, se
 * toma "ahora" para que un ítem recién agregado aparezca arriba al instante.
 */
export function timestampMillis(value: unknown, now: number = Date.now()): number {
  const toMillis = (value as { toMillis?: () => number } | null | undefined)?.toMillis;
  return typeof toMillis === 'function' ? toMillis.call(value) : now;
}

/** Lista de la app a partir de su documento; `undefined` si le faltan el nombre o el color. */
export function listFromDocument(id: string, data: Data, now?: number): ListInfo | undefined {
  const tone = listToneOrder.find((candidate) => candidate === data?.color);
  if (typeof data?.nombre !== 'string' || !tone) {
    return undefined;
  }
  return {
    id,
    name: data.nombre,
    tone,
    icon: 'list',
    deleted: data.eliminada === true,
    deletedBy: typeof data.eliminadaPor === 'string' ? data.eliminadaPor : undefined,
    createdAt: timestampMillis(data.creadaEn, now),
  };
}

/** Ítem de la app a partir de su documento; `undefined` si le faltan la lista, el nombre o quién lo agregó. */
export function itemFromDocument(id: string, data: Data, now?: number): ListItem | undefined {
  if (
    typeof data?.listaId !== 'string' ||
    typeof data.nombre !== 'string' ||
    typeof data.agregadoPor !== 'string'
  ) {
    return undefined;
  }
  const done = data.comprado === true;
  return {
    id,
    listId: data.listaId,
    name: data.nombre,
    // Ausente significa 1 (ver `ESQUEMA-DATOS.md`).
    quantity: typeof data.cantidad === 'number' ? data.cantidad : undefined,
    unit: typeof data.unidad === 'string' && data.unidad ? data.unidad : undefined,
    note: typeof data.nota === 'string' && data.nota ? data.nota : undefined,
    done,
    addedBy: data.agregadoPor,
    addedAt: timestampMillis(data.agregadoEn, now),
    doneBy: done && typeof data.tildadoPor === 'string' ? data.tildadoPor : undefined,
    doneAt: done ? timestampMillis(data.tildadoEn, now) : undefined,
    deleted: data.borrado === true,
  };
}

/**
 * Miembro de cualquier estado: quienes salieron o fueron quitados siguen teniendo avatar y nombre en
 * sus ítems viejos.
 */
export function anyMemberFromDocument(id: string, data: Data): Member {
  const tone = avatarToneOrder.find((candidate) => candidate === data?.colorAvatar);
  return {
    id,
    name: typeof data?.nombre === 'string' ? data.nombre : '',
    role: data?.rol === 'creador' ? 'creator' : 'member',
    tone: tone ?? avatarToneOrder[0],
  };
}

/** Quién es `memberId` para el avatar; si no se conoce (todavía no llegó, o no existe) un genérico. */
export function memberOrFallback(members: Member[], memberId: string): Member {
  return (
    members.find((member) => member.id === memberId) ?? {
      id: memberId,
      name: 'Alguien',
      role: 'member',
      tone: avatarToneOrder[0],
    }
  );
}
