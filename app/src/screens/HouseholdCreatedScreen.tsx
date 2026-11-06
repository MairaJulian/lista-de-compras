import { Button, IntroLayout, StatusCard } from '../components';
import { groupAppearance } from '../data/groupLogic';
import { useCurrentGroupType, useHousehold } from '../data/hooks';

type Props = {
  onInvite?: () => void;
  onLater?: () => void;
};

/** Hogar creado (`21-hogar-creado`): ofrece invitar ahora o más tarde. */
export function HouseholdCreatedScreen({ onInvite, onLater }: Props) {
  const household = useHousehold();
  const count = household.members.length;
  const look = groupAppearance(useCurrentGroupType());

  return (
    <IntroLayout
      heroHeight={430}
      hero={
        <StatusCard
          icon={look.icon}
          tone={look.tone === 'green' ? 'primary' : look.tone === 'neutral' ? 'blue' : look.tone}
          badge
          title={household.name}
          subtitle={count === 1 ? '1 miembro' : `${count} miembros`}
        />
      }
      title="¡Listo, grupo creado!"
      message="¿Querés invitar a alguien ahora? También podés hacerlo después desde Grupo."
    >
      <Button label="Invitar" icon="userPlus" large onPress={onInvite} />
      <Button label="Más tarde" variant="text" onPress={onLater} />
    </IntroLayout>
  );
}
