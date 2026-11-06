import { useRouter } from 'expo-router';

import { InicioScreen } from '../../screens/InicioScreen';

export default function InicioRoute() {
  const router = useRouter();
  return (
    <InicioScreen
      onOpenList={(list) => router.push(`/lista/${list.id}`)}
      onCreateGroup={() => router.push('/crear-otro-grupo')}
      onJoinGroup={() => router.push({ pathname: '/codigo', params: { otros: '1' } })}
      onSeeGroups={() => router.push('/mis-grupos')}
    />
  );
}
