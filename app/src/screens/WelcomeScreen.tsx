import { StyleSheet, Text, View } from 'react-native';

import { Avatar, GoogleButton, Icon, IntroLayout } from '../components';
import { colors, fontSizes, fonts, radii } from '../theme';

type Props = {
  onSignIn?: () => void;
};

// Lista de ejemplo que se ve en la tarjeta de `01-bienvenida`: no sale de los datos de la app.
const sampleRows = [
  { name: 'Pan lactal', done: true, initial: 'Diego', tone: 'blue' },
  { name: 'Leche', done: false, initial: 'Lucía', tone: 'amber' },
  { name: 'Yerba mate', done: false, initial: 'Vos', tone: 'green' },
] as const;

/** Bienvenida (`01-bienvenida`): presentación y "Entrar con Google". */
export function WelcomeScreen({ onSignIn }: Props) {
  return (
    <IntroLayout
      heroHeight={470}
      hero={
        <View style={styles.hero}>
          <View style={styles.cardBehind} />
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Supermercado</Text>
            {sampleRows.map((row) => (
              <View key={row.name} style={styles.row}>
                <View
                  style={[styles.checkbox, row.done ? styles.checkboxDone : styles.checkboxEmpty]}
                >
                  {row.done && <Icon name="check" size={14} color={colors.onPrimary} />}
                </View>
                <Text style={[styles.rowName, row.done && styles.rowNameDone]}>{row.name}</Text>
                <Avatar name={row.initial} tone={row.tone} />
              </View>
            ))}
          </View>
        </View>
      }
      title="Las compras de casa, entre todos."
      message="Armen la lista juntos, tildá lo que ya compraste y listo. Funciona también sin conexión."
    >
      <GoogleButton label="Entrar con Google" onPress={onSignIn} />
      <Text style={styles.terms}>
        Al entrar aceptás los términos de uso y la política de privacidad.
      </Text>
    </IntroLayout>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'absolute', top: 160, left: 0, right: 0, alignItems: 'center' },
  cardBehind: {
    position: 'absolute',
    top: 0,
    width: 266,
    height: 240,
    marginLeft: 34,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    opacity: 0.6,
    transform: [{ rotate: '4deg' }],
  },
  card: {
    width: 300,
    padding: 20,
    gap: 8,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    elevation: 8,
    transform: [{ rotate: '-2deg' }],
  },
  cardTitle: {
    marginBottom: 4,
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.textPrimary,
  },
  row: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: colors.primary },
  checkboxEmpty: { borderWidth: 2, borderColor: colors.checkboxBorder },
  rowName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    color: colors.textPrimary,
  },
  rowNameDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  terms: {
    marginTop: 4,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
