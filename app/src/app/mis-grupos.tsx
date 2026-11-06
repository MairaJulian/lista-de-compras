import { useRouter } from 'expo-router';

import { useSwitchGroup } from '../data/hooks';
import { goToStart } from '../navigation/session';
import { MyGroupsScreen } from '../screens/MyGroupsScreen';

export default function MyGroupsRoute() {
  const router = useRouter();
  const switchGroup = useSwitchGroup();
  return (
    <MyGroupsScreen
      onBack={() => router.back()}
      onCreate={() => router.push('/crear-otro-grupo')}
      onJoin={() => router.push({ pathname: '/codigo', params: { otros: '1' } })}
      onOpened={goToStart}
      onOpenArchived={(group) => {
        switchGroup(group);
        router.push('/grupo-archivado');
      }}
    />
  );
}
