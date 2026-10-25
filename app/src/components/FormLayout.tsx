import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSizes, fonts } from '../theme';
import { Icon, IconName } from './Icon';
import { ScreenHeader } from './ScreenHeader';

type Props = {
  headerTitle: string;
  onBack?: () => void;
  icon: IconName;
  title: string;
  message: string;
  /** Campo de abajo del texto. */
  children: React.ReactNode;
  /** Botón de abajo de todo. */
  footer: React.ReactNode;
};

/** Estructura de Crear hogar y Unirme con un código: cabecera, círculo con ícono, texto, campo y botón. */
export function FormLayout({ headerTitle, onBack, icon, title, message, children, footer }: Props) {
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScreenHeader title={headerTitle} backLabel="Volver" onBack={onBack} />
      <View style={styles.intro}>
        <View style={styles.circle}>
          <Icon name={icon} size={48} color={colors.primary} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      <View style={styles.field}>{children}</View>
      <View style={styles.spacer} />
      <View style={[styles.footer, { paddingBottom: 40 + bottom }]}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  intro: { paddingTop: 40, paddingHorizontal: 32, alignItems: 'center', gap: 12 },
  circle: {
    width: 104,
    height: 104,
    marginBottom: 8,
    borderRadius: 52,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: 26,
    lineHeight: 31,
    color: colors.textPrimary,
  },
  message: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  field: { marginHorizontal: 24, marginTop: 32 },
  spacer: { flex: 1 },
  footer: { paddingHorizontal: 24 },
});
