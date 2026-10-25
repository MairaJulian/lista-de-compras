import { router } from 'expo-router';

import { goToWelcome } from '../../navigation/session';
import { HogarScreen } from '../../screens/HogarScreen';

export default function HogarRoute() {
  return (
    <HogarScreen
      onOpenProfile={() => router.push('/perfil')}
      onInvite={() => router.push('/invitar')}
      onLeft={goToWelcome}
    />
  );
}
