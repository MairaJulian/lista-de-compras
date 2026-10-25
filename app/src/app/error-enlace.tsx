import { router } from 'expo-router';

import { goToStart } from '../navigation/session';
import { LinkErrorScreen } from '../screens/ErrorScreens';

export default function LinkErrorRoute() {
  return <LinkErrorScreen onDismiss={goToStart} onEnterCode={() => router.replace('/codigo')} />;
}
