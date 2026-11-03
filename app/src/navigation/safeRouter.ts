import { router } from 'expo-router';

const RETRY_MS = 100;
const MAX_RETRIES = 30;

/**
 * Corre una navegación con el router imperativo de Expo Router y, si todavía no está listo, la
 * reintenta unos instantes después.
 *
 * El router imperativo (`import { router }`) se desengancha mientras el árbol de navegación se
 * vuelve a montar (por ejemplo, al cambiar el tamaño de letra del sistema con la app abierta) y
 * en ese lapso lanza "The imperative router is unavailable before the first render has finished".
 * Desde un componente usá siempre `useRouter()`, que no tiene este problema; esta función es solo
 * para código que no es un componente (`session.ts`, el login).
 */
export function whenRouterReady(action: () => void, retries = MAX_RETRIES): void {
  try {
    action();
  } catch (error) {
    if (!isRouterUnavailable(error) || retries <= 0) throw error;
    setTimeout(() => whenRouterReady(action, retries - 1), RETRY_MS);
  }
}

export function isRouterUnavailable(error: unknown): boolean {
  return error instanceof Error && error.message.includes('imperative router is unavailable');
}

export { router };
