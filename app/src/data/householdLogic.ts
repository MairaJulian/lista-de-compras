import { avatarTones, type AvatarTone } from '../theme';
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

// ---- Documentos de Firestore (nombres de campos tal cual `ESQUEMA-DATOS.md`) ----

/** Quién crea el hogar, tal como se guarda su copia en `miembros` (sin correo). */
export type HouseholdProfile = { uid: string; name: string; photo: string | null };

export const MAX_HOUSEHOLD_NAME = 60;

const avatarToneOrder = Object.keys(avatarTones) as AvatarTone[];

/** Nombre del hogar listo para guardar, o `undefined` si queda vacío o demasiado largo. */
export function cleanHouseholdName(name: string): string | undefined {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_HOUSEHOLD_NAME ? trimmed : undefined;
}

/**
 * Los dos documentos que se crean juntos al armar un hogar: el hogar y el miembro creador (que lo
 * deja listo para las reglas, que lo verifican con `getAfter`). `now` es la hora del servidor.
 */
export function newHouseholdDocuments(profile: HouseholdProfile, name: string, now: unknown) {
  return {
    household: {
      nombre: name,
      creadoPor: profile.uid,
      creadoEn: now,
      invitacionActivaId: null,
      creadorActualId: profile.uid,
    },
    member: {
      // Las reglas piden un nombre con texto; si la cuenta de Google no trae uno, se usa este.
      nombre: profile.name.trim() || 'Sin nombre',
      foto: profile.photo,
      // El primer color: en un hogar nuevo no hay otros miembros activos.
      colorAvatar: avatarToneOrder[0],
      rol: 'creador',
      estado: 'activo',
      desde: now,
      hasta: null,
      invitacionId: null,
      invitadoPor: null,
    },
  };
}

type MemberDocument = { nombre?: unknown; rol?: unknown; estado?: unknown; colorAvatar?: unknown };

/** Miembro de la app a partir de su documento en `miembros`; `undefined` si no existe o no está activo. */
export function memberFromDocument(
  uid: string,
  data: MemberDocument | undefined,
): Member | undefined {
  if (!data || data.estado !== 'activo') {
    return undefined;
  }
  const tone = avatarToneOrder.find((candidate) => candidate === data.colorAvatar);
  return {
    id: uid,
    name: typeof data.nombre === 'string' ? data.nombre : '',
    role: data.rol === 'creador' ? 'creator' : 'member',
    tone: tone ?? avatarToneOrder[0],
  };
}
