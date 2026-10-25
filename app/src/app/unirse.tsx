import { JoinScreen } from '../screens/JoinScreen';
import { enterApp, goToWelcome } from '../navigation/session';

// Aquí llega el enlace de invitación (`changuito://unirse`).
export default function JoinRoute() {
  return <JoinScreen onJoin={enterApp} onDecline={goToWelcome} />;
}
