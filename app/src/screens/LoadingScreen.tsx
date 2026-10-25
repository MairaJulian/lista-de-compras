import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../components';
import { colors, fonts } from '../theme';

/** Pantalla de carga con la marca, mientras se averigua si hay una sesión abierta. */
export function LoadingScreen() {
  return (
    <View style={styles.screen} accessibilityLabel="Cargando">
      <View style={styles.logo}>
        <Icon name="cart" size={32} color={colors.onPrimary} />
      </View>
      <Text style={styles.name}>Changuito</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: fonts.heading, fontSize: 28, color: colors.textPrimary },
});
