import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, fontSizes, fonts } from '../theme';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Texto en Nunito grande y en mayúsculas (el código de invitación). */
  code?: boolean;
  /** Botón a la derecha dentro del campo ("Pegar"). */
  trailing?: React.ReactNode;
};

/** Campo grande de las pantallas Crear hogar (60) y Unirme con un código (64). */
export function LargeField({ label, code, trailing, ...inputProps }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, code ? styles.boxCode : styles.boxName]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          style={[styles.input, code ? styles.inputCode : styles.inputName]}
          {...inputProps}
        />
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.caption, color: colors.textSecondary },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  boxName: { height: 60, paddingHorizontal: 18 },
  boxCode: { height: 64, paddingLeft: 18, paddingRight: 8 },
  input: { flex: 1, minWidth: 0, padding: 0, color: colors.textPrimary },
  inputName: { fontFamily: fonts.bodyMedium, fontSize: 18 },
  inputCode: { fontFamily: fonts.heading, fontSize: 22, letterSpacing: 1 },
});
