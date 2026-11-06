import { useRouter } from 'expo-router';

import { useCreateHousehold } from '../data/hooks';
import { goToHouseholdCreated } from '../navigation/session';
import { CreateAnotherGroupScreen } from '../screens/CreateAnotherGroupScreen';

export default function CreateAnotherGroupRoute() {
  const router = useRouter();
  const createHousehold = useCreateHousehold();

  return (
    <CreateAnotherGroupScreen
      onBack={() => router.back()}
      onCreate={async (name, type) => {
        const created = await createHousehold(name, type);
        if (created) {
          goToHouseholdCreated();
        }
        return created;
      }}
    />
  );
}
