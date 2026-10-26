import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, CenteredDialog, IntroLayout, StatusCard } from '../components';
import { useAccount } from '../data/hooks';
import { heights, sizes } from '../theme';

type Props = {
  onCreate?: () => void;
  onEnterCode?: () => void;
  /** Lleva a Perfil (para cerrar sesión); sin esto no se muestra el avatar. */
  onOpenProfile?: () => void;
  /** Nombre del hogar del que sacaron a la persona; muestra el aviso `19-sin-hogar-te-sacaron`. */
  removedFrom?: string;
};

/** Sin hogar (`17-sin-hogar`), con el aviso de "te sacaron" encima (`19-sin-hogar-te-sacaron`). */
export function NoHouseholdScreen({ onCreate, onEnterCode, onOpenProfile, removedFrom }: Props) {
  const [noticeOpen, setNoticeOpen] = useState(!!removedFrom);
  const { member } = useAccount();
  const { top } = useSafeAreaInsets();

  return (
    <>
      <IntroLayout
        heroHeight={430}
        hero={
          <StatusCard
            icon="home"
            tone="dashed"
            title="Todavía sin hogar"
            subtitle="Acá van a aparecer sus listas"
          />
        }
        title="Armá tu hogar o sumate a uno."
        message="Un hogar es el grupo que comparte las listas de compras."
      >
        <Button label="Crear un hogar" icon="plus" large onPress={onCreate} />
        <Button
          label="Tengo un código de invitación"
          variant="secondary"
          large
          onPress={onEnterCode}
        />
      </IntroLayout>

      {onOpenProfile && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tu perfil"
          onPress={onOpenProfile}
          style={[styles.profile, { top: top + 30 }]}
        >
          <Avatar name={member.name} tone={member.tone} size={sizes.avatarMember} />
        </Pressable>
      )}

      <CenteredDialog
        visible={noticeOpen}
        icon="homeOff"
        title={`Ya no sos parte de ${removedFrom ?? ''}`}
        message="Ya no ves sus listas. Podés crear un hogar propio o unirte a otro con un código."
        onClose={() => setNoticeOpen(false)}
      >
        <Button label="Continuar" onPress={() => setNoticeOpen(false)} />
      </CenteredDialog>
    </>
  );
}

const styles = StyleSheet.create({
  // A la altura del logo, en la esquina derecha (como en Hogar).
  profile: {
    position: 'absolute',
    right: 24,
    width: heights.touchTarget,
    height: heights.touchTarget,
  },
});
