import { router } from 'expo-router';

import { goToWelcome } from '../navigation/session';
import { ProfileScreen } from '../screens/ProfileScreen';

export default function ProfileRoute() {
  return <ProfileScreen onBack={() => router.back()} onSignOut={goToWelcome} />;
}
