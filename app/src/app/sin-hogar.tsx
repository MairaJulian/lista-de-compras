import { router, useLocalSearchParams } from 'expo-router';

import { useHousehold } from '../data/hooks';
import { NoHouseholdScreen } from '../screens/NoHouseholdScreen';

export default function NoHouseholdRoute() {
  // `?sacaron=<hogar>` muestra el aviso de que te sacaron de ese hogar. `?sacaron=1` (menú de
  // desarrollo) usa el nombre del hogar de ejemplo.
  const { sacaron } = useLocalSearchParams<{ sacaron?: string }>();
  const household = useHousehold();

  return (
    <NoHouseholdScreen
      removedFrom={sacaron === '1' ? household.name : sacaron || undefined}
      onCreate={() => router.push('/crear-hogar')}
      onEnterCode={() => router.push('/codigo')}
      onOpenProfile={() => router.push('/perfil')}
    />
  );
}
