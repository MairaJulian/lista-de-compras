import { router } from 'expo-router';

/** Entra a la app (Listas) dejando atrás Bienvenida o Unirse. */
export function enterApp() {
  router.replace('/listas');
}

/** Vuelve a Bienvenida cerrando todo lo que haya abierto (cerrar sesión, salir del hogar). */
export function goToWelcome() {
  if (router.canDismiss()) {
    router.dismissAll();
  }
  router.replace('/');
}
