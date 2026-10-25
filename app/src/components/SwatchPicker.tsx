import { Pressable, StyleSheet, View } from 'react-native';

import { colors, ListTone, listTones, sizes } from '../theme';
import { Icon } from './Icon';

type Option = { tone: ListTone; label: string };

const options: Option[] = [
  { tone: 'green', label: 'Verde' },
  { tone: 'amber', label: 'Ámbar' },
  { tone: 'blue', label: 'Azul' },
  { tone: 'neutral', label: 'Gris' },
];

type Props = {
  value: ListTone;
  onChange: (tone: ListTone) => void;
};

/** Los 4 colores de lista. El elegido lleva borde oscuro y tilde. */
export function SwatchPicker({ value, onChange }: Props) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {options.map(({ tone, label }) => {
        const selected = tone === value;
        return (
          <Pressable
            key={tone}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onChange(tone)}
            // El borde existe siempre (transparente si no está elegido) para que el círculo no cambie de tamaño.
            style={[
              styles.swatch,
              {
                backgroundColor: listTones[tone].swatch,
                borderColor: selected ? colors.textPrimary : 'transparent',
              },
            ]}
          >
            {selected && <Icon name="check" size={22} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', gap: 14 },
  swatch: {
    width: sizes.swatch,
    height: sizes.swatch,
    borderRadius: sizes.swatch / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
