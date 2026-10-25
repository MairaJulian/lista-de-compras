import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSizes, fonts, heights, radii } from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
};

/** Botón verde de 56 con la "G" en círculo blanco ("Entrar con Google", "Entrar y unirme"). */
export function GoogleButton({ label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.g}>G</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: heights.buttonLarge,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  pressed: { opacity: 0.85 },
  g: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: colors.onPrimary,
    color: colors.primary,
    fontFamily: fonts.heading,
    fontSize: 16,
    includeFontPadding: false,
  },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyLarge, color: colors.onPrimary },
});
