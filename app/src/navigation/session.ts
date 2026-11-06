import { router, whenRouterReady } from './safeRouter';

import { startRoute } from '../auth/sessionState';
import { getSession } from '../auth/sessionStore';

/** Cierra todo lo que haya abierto y deja `path` como única pantalla (entrar, cerrar sesión, salir del hogar). */
function resetTo(path: Parameters<typeof router.replace>[0]) {
  whenRouterReady(() => {
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace(path);
  });
}

/**
 * Deja atrás lo que haya abierto (Unirse, errores, Hogar creado) y va a la pantalla de arranque de
 * la sesión: Bienvenida sin sesión, Sin hogar si no tiene hogar, Listas si lo tiene.
 */
export function goToStart() {
  const route = startRoute(getSession());
  if (route) resetTo(route);
}

/**
 * Después de salir del grupo o de que te saquen, sin ningún otro grupo activo: Sin grupo en su
 * variante "Ya no estás en ningún grupo" (`54`). Con otro grupo se va a Inicio con `goToStart`.
 */
export function goToNoHousehold() {
  resetTo({ pathname: '/sin-hogar', params: { ya: '1' } });
}

/** Cuando te quitaron del hogar: Sin hogar con el aviso `19` ("Ya no sos parte de <hogar>"). */
export function goToRemoved(householdName: string) {
  resetTo({
    pathname: '/sin-hogar',
    params: { sacaron: householdName || 'tu grupo', ya: '1' },
  });
}

/** Después de crear un hogar: Hogar creado, que ofrece invitar. */
export function goToHouseholdCreated() {
  resetTo('/hogar-creado');
}

/** "Invitar" de Hogar creado: queda Hogar debajo para que la flecha de Invitar vuelva ahí. */
export function goToInvite() {
  resetTo('/hogar');
  whenRouterReady(() => router.push('/invitar'));
}
