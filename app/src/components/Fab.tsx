import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSizes, fonts, heights, radii } from '../theme';
import { Icon, IconName } from './Icon';

type Props = {
  label: string;
  icon: IconName;
  onPress?: () => void;
};

/** Botón flotante extendido (p. ej. "Nueva lista"). */
export function Fab({ label, icon, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Icon name={icon} size={22} color={colors.onPrimary} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    height: heights.fab,
    paddingLeft: 18,
    paddingRight: 22,
    borderRadius: radii.fab,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 8,
    shadowColor: colors.textPrimary,
  },
  pressed: { opacity: 0.9 },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.body, color: colors.onPrimary },
});
