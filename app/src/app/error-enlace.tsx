import { router } from 'expo-router';

import { goToWelcome } from '../navigation/session';
import { LinkErrorScreen } from '../screens/ErrorScreens';

export default function LinkErrorRoute() {
  return <LinkErrorScreen onDismiss={goToWelcome} onEnterCode={() => router.replace('/codigo')} />;
}
