import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fonts, heights, radii } from '../theme';
import { Icon, IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'danger' | 'dangerFilled' | 'text';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  large?: boolean;
  disabled?: boolean;
  flex?: number;
  /** Ícono a la izquierda del texto (p. ej. "Compartir enlace"). */
  icon?: IconName;
};

/**
 * primary: verde lleno. secondary: borde gris. danger: borde gris con texto rojo (como "Eliminar"
 * del detalle). dangerFilled: rojo lleno (la acción de confirmar en "¿Quitar a Lucía del hogar?").
 * text: sin borde ni fondo (como "Ahora no"). `large` es el botón de 56 (p. ej. "Crear lista").
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  large,
  disabled,
  flex,
  icon,
}: Props) {
  const height = large ? heights.buttonLarge : heights.button;
  const filled = variant === 'primary' || variant === 'dangerFilled';
  // El principal deshabilitado es gris ("Unirme" sin código), no un verde transparente.
  const greyedOut = disabled && variant === 'primary';
  const labelColor = greyedOut
    ? colors.textSecondary
    : filled
      ? colors.onPrimary
      : variant === 'danger'
        ? colors.danger
        : variant === 'text'
          ? colors.textSecondary
          : colors.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { height, flex },
        variant === 'primary' && (greyedOut ? styles.primaryDisabled : styles.primary),
        variant === 'dangerFilled' && styles.dangerFilled,
        (variant === 'secondary' || variant === 'danger') && styles.outlined,
        disabled && !greyedOut && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {icon && <Icon name={icon} size={large ? 22 : 20} color={labelColor} />}
        <Text style={[styles.label, large && styles.labelLarge, { color: labelColor }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primary: { backgroundColor: colors.primary },
  primaryDisabled: { backgroundColor: colors.tabBarBorder },
  dangerFilled: { backgroundColor: colors.danger },
  outlined: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.body },
  labelLarge: { fontSize: fontSizes.bodyLarge },
});
