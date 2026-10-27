// Código de una invitación que se abrió sin sesión: se conserva mientras la persona entra con Google
// y se retoma al abrirse la sesión. Solo en memoria: nada de esto se guarda en el celular.

let pending: string | undefined;

export function setPendingInvite(code: string) {
  pending = code;
}

/** Devuelve el código guardado (si hay) y lo borra: se retoma una sola vez. */
export function takePendingInvite(): string | undefined {
  const code = pending;
  pending = undefined;
  return code;
}

/** Descarta el código guardado (para los tests). */
export function clearPendingInvite() {
  pending = undefined;
}
