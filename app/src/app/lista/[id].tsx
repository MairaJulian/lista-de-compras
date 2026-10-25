import { router, useLocalSearchParams } from 'expo-router';

import { ListaScreen } from '../../screens/ListaScreen';

export default function ListaRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ListaScreen listId={id} onBack={() => router.back()} />;
}
