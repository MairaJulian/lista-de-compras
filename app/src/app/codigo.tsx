import { router } from 'expo-router';

import { useJoinHousehold } from '../data/hooks';
import { goToStart } from '../navigation/session';
import { JoinWithCodeScreen } from '../screens/JoinWithCodeScreen';

export default function JoinWithCodeRoute() {
  const join = useJoinHousehold();

  // Por ahora cualquier código sirve; la validación llega con las invitaciones de la Etapa 3.
  return (
    <JoinWithCodeScreen
      onBack={() => router.back()}
      onJoin={() => {
        join();
        goToStart();
      }}
    />
  );
}
