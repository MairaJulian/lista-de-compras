import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSizes, fonts, heights, radii } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  large?: boolean;
  disabled?: boolean;
  flex?: number;
};

/**
 * primary: verde lleno. secondary: borde gris. danger: borde gris con texto rojo
 * (como "Eliminar" del detalle). `large` es el botón de 56 (p. ej. "Crear lista").
 */
export function Button({ label, onPress, variant = 'primary', large, disabled, flex }: Props) {
  const height = large ? heights.buttonLarge : heights.button;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { height, flex },
        variant === 'primary' ? styles.primary : styles.outlined,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          large && styles.labelLarge,
          variant === 'primary' && styles.labelPrimary,
          variant === 'danger' && styles.labelDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  primary: { backgroundColor: colors.primary },
  outlined: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.body, color: colors.textPrimary },
  labelLarge: { fontSize: fontSizes.bodyLarge },
  labelPrimary: { color: colors.onPrimary },
  labelDanger: { color: colors.danger },
});
