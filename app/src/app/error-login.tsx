import { useGoogleSignIn } from '../auth/useGoogleSignIn';
import { goToStart } from '../navigation/session';
import { LoginErrorScreen } from '../screens/ErrorScreens';

export default function LoginErrorRoute() {
  const retry = useGoogleSignIn({ onCancelled: goToStart });
  return <LoginErrorScreen onRetry={retry} />;
}
