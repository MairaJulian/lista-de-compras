import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fontSizes, fonts, heights, radii } from '../theme';
import { Icon } from './Icon';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
};

/** Campo "Agregar ítem…" con el botón circular verde (pantalla Lista). */
export function QuickAddField({ value, onChangeText, onSubmit }: Props) {
  return (
    <View style={styles.row}>
      <TextInput
        accessibilityLabel="Agregar ítem"
        placeholder="Agregar ítem…"
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="done"
        submitBehavior="submit"
        autoComplete="off"
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Agregar a la lista"
        onPress={onSubmit}
        style={styles.button}
      >
        <Icon name="plus" color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    height: heights.field,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.quickAdd,
    backgroundColor: colors.surface,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    color: colors.textPrimary,
  },
  button: {
    width: heights.field,
    height: heights.field,
    borderRadius: heights.field / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
