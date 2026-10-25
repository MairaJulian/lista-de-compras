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

export type ListSummary = {
  id: string;
  name: string;
  tone: ListTone;
  icon: IconName;
  pendingCount: number;
};
