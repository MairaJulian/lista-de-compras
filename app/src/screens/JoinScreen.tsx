import { StyleSheet, Text, View } from 'react-native';

import { Button, GoogleButton, Icon, IntroLayout } from '../components';
import { useHousehold, useLists } from '../data/hooks';
import { colors, fontSizes, fonts, radii } from '../theme';

type Props = {
  onJoin?: () => void;
  onDecline?: () => void;
};

/** Unirse (`02-invitacion-recibida`): lo que ve quien abre el enlace de invitación. */
export function JoinScreen({ onJoin, onDecline }: Props) {
  const household = useHousehold();
  const lists = useLists();
  const members = household.members.length;

  return (
    <IntroLayout
      heroHeight={430}
      hero={
        <View style={styles.hero}>
          <View style={styles.card}>
            <View style={styles.icon}>
              <Icon name="home" size={36} color={colors.onPrimary} />
            </View>
            <Text style={styles.name}>{household.name}</Text>
            <Text style={styles.count}>
              {members === 1 ? '1 miembro' : `${members} miembros`} ·{' '}
              {lists.length === 1 ? '1 lista' : `${lists.length} listas`}
            </Text>
          </View>
        </View>
      }
      title="Te invitaron a unirte al hogar."
      message="Entrá con tu cuenta de Google para ver y editar las listas de compras junto con los demás."
    >
      <GoogleButton label="Entrar y unirme" onPress={onJoin} />
      <Button label="Ahora no" variant="text" onPress={onDecline} />
    </IntroLayout>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'absolute', top: 160, left: 0, right: 0, alignItems: 'center' },
  card: {
    width: 300,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    elevation: 8,
  },
  icon: {
    width: 72,
    height: 72,
    marginBottom: 4,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 26, color: colors.textPrimary },
  count: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textSecondary },
});
