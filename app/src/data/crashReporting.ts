import {
  crash,
  getCrashlytics,
  log,
  setCrashlyticsCollectionEnabled,
  setUserId,
} from '@react-native-firebase/crashlytics';

/**
 * Registro automático de cierres inesperados (Crashlytics, gratis en el plan Spark).
 * Solo se envían los errores y el uid de la cuenta: no se registra el contenido de las listas,
 * nombres ni correos, y no se escriben mensajes con `log`.
 */
export function startCrashReporting(): void {
  // Los errores de JavaScript no atrapados los captura el propio módulo al cargarse.
  setCrashlyticsCollectionEnabled(getCrashlytics(), true).catch(() => {
    // Si falla, la app sigue igual: el registro de fallos nunca debe romper el arranque.
  });
}

/** Asocia los fallos con el uid de la persona (o lo quita al cerrar sesión). */
export function setCrashReportingUser(uid: string | null): void {
  setUserId(getCrashlytics(), uid ?? '').catch(() => {});
}

/** Solo para el menú de desarrollo: provoca un cierre para ver el aviso en la consola de Firebase. */
export function triggerTestCrash(): void {
  log(getCrashlytics(), 'Fallo de prueba');
  crash(getCrashlytics());
}
