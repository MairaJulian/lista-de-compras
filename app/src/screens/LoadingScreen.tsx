import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fonts } from '../theme';

type Props = {
  /** Con `true` es la pantalla `46-cargando-entrada` (indicador y "Entrando…"); sin eso, solo el logo. */
  entering?: boolean;
};

/**
 * Pantalla de carga con la marca. Sin `entering` (mientras se averigua si hay una sesión abierta)
 * se ve igual que el splash `45`; con `entering` (después de iniciar sesión, mientras se leen el
 * hogar y las listas) suma el indicador de `46`. El logo queda en el mismo lugar en las dos.
 */
export function LoadingScreen({ entering = false }: Props) {
  return (
    <View style={styles.screen} accessibilityLabel={entering ? undefined : 'Cargando'}>
      <View style={styles.brand}>
        <Image
          source={require('../../assets/splash-icon.png')}
          style={styles.logo}
          accessibilityLabel="Ícono de Changuito"
        />
        <Text style={styles.name}>Changuito</Text>
      </View>
      {entering && (
        <View style={styles.status} accessibilityRole="progressbar" accessibilityLabel="Entrando">
          <Spinner />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>Entrando…</Text>
            <Text style={styles.statusMessage}>Estamos buscando tu hogar y tus listas.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/** Anillo `#CFE8D9` con un tramo verde que gira (quieto si se pidió reducir animaciones). */
function Spinner() {
  const [turn] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => active && setReduceMotion(value));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, turn]);

  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  // Mismo centrado que en el diseño (`padding-bottom: 40`): el logo no se mueve entre 45 y 46.
  brand: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 40,
  },
  logo: { width: 132, height: 132 },
  name: { fontFamily: fonts.heading, fontSize: 34, lineHeight: 38, color: colors.textPrimary },
  status: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 40,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: colors.primarySoftStrong,
    borderTopColor: colors.primary,
  },
  statusText: { alignItems: 'center', gap: 2 },
  statusTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textPrimary },
  statusMessage: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    color: colors.textSecondary,
  },
});
