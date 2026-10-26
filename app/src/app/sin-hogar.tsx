import { router, useLocalSearchParams } from 'expo-router';

import { useHousehold } from '../data/hooks';
import { NoHouseholdScreen } from '../screens/NoHouseholdScreen';

export default function NoHouseholdRoute() {
  // `?sacaron=1` muestra el aviso de que te sacaron del hogar (todavía no hay quien lo dispare).
  const { sacaron } = useLocalSearchParams<{ sacaron?: string }>();
  const household = useHousehold();

  return (
    <NoHouseholdScreen
      removedFrom={sacaron ? household.name : undefined}
      onCreate={() => router.push('/crear-hogar')}
      onEnterCode={() => router.push('/codigo')}
      onOpenProfile={() => router.push('/perfil')}
    />
  );
}
