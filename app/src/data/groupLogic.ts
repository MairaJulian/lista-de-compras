import type { IconName } from '../components';
import type { GroupType } from './householdLogic';
import type { MemberRole } from './types';

/** Lógica pura de "mis grupos": lista, aspecto por tipo, límite y textos de los renglones. */

/** Máximo de grupos activos por persona (límite blando de la app: las reglas no pueden contar). */
export const MAX_ACTIVE_GROUPS = 10;

/** Un grupo de la persona, tal como lo muestran el panel "Tus grupos" (`47`) y "Mis grupos" (`48`). */
export type GroupSummary = {
  id: string;
  name: string;
  type: GroupType;
  archived: boolean;
  /** Milisegundos de `archivadoEn`, si se conoce. */
  archivedAt?: number;
  role: MemberRole;
  /** Milisegundos de `desde` (cuándo entró la persona): ordena la lista. */
  since?: number;
  /** Miembros activos; `undefined` si no se pudo leer. */
  memberCount?: number;
  /** Ítems pendientes; `undefined` si no se pudo leer o no se pide. */
  pendingCount?: number;
};

export type GroupTone = 'green' | 'blue' | 'amber' | 'neutral';

/** Ícono y color de un grupo: salen del tipo; un grupo archivado se ve neutro. */
export function groupAppearance(
  type: GroupType,
  archived = false,
): { icon: IconName; tone: GroupTone } {
  if (archived) return { icon: 'archive', tone: 'neutral' };
  switch (type) {
    case 'amigos':
      return { icon: 'users', tone: 'blue' };
    case 'evento':
      return { icon: 'gift', tone: 'amber' };
    default:
      return { icon: 'home', tone: 'green' };
  }
}

export const GROUP_TYPES: { type: GroupType; label: string }[] = [
  { type: 'familia', label: 'Familia' },
  { type: 'amigos', label: 'Amigos' },
  { type: 'evento', label: 'Evento' },
];

/** Del que lleva más tiempo en él al más nuevo; a igual fecha, por nombre. */
export function sortGroups(groups: GroupSummary[]): GroupSummary[] {
  return [...groups].sort((a, b) => {
    const bySince = (a.since ?? Infinity) - (b.since ?? Infinity);
    return Number.isNaN(bySince) || bySince === 0 ? a.name.localeCompare(b.name, 'es-AR') : bySince;
  });
}

export function splitGroups(groups: GroupSummary[]): {
  active: GroupSummary[];
  archived: GroupSummary[];
} {
  const sorted = sortGroups(groups);
  return {
    active: sorted.filter((group) => !group.archived),
    archived: sorted.filter((group) => group.archived),
  };
}

/** Si ya tiene el máximo de grupos activos (los archivados no cuentan). */
export function reachedGroupLimit(groups: GroupSummary[]): boolean {
  return groups.filter((group) => !group.archived).length >= MAX_ACTIVE_GROUPS;
}

export const GROUP_LIMIT_MESSAGE = `Ya estás en ${MAX_ACTIVE_GROUPS} grupos activos. Salí de alguno o archivá uno para sumar otro.`;

export function membersLabel(count: number): string {
  return count === 1 ? '1 miembro' : `${count} miembros`;
}

export function pendingLabel(count: number): string {
  if (count === 0) return 'sin pendientes';
  return count === 1 ? '1 pendiente' : `${count} pendientes`;
}

/** "3 miembros · 7 pendientes" (`47`); lo que no se pudo leer no se muestra. */
export function groupCountsLabel(group: GroupSummary): string {
  return [
    group.memberCount === undefined ? undefined : membersLabel(group.memberCount),
    group.pendingCount === undefined ? undefined : pendingLabel(group.pendingCount),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "Creaste el grupo · 3 miembros" o "Miembro · 5 miembros" (`48`). */
export function groupRoleLabel(group: GroupSummary): string {
  const role = group.role === 'creator' ? 'Creaste el grupo' : 'Miembro';
  return group.memberCount === undefined ? role : `${role} · ${membersLabel(group.memberCount)}`;
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** "Archivado el 12 de agosto · solo lectura" (`48`). */
export function archivedLabel(archivedAt: number | undefined): string {
  if (archivedAt === undefined) return 'Archivado · solo lectura';
  const date = new Date(archivedAt);
  return `Archivado el ${date.getDate()} de ${MONTHS[date.getMonth()]} · solo lectura`;
}

/** Pone en el grupo actual los datos en vivo (miembros y pendientes), para no volver a leerlos. */
export function withLiveCounts(
  groups: GroupSummary[],
  currentId: string | null,
  live: { memberCount: number; pendingCount: number } | undefined,
): GroupSummary[] {
  if (!currentId || !live) return groups;
  return groups.map((group) => (group.id === currentId ? { ...group, ...live } : group));
}
