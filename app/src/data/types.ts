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
  done: boolean;
  addedBy: string;
  /** Quién lo tildó; vacío mientras está pendiente. */
  doneBy?: string;
  /** Cambio hecho sin conexión que todavía no se sincronizó. */
  pendingSync?: boolean;
};
