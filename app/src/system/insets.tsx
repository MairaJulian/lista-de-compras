import { createContext, useContext, useEffect, useState } from 'react';
import { Dimensions, StatusBar } from 'react-native';

import { SystemInsets } from '../../modules/system-insets/src';

export type Insets = { top: number; bottom: number; left: number; right: number };

const fallback = (): Insets => ({
  top: StatusBar.currentHeight ?? 0,
  bottom: 0,
  left: 0,
  right: 0,
});

const InsetsContext = createContext<Insets>(fallback());

const MAX_ATTEMPTS = 20;
const RETRY_MS = 50;

/**
 * Márgenes seguros del sistema (barra de estado y de navegación de Android), en dp.
 * Los lee del módulo nativo local `system-insets`. Sin el módulo (tests) usa la altura de la barra de estado.
 */
export function InsetsProvider({ children }: { children: React.ReactNode }) {
  const [insets, setInsets] = useState<Insets>(fallback);

  useEffect(() => {
    const module = SystemInsets;
    if (!module) {
      return;
    }
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const read = () => {
      const value = module.getInsets();
      if (value) {
        setInsets((current) =>
          current.top === value.top &&
          current.bottom === value.bottom &&
          current.left === value.left &&
          current.right === value.right
            ? current
            : value,
        );
      } else if (attempts++ < MAX_ATTEMPTS) {
        // La ventana todavía no tiene márgenes (antes del primer layout): reintentar.
        timer = setTimeout(read, RETRY_MS);
      }
    };

    read();
    const subscription = Dimensions.addEventListener('change', () => {
      attempts = 0;
      read();
    });
    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, []);

  return <InsetsContext.Provider value={insets}>{children}</InsetsContext.Provider>;
}

export function useInsets() {
  return useContext(InsetsContext);
}
