import { router } from 'expo-router';

import { getMockState } from '../mock/store';

/** Cierra todo lo que haya abierto y deja `path` como única pantalla (entrar, cerrar sesión, salir del hogar). */
function resetTo(path: Parameters<typeof router.replace>[0]) {
  if (router.canDismiss()) {
    router.dismissAll();
  }
  router.replace(path);
}

/** Entra a la app dejando atrás Bienvenida o Unirse: a Listas, o a Sin hogar si todavía no tiene hogar. */
export function enterApp() {
  resetTo(getMockState().hasHousehold ? '/listas' : '/sin-hogar');
}

/** Vuelve a Bienvenida cerrando todo lo que haya abierto (cerrar sesión). */
export function goToWelcome() {
  resetTo('/');
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
