import { useCallback, useEffect, useState } from 'react';

import { useSession } from '../auth/sessionStore';
import { useJoinHousehold } from '../data/hooks';
import type { JoinResult } from '../data/joinLogic';
import { goToStart } from './session';

/** Si la sesión no cambia de grupo (se unió a uno en el que ya estaba), a Inicio igual al rato. */
const SAME_GROUP_DELAY_MS = 3000;

/**
 * Unirse y, cuando la sesión ya sabe del grupo nuevo (`hogarActualId` llega por la lectura en
 * tiempo real del documento de la persona), ir a Inicio. No se navega antes: Inicio todavía vería
 * "sin grupo" (o el grupo anterior) y volvería atrás. Quien ya estaba en otro grupo espera a que
 * cambie el `hogarActualId`, no solo a que tenga alguno. Devuelve cómo terminó; el error lo muestra
 * quien llama.
 */
export function useJoinFlow(): (code?: string) => Promise<JoinResult> {
  const session = useSession();
  const join = useJoinHousehold();
  // Desde qué grupo se unió (`null` si no tenía ninguno); `undefined` mientras no se unió.
  const [joinedFrom, setJoinedFrom] = useState<string | null>();
  const hasHousehold = session.status === 'signedIn' && session.hasHousehold;
  const householdId = session.status === 'signedIn' ? session.householdId : null;
  const demo = session.status === 'signedIn' && session.demo;
  const joined = joinedFrom !== undefined;
  const changed = demo || householdId !== joinedFrom;

  useEffect(() => {
    if (joined && hasHousehold && changed) goToStart();
  }, [joined, hasHousehold, changed]);

  useEffect(() => {
    if (!joined || changed || joinedFrom === null) return;
    const timer = setTimeout(goToStart, SAME_GROUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [joined, changed, joinedFrom]);

  return useCallback(
    async (code) => {
      const result = await join(code);
      if (result === 'joined') setJoinedFrom(householdId);
      return result;
    },
    [join, householdId],
  );
}
