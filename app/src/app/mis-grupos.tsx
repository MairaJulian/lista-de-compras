import { useRouter } from 'expo-router';

import { goToStart } from '../navigation/session';
import { MyGroupsScreen } from '../screens/MyGroupsScreen';

export default function MyGroupsRoute() {
  const router = useRouter();
  return (
    <MyGroupsScreen
      onBack={() => router.back()}
      onCreate={() => router.push('/crear-otro-grupo')}
      onJoin={() => router.push({ pathname: '/codigo', params: { otros: '1' } })}
      onOpened={goToStart}
    />
  );
}
