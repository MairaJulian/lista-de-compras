import { WelcomeScreen } from '../screens/WelcomeScreen';
import { enterApp } from '../navigation/session';

export default function WelcomeRoute() {
  return <WelcomeScreen onSignIn={enterApp} />;
}
