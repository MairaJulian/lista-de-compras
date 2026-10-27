import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, fontSizes, fonts } from '../theme';
import { Icon } from './Icon';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Texto en Nunito grande y en mayúsculas (el código de invitación). */
  code?: boolean;
  /** Botón a la derecha dentro del campo ("Pegar"). */
  trailing?: React.ReactNode;
  /** Mensaje de error: pinta el campo en rojo y lo muestra debajo (`30-error-codigo`). */
  error?: string;
};

/** Campo grande de las pantallas Crear hogar (60) y Unirme con un código (64). */
export function LargeField({ label, code, trailing, error, ...inputProps }: Props) {
  const invalid = Boolean(error);
  return (
    <View style={styles.container}>
      <Text style={[styles.label, invalid && styles.labelError]}>{label}</Text>
      {/* El fondo y el borde van siempre presentes: así el borde redondeado no se pierde en Android. */}
      <View
        style={[
          styles.box,
          code ? styles.boxCode : styles.boxName,
          {
            borderWidth: invalid ? 2 : 1.5,
            borderColor: invalid ? colors.danger : colors.border,
            backgroundColor: invalid ? colors.dangerField : colors.surface,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          style={[styles.input, code ? styles.inputCode : styles.inputName]}
          {...inputProps}
        />
        {trailing}
      </View>
      {error && (
        <View accessibilityRole="alert" style={styles.error}>
          <Icon name="alertCircle" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.caption, color: colors.textSecondary },
  labelError: { color: colors.danger },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
  },
  boxName: { height: 60, paddingHorizontal: 18 },
  boxCode: { height: 64, paddingLeft: 18, paddingRight: 8 },
  input: { flex: 1, minWidth: 0, padding: 0, color: colors.textPrimary },
  inputName: { fontFamily: fonts.bodyMedium, fontSize: 18 },
  inputCode: { fontFamily: fonts.heading, fontSize: 22, letterSpacing: 1 },
  error: { paddingHorizontal: 4, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  errorText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.secondary,
    lineHeight: 20,
    color: colors.danger,
  },
});
