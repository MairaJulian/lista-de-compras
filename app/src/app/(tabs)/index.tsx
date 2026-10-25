import { router } from 'expo-router';

import { InicioScreen } from '../../screens/InicioScreen';

export default function InicioRoute() {
  return <InicioScreen onOpenList={(list) => router.push(`/lista/${list.id}`)} />;
}
