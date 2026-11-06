import { Redirect, useRouter } from 'expo-router';

import { isArchivingGroup, useCurrentGroupArchived } from '../../data/hooks';
import { InicioScreen } from '../../screens/InicioScreen';

export default function InicioRoute() {
  const router = useRouter();
  const archived = useCurrentGroupArchived();
  // Un grupo archivado se ve en solo lectura (`52`), no en Inicio.
  if (archived && !isArchivingGroup()) {
    return <Redirect href="/grupo-archivado" />;
  }
  return (
    <InicioScreen
      onOpenList={(list) => router.push(`/lista/${list.id}`)}
      onCreateGroup={() => router.push('/crear-otro-grupo')}
      onJoinGroup={() => router.push({ pathname: '/codigo', params: { otros: '1' } })}
      onSeeGroups={() => router.push('/mis-grupos')}
    />
  );
}
