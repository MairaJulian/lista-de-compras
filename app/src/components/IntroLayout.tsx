import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSizes, fonts } from '../theme';
import { Icon } from './Icon';

type Props = {
  /** Alto de la parte de arriba (470 en Bienvenida, 430 en Unirse). */
  heroHeight: number;
  /** Lo que va sobre el fondo verde, debajo del logo (la tarjeta de ejemplo). */
  hero: React.ReactNode;
  title: string;
  message: string;
  /** Botones y notas de abajo. */
  children: React.ReactNode;
};

/** Estructura de Bienvenida y Unirse: círculo verde con el logo y la tarjeta, título, texto y botones. */
export function IntroLayout({ heroHeight, hero, title, message, children }: Props) {
  const { top, bottom } = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={{ height: heroHeight }}>
        <View style={styles.blob} />
        <View style={[styles.brand, { top: top + 32 }]}>
          <View style={styles.logo}>
            <Icon name="cart" size={22} color={colors.onPrimary} />
          </View>
          <Text style={styles.brandName}>Changuito</Text>
        </View>
        {hero}
      </View>
      <View style={[styles.body, { paddingBottom: 32 + bottom }]}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  blob: {
    position: 'absolute',
    left: -65,
    top: -210,
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: colors.primarySoft,
  },
  brand: { position: 'absolute', left: 24, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontFamily: fonts.heading, fontSize: 22, color: colors.textPrimary },
  body: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, gap: 12 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 32,
    lineHeight: 37,
    color: colors.textPrimary,
  },
  message: {
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: 24,
    color: colors.textSecondary,
  },
});
