import { router, useLocalSearchParams } from 'expo-router';

import { goToStart } from '../navigation/session';
import { OfflineJoinErrorScreen } from '../screens/ErrorScreens';

export default function OfflineJoinErrorRoute() {
  // El código de la invitación, para volver a intentar con la misma.
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  return (
    <OfflineJoinErrorScreen
      onRetry={() => router.replace(codigo ? `/unirse/${codigo}` : '/unirse')}
      onDismiss={goToStart}
    />
  );
}
