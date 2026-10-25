import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, fontSizes, fonts, heights, radii } from '../theme';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
};

/** Campo con etiqueta arriba, el de los paneles (Nombre, Nota). Con `multiline` es el de Nota. */
export function TextField({ label, multiline, ...inputProps }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        multiline={multiline}
        numberOfLines={multiline ? 2 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline ? styles.multiline : styles.singleLine]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.field,
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  singleLine: {
    height: heights.field,
    paddingHorizontal: 16,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
  },
  multiline: {
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: 22,
  },
});
