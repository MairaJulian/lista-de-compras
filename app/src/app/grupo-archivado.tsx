import { useRouter } from 'expo-router';

import { ArchivedGroupScreen } from '../screens/ArchivedGroupScreen';

export default function ArchivedGroupRoute() {
  const router = useRouter();
  return (
    <ArchivedGroupScreen
      // Si la app se abrió directo en un grupo archivado no hay pantalla atrás: va a Mis grupos.
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/mis-grupos'))}
      onUnarchived={() => router.replace('/mis-grupos')}
    />
  );
}
