import { useRouter } from 'expo-router';

import { goToStart } from '../navigation/session';
import { LinkErrorScreen } from '../screens/ErrorScreens';

export default function LinkErrorRoute() {
  const router = useRouter();
  return <LinkErrorScreen onDismiss={goToStart} onEnterCode={() => router.replace('/codigo')} />;
}
