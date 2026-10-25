import { router } from 'expo-router';

import { startRoute } from '../auth/sessionState';
import { getSession } from '../auth/sessionStore';

/** Cierra todo lo que haya abierto y deja `path` como única pantalla (entrar, cerrar sesión, salir del hogar). */
function resetTo(path: Parameters<typeof router.replace>[0]) {
  if (router.canDismiss()) {
    router.dismissAll();
  }
  router.replace(path);
}

/**
 * Deja atrás lo que haya abierto (Unirse, errores, Hogar creado) y va a la pantalla de arranque de
 * la sesión: Bienvenida sin sesión, Sin hogar si no tiene hogar, Listas si lo tiene.
 */
export function goToStart() {
  const route = startRoute(getSession());
  if (route) resetTo(route);
}

/** Después de salir del hogar o de que te saquen. */
export function goToNoHousehold() {
  resetTo('/sin-hogar');
}

/** Después de crear un hogar: Hogar creado, que ofrece invitar. */
export function goToHouseholdCreated() {
  resetTo('/hogar-creado');
}

/** "Invitar" de Hogar creado: queda Hogar debajo para que la flecha de Invitar vuelva ahí. */
export function goToInvite() {
  resetTo('/hogar');
  router.push('/invitar');
}
