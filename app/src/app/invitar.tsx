import { router } from 'expo-router';

import { InviteScreen } from '../screens/InviteScreen';

export default function InviteRoute() {
  return <InviteScreen onBack={() => router.back()} />;
}
