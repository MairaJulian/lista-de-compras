import { useRouter, useLocalSearchParams } from 'expo-router';

import { ListaScreen } from '../../screens/ListaScreen';

export default function ListaRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ListaScreen listId={id} onBack={() => router.back()} />;
}
