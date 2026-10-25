import { useGoogleSignIn } from '../auth/useGoogleSignIn';
import { goToWelcome } from '../navigation/session';
import { LoginErrorScreen } from '../screens/ErrorScreens';

export default function LoginErrorRoute() {
  const retry = useGoogleSignIn({ onCancelled: goToWelcome });
  return <LoginErrorScreen onRetry={retry} />;
}
