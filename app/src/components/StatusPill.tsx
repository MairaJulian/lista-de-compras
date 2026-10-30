import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSizes, fonts, heights, radii } from '../theme';
import { Icon } from './Icon';

type Props = {
  online: boolean;
  /** El servidor rechazó cambios (`37`): "Sin guardar", en rojo. Gana sobre `online`. */
  unsaved?: boolean;
  onPress?: () => void;
};

const looks = {
  synced: {
    label: 'Sincronizado',
    icon: 'cloudCheck',
    text: colors.primaryText,
    bg: colors.primarySoft,
  },
  offline: {
    label: 'Sin conexión',
    icon: 'cloudOff',
    text: colors.amberText,
    bg: colors.amberSoft,
  },
  unsaved: { label: 'Sin guardar', icon: 'cloudAlert', text: colors.danger, bg: colors.dangerSoft },
} as const;

export function StatusPill({ online, unsaved, onPress }: Props) {
  const look = looks[unsaved ? 'unsaved' : online ? 'synced' : 'offline'];

  return (
    <Pressable
      accessibilityRole={unsaved ? 'text' : 'button'}
      accessibilityLabel={
        unsaved
          ? 'Estado: sin guardar. Hay cambios que el servidor no aceptó'
          : online
            ? 'Estado: sincronizado. Tocá para simular que no hay conexión'
            : 'Estado: sin conexión. Tocá para simular que volvió la conexión'
      }
      onPress={onPress}
      style={[styles.pill, { backgroundColor: look.bg }]}
    >
      <Icon name={look.icon} size={20} color={look.text} />
      <Text style={[styles.label, { color: look.text }]}>{look.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: heights.statusPill,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.caption },
});
