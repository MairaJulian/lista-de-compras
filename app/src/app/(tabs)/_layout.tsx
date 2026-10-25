import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '../../navigation/TabBar';
import { colors } from '../../theme';

/** Pestañas Listas y Hogar. Atrás en Hogar vuelve a Listas; atrás en Listas cierra la app. */
export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="initialRoute"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Listas' }} />
      <Tabs.Screen name="hogar" options={{ title: 'Hogar' }} />
    </Tabs>
  );
}
