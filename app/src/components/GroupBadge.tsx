import { StyleSheet, View } from 'react-native';

import type { GroupTone } from '../data/groupLogic';
import { colors } from '../theme';
import { Icon, type IconName } from './Icon';

const tones: Record<GroupTone, { background: string; icon: string }> = {
  green: { background: colors.primarySoft, icon: colors.primary },
  blue: { background: colors.blueSoft, icon: colors.blueText },
  amber: { background: colors.amberSoft, icon: colors.amberIcon },
  neutral: { background: colors.neutralSoft, icon: colors.neutralText },
};

type Props = {
  icon: IconName;
  tone: GroupTone;
  size?: number;
};

/** Cuadrado redondeado con el ícono del tipo de grupo (`47`, `48`, `49`). */
export function GroupBadge({ icon, tone, size = 44 }: Props) {
  const { background, icon: color } = tones[tone];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.badge, { width: size, height: size, backgroundColor: background }]}
    >
      <Icon name={icon} size={Math.round(size * 0.55)} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
