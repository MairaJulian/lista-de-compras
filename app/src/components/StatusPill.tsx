import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSizes, fonts, heights, radii } from '../theme';
import { Icon } from './Icon';

type Props = {
  online: boolean;
  onPress?: () => void;
};

export function StatusPill({ online, onPress }: Props) {
  const label = online ? 'Sincronizado' : 'Sin conexión';
  const textColor = online ? colors.primaryText : colors.amberText;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        online
          ? 'Estado: sincronizado. Tocá para simular que no hay conexión'
          : 'Estado: sin conexión. Tocá para simular que volvió la conexión'
      }
      onPress={onPress}
      style={[styles.pill, { backgroundColor: online ? colors.primarySoft : colors.amberSoft }]}
    >
      <Icon name={online ? 'cloudCheck' : 'cloudOff'} size={20} color={textColor} />
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
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
