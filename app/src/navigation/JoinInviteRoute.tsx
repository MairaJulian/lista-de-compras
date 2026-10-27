import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useSession } from '../auth/sessionStore';
import { useInvitePreview } from '../data/hooks';
import { setPendingInvite } from '../data/pendingInvite';
import { LoadingScreen } from '../screens/LoadingScreen';
import { JoinScreen } from '../screens/JoinScreen';
import { goToStart } from './session';
import { useJoinFlow } from './useJoinFlow';

/**
 * Invitación recibida con un enlace (`changuito://unirse/<codigo>`). Sin sesión no se puede leer la
 * invitación (las reglas piden sesión): se guarda el código, se va a Bienvenida y, cuando la persona
 * entra, la app vuelve acá. Con sesión se lee la invitación y se muestra el hogar y quién invitó.
 */
export function JoinInviteRoute({ code }: { code: string }) {
  const session = useSession();
  const signedOut = session.status === 'signedOut';
  const real = session.status === 'signedIn' && !session.demo;
  // Quien ya tiene un hogar no se une a otro con un enlace (no hay pantalla para eso): solo se mira al abrir.
  const [alreadyHasHousehold] = useState(
    real && session.status === 'signedIn' && session.hasHousehold,
  );
  const preview = useInvitePreview(code);
  const join = useJoinFlow();
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (signedOut) {
      if (code) setPendingInvite(code);
      router.replace('/');
    } else if (alreadyHasHousehold) {
      goToStart();
    }
  }, [signedOut, alreadyHasHousehold, code]);

  if (signedOut || alreadyHasHousehold) {
    return <LoadingScreen />;
  }
  if (preview.status === 'loading') {
    return <LoadingScreen />;
  }
  if (preview.status === 'invalid') {
    return <Redirect href="/error-enlace" />;
  }
  if (preview.status === 'offline') {
    return <Redirect href={{ pathname: '/error-sin-conexion', params: { codigo: code } }} />;
  }

  const onJoin = async () => {
    setJoining(true);
    const result = await join(code);
    if (result === 'invalid') {
      router.replace('/error-enlace');
    } else if (result === 'offline') {
      router.replace({ pathname: '/error-sin-conexion', params: { codigo: code } });
    }
    // Al unirse la pantalla cambia sola cuando la sesión sabe del hogar: queda en "Uniéndome…".
  };

  return (
    <JoinScreen
      householdName={preview.householdName}
      detail={preview.detail}
      signedIn={real}
      joining={joining}
      onJoin={onJoin}
      onDecline={goToStart}
    />
  );
}
