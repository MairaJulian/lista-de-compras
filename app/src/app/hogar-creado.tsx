import { goToInvite, goToStart } from '../navigation/session';
import { HouseholdCreatedScreen } from '../screens/HouseholdCreatedScreen';

export default function HouseholdCreatedRoute() {
  return <HouseholdCreatedScreen onInvite={goToInvite} onLater={goToStart} />;
}
