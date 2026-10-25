import type { Invite, Member } from './types';

/** Lógica pura del hogar y de las invitaciones. Nunca modifica los arreglos recibidos. */

/** Saca a un miembro del hogar. Solo quien creó el hogar puede hacerlo, y no puede sacarse a sí mismo. */
export function removeMember(members: Member[], memberId: string, byId: string): Member[] {
  const by = members.find((member) => member.id === byId);
  const target = members.find((member) => member.id === memberId);
  if (!by || by.role !== 'creator' || !target || target.id === byId) {
    return members;
  }
  return members.filter((member) => member.id !== memberId);
}

export type LeaveCase = 'common' | 'creator' | 'last';

/**
 * Qué aviso corresponde al salir del hogar: la persona que lo creó (el rol pasa a otro miembro), la
 * última que queda (el hogar se archiva) o un miembro común.
 */
export function leaveCase(members: Member[], byId: string): LeaveCase {
  if (members.length <= 1) {
    return 'last';
  }
  return members.find((member) => member.id === byId)?.role === 'creator' ? 'creator' : 'common';
}

/** Quién queda a cargo si sale quien creó el hogar: el primer miembro que no es quien sale. */
export function nextCreator(members: Member[], byId: string): Member | undefined {
  return members.find((member) => member.id !== byId);
}

/** Saca a `byId` del hogar; si era quien lo creó, el rol pasa a `nextCreator`. */
export function leaveHousehold(members: Member[], byId: string): Member[] {
  const successor = leaveCase(members, byId) === 'creator' ? nextCreator(members, byId) : undefined;
  return members
    .filter((member) => member.id !== byId)
    .map((member) => (member.id === successor?.id ? { ...member, role: 'creator' } : member));
}

/** Pasa al siguiente enlace de la lista de ejemplo (activo), como "Generar enlace nuevo". */
export function regenerateInvite(invites: Invite[], current: Invite): Invite {
  const index = invites.findIndex((invite) => invite.code === current.code);
  return { ...invites[(index + 1) % invites.length], active: true };
}

export function deactivateInvite(invite: Invite): Invite {
  return { ...invite, active: false };
}

export function formatExpiry(invite: Invite): string {
  return `Vence en ${invite.hoursLeft} h`;
}
