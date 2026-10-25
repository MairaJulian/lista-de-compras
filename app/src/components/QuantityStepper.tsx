import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, heights } from '../theme';
import { Icon } from './Icon';

type Props = {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
};

/** Cantidad con − y +. El mínimo (1) lo aplica quien lo usa. */
export function QuantityStepper({ value, onDecrement, onIncrement }: Props) {
  return (
    <View accessibilityRole="adjustable" style={styles.group}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Una menos"
        onPress={onDecrement}
        style={[styles.button, styles.minus]}
      >
        <Icon name="minus" size={20} />
      </Pressable>
      <Text accessibilityLabel={`Cantidad ${value}`} style={styles.value}>
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Una más"
        onPress={onIncrement}
        style={[styles.button, styles.plus]}
      >
        <Icon name="plus" size={20} color={colors.primaryText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  button: {
    width: heights.touchTarget,
    height: heights.touchTarget,
    borderRadius: heights.touchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minus: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  plus: { backgroundColor: colors.primarySoft },
  value: {
    minWidth: heights.touchTarget,
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.textPrimary,
  },
});
