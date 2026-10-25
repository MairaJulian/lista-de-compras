import { enterApp } from '../navigation/session';
import { LoginErrorScreen } from '../screens/ErrorScreens';

// Todavía no hay inicio de sesión real: se llega desde el menú DEV.
export default function LoginErrorRoute() {
  return <LoginErrorScreen onRetry={enterApp} />;
}
