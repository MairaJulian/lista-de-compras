import { Button, IntroLayout, StatusCard } from '../components';
import { useHousehold } from '../data/hooks';

type Props = {
  onInvite?: () => void;
  onLater?: () => void;
};

/** Hogar creado (`21-hogar-creado`): ofrece invitar ahora o más tarde. */
export function HouseholdCreatedScreen({ onInvite, onLater }: Props) {
  const household = useHousehold();
  const count = household.members.length;

  return (
    <IntroLayout
      heroHeight={430}
      hero={
        <StatusCard
          icon="home"
          tone="primary"
          badge
          title={household.name}
          subtitle={count === 1 ? '1 miembro' : `${count} miembros`}
        />
      }
      title="¡Listo, ya tenés hogar!"
      message="¿Querés invitar a alguien ahora? También podés hacerlo después desde Hogar."
    >
      <Button label="Invitar" icon="userPlus" large onPress={onInvite} />
      <Button label="Más tarde" variant="text" onPress={onLater} />
    </IntroLayout>
  );
}
