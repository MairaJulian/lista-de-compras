import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { useSession } from '../../auth/sessionStore';
import { isArchivingGroup, useCurrentGroupArchived } from '../../data/hooks';
import { LeaveUndoToast } from '../../navigation/LeaveUndoToast';
import { RemovedNotice } from '../../navigation/RemovedNotice';
import { TabBar } from '../../navigation/TabBar';
import { colors } from '../../theme';

/**
 * Pestañas Listas y Grupo. Atrás en Grupo vuelve a Listas; atrás en Listas cierra la app.
 * Sin hogar no hay listas que mostrar: va a Sin hogar.
 */
export default function TabsLayout() {
  const session = useSession();
  const archived = useCurrentGroupArchived();

  if (session.status === 'signedIn' && !session.hasHousehold) {
    return <Redirect href="/sin-hogar" />;
  }
  // Un grupo archivado se ve en solo lectura (`52`), no en las pestañas. Mientras se archiva desde
  // Grupo, se deja que el flujo lleve a Mis grupos (`51`).
  if (archived && !isArchivingGroup()) {
    return <Redirect href="/grupo-archivado" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        backBehavior="initialRoute"
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      >
        <Tabs.Screen name="listas" options={{ title: 'Listas' }} />
        <Tabs.Screen name="hogar" options={{ title: 'Grupo' }} />
      </Tabs>
      {/* "Ítems borrados · Deshacer" después de salir de una lista (Etapa 6). */}
      <LeaveUndoToast />
      {/* "Ya no sos parte de <grupo>" cuando te sacaron y te quedan otros grupos (`19`). */}
      <RemovedNotice />
    </View>
  );
}
