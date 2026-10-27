import { useCallback, useEffect, useState } from 'react';

import { useSession } from '../auth/sessionStore';
import { useJoinHousehold } from '../data/hooks';
import type { JoinResult } from '../data/joinLogic';
import { goToStart } from './session';

/**
 * Unirse y, cuando la sesión ya sabe del hogar nuevo (`hogarActualId` llega por la lectura en
 * tiempo real del documento de la persona), ir a Inicio. No se navega antes: Inicio todavía vería
 * "sin hogar" y volvería a Sin hogar. Devuelve cómo terminó; el error lo muestra quien llama.
 */
export function useJoinFlow(): (code?: string) => Promise<JoinResult> {
  const session = useSession();
  const join = useJoinHousehold();
  const [joined, setJoined] = useState(false);
  const hasHousehold = session.status === 'signedIn' && session.hasHousehold;

  useEffect(() => {
    if (joined && hasHousehold) goToStart();
  }, [joined, hasHousehold]);

  return useCallback(
    async (code) => {
      const result = await join(code);
      if (result === 'joined') setJoined(true);
      return result;
    },
    [join],
  );
}
