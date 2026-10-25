import { openLoginError, useGoogleSignIn } from '../auth/useGoogleSignIn';
import { WelcomeScreen } from '../screens/WelcomeScreen';

export default function WelcomeRoute() {
  const signIn = useGoogleSignIn({ onError: openLoginError });
  return <WelcomeScreen onSignIn={signIn} />;
}
