import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { useSession } from '../../auth/sessionStore';
import { TabBar } from '../../navigation/TabBar';
import { colors } from '../../theme';

/**
 * Pestañas Listas y Hogar. Atrás en Hogar vuelve a Listas; atrás en Listas cierra la app.
 * Sin hogar no hay listas que mostrar: va a Sin hogar.
 */
export default function TabsLayout() {
  const session = useSession();

  if (session.status === 'signedIn' && !session.hasHousehold) {
    return <Redirect href="/sin-hogar" />;
  }

  return (
    <Tabs
      backBehavior="initialRoute"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="listas" options={{ title: 'Listas' }} />
      <Tabs.Screen name="hogar" options={{ title: 'Hogar' }} />
    </Tabs>
  );
}
