import { getApp } from '@react-native-firebase/app';
import { initializeFirestore } from '@react-native-firebase/firestore';

/** Tamaño de la copia local de Firestore: 100 MB (es el valor por defecto del SDK, pero queda escrito a propósito). */
export const FIRESTORE_CACHE_BYTES = 100 * 1024 * 1024;

let configured = false;

/**
 * Deja la copia local de Firestore (persistencia en disco) activada y con tamaño definido. Hay que
 * llamarla una sola vez, al arrancar y antes de la primera lectura o escritura: en Android los
 * ajustes se aplican cuando se crea la instancia nativa, y las llamadas al módulo nativo salen en
 * orden, así que alcanza con llamarla antes de que se monte cualquier pantalla.
 */
export function configureFirestore(): void {
  if (configured) return;
  configured = true;
  try {
    initializeFirestore(getApp(), { persistence: true, cacheSizeBytes: FIRESTORE_CACHE_BYTES });
  } catch (error) {
    // Sin esto la app igual funciona con los valores por defecto del SDK (también con copia local).
    console.warn('No se pudo configurar la copia local de Firestore:', error);
  }
}
