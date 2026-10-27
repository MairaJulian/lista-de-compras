import type { Invite } from './types';

/** Lógica pura de las invitaciones reales (códigos, vencimiento, mensaje para compartir). */

/** Cuánto dura una invitación. Las reglas aceptan hasta 48 h + 5 min por diferencias de reloj. */
export const INVITE_HOURS = 48;

const HOUR_MS = 60 * 60 * 1000;

// Sin 0/O ni 1/I/L, que se confunden al leerlos. 31 caracteres.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const GROUPS = [4, 3, 3];

/**
 * Código con el formato `K7P2-9XQ-4MN` (10 caracteres sin contar guiones). `randomBytes` tiene que
 * ser una fuente criptográfica. Se descartan los bytes que darían un reparto desparejo entre los
 * caracteres (256 no es múltiplo de 31).
 */
export function generateInviteCode(randomBytes: (length: number) => Uint8Array): string {
  const total = GROUPS.reduce((sum, size) => sum + size, 0);
  const limit = 256 - (256 % ALPHABET.length);
  const chars: string[] = [];
  while (chars.length < total) {
    for (const byte of randomBytes(total * 2)) {
      if (byte < limit && chars.length < total) {
        chars.push(ALPHABET[byte % ALPHABET.length]);
      }
    }
  }
  let start = 0;
  return GROUPS.map((size) => {
    const group = chars.slice(start, start + size).join('');
    start += size;
    return group;
  }).join('-');
}

/** Vencimiento de una invitación creada en `now`. */
export function inviteExpiry(now: number): number {
  return now + INVITE_HOURS * HOUR_MS;
}

type InviteDocument = { estado?: unknown; venceEn?: unknown };

function expiryMillis(expiry: unknown): number | undefined {
  const toMillis = (expiry as { toMillis?: () => number } | null | undefined)?.toMillis;
  return typeof toMillis === 'function' ? toMillis.call(expiry) : undefined;
}

/**
 * Invitación de la app a partir de su documento. Está activa solo si su estado es `activa` y todavía
 * no venció; si no, el enlace y el código ya no sirven. Las horas se redondean hacia arriba.
 */
export function inviteFromDocument(
  code: string,
  data: InviteDocument | undefined,
  now: number,
): Invite {
  const expires = expiryMillis(data?.venceEn);
  const remaining = expires === undefined ? 0 : expires - now;
  const active = data?.estado === 'activa' && remaining > 0;
  return { code, hoursLeft: active ? Math.ceil(remaining / HOUR_MS) : 0, active };
}

/** Enlace que abre la app en la pantalla de invitación. En el PR 7 pasa a ser el de la página puente. */
export function inviteLink(code: string): string {
  return `changuito://unirse/${code}`;
}

/** Mensaje que se comparte: el código, por si el enlace no se puede tocar, y el enlace. */
export function inviteMessage(householdName: string, code: string): string {
  return `Sumate a ${householdName} en Changuito.\nCódigo: ${code}\nEnlace: ${inviteLink(code)}`;
}
