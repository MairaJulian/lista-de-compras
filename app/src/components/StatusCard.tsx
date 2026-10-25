import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fonts, radii } from '../theme';
import { Icon, IconName } from './Icon';

type Tone = 'dashed' | 'amber' | 'danger' | 'primary';

type Props = {
  icon: IconName;
  tone: Tone;
  title: string;
  subtitle: string;
  /** Tilde verde en la esquina del ícono (`21-hogar-creado`). */
  badge?: boolean;
};

const toneColors = {
  dashed: { background: 'transparent', icon: colors.textSecondary },
  amber: { background: colors.amberSoft, icon: colors.amberText },
  danger: { background: colors.dangerSoft, icon: colors.danger },
  primary: { background: colors.primary, icon: colors.onPrimary },
} as const;

/**
 * Tarjeta blanca de la parte de arriba de Sin hogar, Hogar creado y los errores: ícono grande,
 * título y una línea de apoyo. Va dentro de `IntroLayout`, en la misma posición que la de Unirse.
 */
export function StatusCard({ icon, tone, title, subtitle, badge }: Props) {
  const dashed = tone === 'dashed';

  return (
    <View style={styles.position}>
      <View style={styles.card}>
        <View style={styles.iconSlot}>
          <View
            style={[
              styles.icon,
              dashed ? styles.iconDashed : styles.iconTile,
              { backgroundColor: toneColors[tone].background },
            ]}
          >
            <Icon name={icon} size={dashed ? 34 : 36} color={toneColors[tone].icon} />
          </View>
          {badge && (
            <View style={styles.badgeRing}>
              <View style={styles.badge}>
                <Icon name="check" size={14} color={colors.primaryText} />
              </View>
            </View>
          )}
        </View>
        <Text style={[styles.title, dashed && styles.titleSmall]}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position: { position: 'absolute', top: 160, left: 0, right: 0, alignItems: 'center' },
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
  iconSlot: { width: 72, height: 72, marginBottom: 4 },
  icon: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  iconTile: { borderRadius: 22 },
  iconDashed: {
    borderRadius: 36,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.checkboxBorder,
  },
  badgeRing: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoftStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 26, color: colors.textPrimary },
  titleSmall: { fontSize: 22, lineHeight: 24 },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.textSecondary },
});
