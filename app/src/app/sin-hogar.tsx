import { useRouter, useLocalSearchParams } from 'expo-router';

import { useArchivedCount, useHousehold } from '../data/hooks';
import { NoHouseholdScreen } from '../screens/NoHouseholdScreen';

export default function NoHouseholdRoute() {
  const router = useRouter();
  // `?sacaron=<hogar>` muestra el aviso de que te sacaron de ese hogar. `?sacaron=1` (menú de
  // desarrollo) usa el nombre del hogar de ejemplo.
  const { sacaron, ya } = useLocalSearchParams<{ sacaron?: string; ya?: string }>();
  const household = useHousehold();
  const leftAll = ya === '1';
  const archivedCount = useArchivedCount(leftAll);

  return (
    <NoHouseholdScreen
      removedFrom={sacaron === '1' ? household.name : sacaron || undefined}
      leftAll={leftAll}
      archivedCount={archivedCount}
      onSeeArchived={() => router.push('/mis-grupos')}
      onCreate={() => router.push('/crear-hogar')}
      onEnterCode={() => router.push('/codigo')}
      onOpenProfile={() => router.push('/perfil')}
    />
  );
}
