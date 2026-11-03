import { useRouter } from 'expo-router';

import { InviteScreen } from '../screens/InviteScreen';

export default function InviteRoute() {
  const router = useRouter();
  return <InviteScreen onBack={() => router.back()} />;
}
