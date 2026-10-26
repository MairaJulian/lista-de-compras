import { router } from 'expo-router';

import { useCreateHousehold } from '../data/hooks';
import { goToHouseholdCreated } from '../navigation/session';
import { CreateHouseholdScreen } from '../screens/CreateHouseholdScreen';

export default function CreateHouseholdRoute() {
  const createHousehold = useCreateHousehold();

  return (
    <CreateHouseholdScreen
      onBack={() => router.back()}
      onDismiss={() => router.back()}
      onCreate={async (name) => {
        const created = await createHousehold(name);
        if (created) {
          goToHouseholdCreated();
        }
        return created;
      }}
    />
  );
}
