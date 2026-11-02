import { useWindowDimensions } from 'react-native';

/** Desde cuánto se considera "letra grande" (ajuste de tamaño de fuente de Android) para cambiar la disposición. */
export const LARGE_TEXT_SCALE = 1.15;

/** Tope de agrandado para elementos que no pueden crecer sin romperse (por ejemplo la barra inferior). */
export const MAX_FONT_SCALE_FIXED = 1.3;

/** `true` si la persona usa la letra del sistema bastante más grande que lo normal. */
export function useLargeText(): boolean {
  return useWindowDimensions().fontScale >= LARGE_TEXT_SCALE;
}
