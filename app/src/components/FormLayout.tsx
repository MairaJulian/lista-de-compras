import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSizes, fonts } from '../theme';
import { Icon, IconName } from './Icon';
import { ScreenHeader } from './ScreenHeader';

type Props = {
  headerTitle: string;
  onBack?: () => void;
  icon: IconName;
  /** Color del círculo: verde normal, ámbar en la variante de error. */
  tone?: 'primary' | 'amber';
  title: string;
  message: string;
  /** Campo de abajo del texto. */
  children: React.ReactNode;
  /** Aviso rojo de abajo del campo (por ejemplo "Tu hogar no se creó"). */
  notice?: string;
  /** Botón de abajo de todo. */
  footer: React.ReactNode;
};

/** Estructura de Crear hogar y Unirme con un código: cabecera, círculo con ícono, texto, campo y botón. */
export function FormLayout({
  headerTitle,
  onBack,
  icon,
  tone = 'primary',
  title,
  message,
  children,
  notice,
  footer,
}: Props) {
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScreenHeader title={headerTitle} backLabel="Volver" onBack={onBack} />
      <View style={styles.intro}>
        <View style={[styles.circle, tone === 'amber' && styles.circleAmber]}>
          <Icon
            name={icon}
            size={48}
            color={tone === 'amber' ? colors.amberText : colors.primary}
          />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      <View style={styles.field}>
        {children}
        {notice && (
          <View accessibilityRole="alert" style={styles.notice}>
            <Icon name="alertCircle" size={22} color={colors.danger} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}
      </View>
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
  circleAmber: { backgroundColor: colors.amberSoft },
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
  field: { marginHorizontal: 24, marginTop: 32, gap: 12 },
  notice: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.secondary,
    lineHeight: 20,
    color: colors.danger,
  },
  spacer: { flex: 1 },
  footer: { paddingHorizontal: 24, gap: 10 },
});
