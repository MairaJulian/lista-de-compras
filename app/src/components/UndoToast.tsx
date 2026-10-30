import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fonts, heights, radii } from '../theme';

type Props = {
  message: string;
  actionLabel: string;
  onAction: () => void;
  /** Se llama pasados `duration` ms sin tocar la acción. */
  onTimeout: () => void;
  duration?: number;
  /** Distancia al borde de abajo (la barra de navegación del sistema). */
  bottomInset?: number;
};

/**
 * Aviso mínimo abajo con una acción ("Ítem eliminado · Deshacer"). No está en el diseño: usa los
 * colores y las formas del tema (el fondo oscuro del aviso `09`). Se monta cuando hay algo que
 * deshacer; al montarse empieza a contar y al terminar avisa con `onTimeout`.
 */
export function UndoToast({
  message,
  actionLabel,
  onAction,
  onTimeout,
  duration = 5000,
  bottomInset = 0,
}: Props) {
  useEffect(() => {
    const timer = setTimeout(onTimeout, duration);
    return () => clearTimeout(timer);
  }, [onTimeout, duration]);

  return (
    <View style={[styles.wrap, { bottom: 20 + bottomInset }]} pointerEvents="box-none">
      <View accessibilityLiveRegion="polite" style={styles.toast}>
        <Text style={styles.message}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={styles.action}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20 },
  toast: {
    minHeight: heights.button,
    paddingLeft: 16,
    paddingRight: 4,
    borderRadius: radii.notice,
    backgroundColor: colors.notificationBackground,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  message: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.body,
    color: colors.onPrimary,
  },
  action: {
    minHeight: heights.touchTarget,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.body,
    color: colors.primarySoftStrong,
  },
});
