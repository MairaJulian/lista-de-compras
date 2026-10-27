import { avatarTones, type AvatarTone } from '../theme';

/** Lógica pura de unirse a un hogar con un código o un enlace de invitación. */

/** Cómo termina unirse: `invalid` es un código que no existe, venció o está revocado; `offline`, cualquier otra falla. */
export type JoinResult = 'joined' | 'invalid' | 'offline';

/** La invitación no existe, está revocada, venció o es de un hogar que ya no admite miembros. */
export class InviteInvalidError extends Error {
  constructor() {
    super('La invitación no existe, venció o fue desactivada.');
    this.name = 'InviteInvalidError';
  }
}

// Lo mismo que piden las reglas (`codigoValido`): letras, números y guiones, 10 o más sin contar guiones.
const CODE_PATTERN = /^[A-Z0-9-]{1,24}$/;
const MIN_CODE_CHARS = 10;
// Un código con su formato (`K7P2-9XQ-4MN`) dentro de un texto más largo (un mensaje o un enlace).
const FORMATTED_CODE = /[A-Z0-9]{4}-[A-Z0-9]{3}-[A-Z0-9]{3}/;

/** Si el texto puede ser un código: evita leer una ruta que no existe (por ejemplo con una `/`). */
export function isPlausibleCode(code: string): boolean {
  return CODE_PATTERN.test(code) && code.replace(/-/g, '').length >= MIN_CODE_CHARS;
}

/**
 * Código de invitación a partir de lo que escribió o pegó la persona: en mayúsculas y sin espacios.
 * Si pegó el mensaje o el enlace que se comparte, se queda con el código. Un código de 10
 * caracteres escrito sin guiones se formatea.
 */
export function normalizeInviteCode(text: string): string {
  const upper = text.toUpperCase();
  const inside = FORMATTED_CODE.exec(upper)?.[0];
  if (inside) {
    return inside;
  }
  const compact = upper.replace(/\s+/g, '');
  if (/^[A-Z0-9]{10}$/.test(compact)) {
    return `${compact.slice(0, 4)}-${compact.slice(4, 7)}-${compact.slice(7)}`;
  }
  return compact;
}

/** Cuál es el código de un enlace `changuito://unirse/<codigo>` (o del parámetro de la ruta). */
export function codeFromParam(param: string | string[] | undefined): string {
  const value = Array.isArray(param) ? param[0] : param;
  return normalizeInviteCode(value ?? '');
}

type InviteData = { estado?: unknown; venceEn?: unknown; hogarId?: unknown };

function expiryMillis(expiry: unknown): number | undefined {
  const toMillis = (expiry as { toMillis?: () => number } | null | undefined)?.toMillis;
  return typeof toMillis === 'function' ? toMillis.call(expiry) : undefined;
}

/** Si la invitación se puede usar ahora: está `activa`, no venció y dice de qué hogar es. */
export function isInviteUsable(data: InviteData | undefined, now: number): boolean {
  const expires = expiryMillis(data?.venceEn);
  return (
    data?.estado === 'activa' &&
    typeof data.hogarId === 'string' &&
    data.hogarId.length > 0 &&
    expires !== undefined &&
    expires > now
  );
}

const toneOrder = Object.keys(avatarTones) as AvatarTone[];

/**
 * Color de avatar de quien se une. Debería ser "el primer color no usado por miembros activos",
 * pero quien todavía no es miembro no puede leer a los demás (las reglas no lo dejan), así que se
 * reparte según el identificador de la persona: parejo y siempre el mismo para la misma persona.
 */
export function toneForUid(uid: string): AvatarTone {
  let hash = 0;
  for (const char of uid) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return toneOrder[hash % toneOrder.length];
}

/** Quién se une, tal como se guarda su copia en `miembros` (sin correo). */
export type JoiningProfile = { uid: string; name: string; photo: string | null };

/**
 * Documento de `miembros` de quien se une (o vuelve a unirse): rol `miembro`, activo, con la
 * invitación usada y quién la creó. `now` es la hora del servidor. Las reglas piden exactamente
 * estos campos.
 */
export function newJoinMember(
  profile: JoiningProfile,
  invite: { code: string; createdBy: string },
  now: unknown,
) {
  return {
    nombre: profile.name.trim() || 'Sin nombre',
    foto: profile.photo,
    colorAvatar: toneForUid(profile.uid),
    rol: 'miembro',
    estado: 'activo',
    desde: now,
    hasta: null,
    invitacionId: invite.code,
    invitadoPor: invite.createdBy,
  };
}

/**
 * Cómo se cuenta una falla al unirse. Un código que las reglas rechazan (`permission-denied`: por
 * ejemplo un hogar archivado) se ve igual que uno que no existe; el resto (sin conexión, servidor
 * no disponible) es "sin conexión".
 */
export function joinFailure(error: unknown): Exclude<JoinResult, 'joined'> {
  if (error instanceof InviteInvalidError) {
    return 'invalid';
  }
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && code.endsWith('permission-denied') ? 'invalid' : 'offline';
}
