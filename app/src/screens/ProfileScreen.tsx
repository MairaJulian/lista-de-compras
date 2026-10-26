import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Icon, ScreenHeader } from '../components';
import { useAccount, useHasHousehold, useHousehold } from '../data/hooks';
import { colors, fontSizes, fonts, radii } from '../theme';

type Props = {
  onBack?: () => void;
  onSignOut?: () => void;
};

/** Perfil (`16-perfil`): avatar, nombre, cuenta de Google, hogar actual y "Cerrar sesión". */
export function ProfileScreen({ onBack, onSignOut }: Props) {
  const { member, email } = useAccount();
  const household = useHousehold();
  const hasHousehold = useHasHousehold();
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Perfil"
        backLabel={hasHousehold ? 'Volver a Hogar' : 'Volver'}
        onBack={onBack}
      />

      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Avatar name={member.name} tone={member.tone} size={96} />
        </View>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      {hasHousehold && (
        <View style={styles.householdCard}>
          <View style={styles.householdIcon}>
            <Icon name="home" color={colors.primary} />
          </View>
          <View>
            <Text style={styles.householdLabel}>Hogar</Text>
            <Text style={styles.householdName}>{household.name}</Text>
          </View>
        </View>
      )}

      <View style={styles.spacer} />

      <View style={[styles.action, { paddingBottom: 40 + bottom }]}>
        <Button label="Cerrar sesión" variant="danger" large onPress={onSignOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  identity: { paddingTop: 48, paddingHorizontal: 32, alignItems: 'center', gap: 6 },
  avatar: { marginBottom: 10 },
  name: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 31, color: colors.textPrimary },
  email: { fontFamily: fonts.body, fontSize: fontSizes.body, color: colors.textSecondary },
  householdCard: {
    marginHorizontal: 24,
    marginTop: 32,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: radii.group,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  householdIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  householdLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  householdName: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.bodyLarge,
    color: colors.textPrimary,
  },
  spacer: { flex: 1 },
  action: { paddingHorizontal: 24 },
});
