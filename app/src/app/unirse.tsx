import { router } from 'expo-router';

import { useInvite, useJoinHousehold, useOnline } from '../data/hooks';
import { enterApp, goToWelcome } from '../navigation/session';
import { JoinScreen } from '../screens/JoinScreen';

// Aquí llega el enlace de invitación (`changuito://unirse`).
export default function JoinRoute() {
  const online = useOnline();
  const { invite } = useInvite();
  const join = useJoinHousehold();

  // Con los datos de ejemplo, el aviso de sin conexión sale cuando se pasó a "Sin conexión" en una
  // lista, y el de enlace inválido cuando se desactivó el enlace desde Invitar.
  const onJoin = () => {
    if (!online) {
      router.replace('/error-sin-conexion');
    } else if (!invite.active) {
      router.replace('/error-enlace');
    } else {
      join();
      enterApp();
    }
  };

  return <JoinScreen onJoin={onJoin} onDecline={goToWelcome} />;
}
