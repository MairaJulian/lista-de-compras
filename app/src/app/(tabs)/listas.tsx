import { useRouter } from 'expo-router';

import { InicioScreen } from '../../screens/InicioScreen';

export default function InicioRoute() {
  const router = useRouter();
  return <InicioScreen onOpenList={(list) => router.push(`/lista/${list.id}`)} />;
}
