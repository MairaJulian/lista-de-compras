import { useLocalSearchParams, useRouter } from 'expo-router';

import { normalizeInviteCode } from '../data/joinLogic';
import { useJoinFlow } from '../navigation/useJoinFlow';
import { JoinWithCodeScreen } from '../screens/JoinWithCodeScreen';

export default function JoinWithCodeRoute() {
  const router = useRouter();
  const join = useJoinFlow();
  // `?otros=1`: quien ya está en otros grupos (`50-unirse-otro-grupo`).
  const { otros } = useLocalSearchParams<{ otros?: string }>();

  return (
    <JoinWithCodeScreen
      otherGroups={otros === '1'}
      onBack={() => router.back()}
      onJoin={async (code) => {
        const result = await join(code);
        if (result === 'offline') {
          router.push({
            pathname: '/error-sin-conexion',
            params: { codigo: normalizeInviteCode(code) },
          });
        }
        return result;
      }}
    />
  );
}
