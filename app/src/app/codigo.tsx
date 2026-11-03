import { useRouter } from 'expo-router';

import { normalizeInviteCode } from '../data/joinLogic';
import { useJoinFlow } from '../navigation/useJoinFlow';
import { JoinWithCodeScreen } from '../screens/JoinWithCodeScreen';

export default function JoinWithCodeRoute() {
  const router = useRouter();
  const join = useJoinFlow();

  return (
    <JoinWithCodeScreen
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
