import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';

export type TabName = 'inicio' | 'hogar';

type Navigation = {
  tab: TabName;
  switchTab: (tab: TabName) => void;
};

const NavigationContext = createContext<Navigation | null>(null);

/**
 * Navegación propia, sin librerías nativas (ver la PR): hoy solo las pestañas Listas y Hogar.
 * Las pantallas internas (Lista, Perfil, ...) se agregan como una pila encima de las pestañas en las PR 3 a 5.
 */
export function NavigationProvider({
  initialTab = 'inicio',
  children,
}: {
  initialTab?: TabName;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabName>(initialTab);

  const switchTab = useCallback((next: TabName) => setTab(next), []);

  // Atrás en Hogar vuelve a Listas; atrás en Listas cierra la app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tab !== 'inicio') {
        setTab('inicio');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [tab]);

  const value = useMemo(() => ({ tab, switchTab }), [tab, switchTab]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): Navigation {
  const navigation = useContext(NavigationContext);
  if (!navigation) {
    throw new Error('useNavigation tiene que usarse dentro de NavigationProvider');
  }
  return navigation;
}
