import { router } from 'expo-router';

import { goToWelcome } from '../navigation/session';
import { OfflineJoinErrorScreen } from '../screens/ErrorScreens';

export default function OfflineJoinErrorRoute() {
  return (
    <OfflineJoinErrorScreen onRetry={() => router.replace('/unirse')} onDismiss={goToWelcome} />
  );
}
