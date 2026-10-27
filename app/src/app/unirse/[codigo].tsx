import { useLocalSearchParams } from 'expo-router';

import { codeFromParam } from '../../data/joinLogic';
import { JoinInviteRoute } from '../../navigation/JoinInviteRoute';

// Aquí llega el enlace de invitación (`changuito://unirse/<codigo>`).
export default function JoinWithLinkRoute() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  return <JoinInviteRoute code={codeFromParam(codigo)} />;
}
