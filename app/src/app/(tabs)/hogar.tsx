import { useRouter } from 'expo-router';

import { goToNoHousehold } from '../../navigation/session';
import { HogarScreen } from '../../screens/HogarScreen';

export default function HogarRoute() {
  const router = useRouter();
  return (
    <HogarScreen
      onOpenGroups={() => router.push('/mis-grupos')}
      onOpenProfile={() => router.push('/perfil')}
      onInvite={() => router.push('/invitar')}
      onLeft={goToNoHousehold}
    />
  );
}
