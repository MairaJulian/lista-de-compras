import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSizes, fonts } from '../theme';
import { Icon } from './Icon';

type Props = {
  title: string;
  backLabel: string;
  onBack?: () => void;
  /** Línea chica debajo del título (p. ej. "Archivado · solo lectura"). */
  subtitle?: string;
};

/** Cabecera de las pantallas internas (Invitar, Perfil): flecha atrás de 48 y título de 24. */
export function ScreenHeader({ title, backLabel, onBack, subtitle }: Props) {
  const { top } = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: top + 24 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack}
        style={styles.back}
      >
        <Icon name="back" size={30} />
      </Pressable>
      <View style={styles.titles}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingLeft: 8, paddingRight: 16, flexDirection: 'row', alignItems: 'center', gap: 4 },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1 },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.caption, color: colors.textSecondary },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    color: colors.textPrimary,
  },
});
