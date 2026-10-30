import type { AvatarTone, ListTone } from '../theme';
import type { IconName } from '../components';

export type MemberRole = 'creator' | 'member';

export type Member = {
  id: string;
  name: string;
  role: MemberRole;
  tone: AvatarTone;
};

export type Household = {
  id: string;
  name: string;
  members: Member[];
};

export type ListInfo = {
  id: string;
  name: string;
  tone: ListTone;
  icon: IconName;
  /** Lista eliminada (solo las reales; la app no la muestra pero detecta el cambio). */
  deleted?: boolean;
  /** Milisegundos de `creadaEn`, para ordenar las listas reales. */
  createdAt?: number;
};

export type ListSummary = ListInfo & {
  pendingCount: number;
};

export type ListItem = {
  id: string;
  listId: string;
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
  done: boolean;
  addedBy: string;
  /** Quién lo tildó; vacío mientras está pendiente. */
  doneBy?: string;
  /** Borrado (`borrado: true`): ya no se muestra ni se cuenta; "deshacer" lo restaura. */
  deleted?: boolean;
  /** Milisegundos de `agregadoEn`: ordena los pendientes (el nuevo arriba). */
  addedAt?: number;
  /** Milisegundos de `tildadoEn`: ordena los comprados (el último tildado arriba). */
  doneAt?: number;
  /** Cambio hecho sin conexión que todavía no se sincronizó. */
  pendingSync?: boolean;
};

export type Invite = {
  /** Código corto con el formato `K7P2-9XQ-4MN`. */
  code: string;
  hoursLeft: number;
  /** Falso cuando se desactivó o venció: el enlace y el código ya no sirven. */
  active: boolean;
};
