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
