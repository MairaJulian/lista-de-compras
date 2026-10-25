import { enterApp, goToInvite } from '../navigation/session';
import { HouseholdCreatedScreen } from '../screens/HouseholdCreatedScreen';

export default function HouseholdCreatedRoute() {
  return <HouseholdCreatedScreen onInvite={goToInvite} onLater={enterApp} />;
}
