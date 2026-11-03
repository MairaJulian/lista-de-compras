import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fonts, fontSizes, heights, motion, radii, sizes } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { useAnimatedPresence } from './useAnimatedPresence';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Falso en paneles que arrancan directo con su contenido (opciones de miembro). */
  showHeader?: boolean;
  children: React.ReactNode;
};

/** Panel inferior: velo, manija, título con ✕ y contenido. Sube en ~0,35 s. */
export function BottomSheet({ visible, title, onClose, showHeader = true, children }: Props) {
  const { mounted, progress } = useAnimatedPresence(visible, motion.panelDuration);
  const { bottom } = useSafeAreaInsets();
  const { containerRef, onLayout, keyboardGap, keyboardOpen } = useKeyboardGap();

  if (!mounted) {
    return null;
  }

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Modal transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: progress }]}>
        <Pressable accessibilityLabel="Cerrar" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <View
        ref={containerRef}
        onLayout={onLayout}
        pointerEvents="box-none"
        style={[styles.container, { paddingBottom: keyboardGap }]}
      >
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={title}
          // Con el teclado abierto la barra de navegación del sistema queda tapada: no se suma su margen.
          style={[
            styles.sheet,
            { paddingBottom: 28 + (keyboardOpen ? 0 : bottom), transform: [{ translateY }] },
          ]}
        >
          <View style={styles.handle} />
          {showHeader && (
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={onClose}
                style={styles.close}
              >
                <Icon name="close" color={colors.textSecondary} />
              </Pressable>
            </View>
          )}
          {/* Con letra grande el contenido puede no entrar en pantalla: se desplaza. */}
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.body}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Cuánto tapa el teclado del panel (el panel va pegado abajo en una ventana propia). Se mide contra
 * la pantalla en vez de usar `KeyboardAvoidingView`, que con la pantalla de borde a borde de Android
 * 15+ sumaba de más (franja blanca entre el teclado y el panel) o de menos (botón cortado). Si el
 * sistema ya achicó la ventana por el teclado, la diferencia es 0 y no se suma nada.
 */
function useKeyboardGap() {
  const containerRef = useRef<ComponentRef<typeof View>>(null);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [measuredGap, setMeasuredGap] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardTop(e.endCoordinates.screenY),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardTop(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const measure = useCallback(() => {
    if (keyboardTop === null) return;
    containerRef.current?.measureInWindow((_x, y, _w, height) => {
      setMeasuredGap(Math.max(0, Math.round(y + height - keyboardTop)));
    });
  }, [keyboardTop]);

  useEffect(() => {
    measure();
  }, [measure]);

  const keyboardGap = keyboardTop === null ? 0 : measuredGap;

  return { containerRef, onLayout: measure, keyboardGap, keyboardOpen: keyboardTop !== null };
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  container: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.panel,
    borderTopRightRadius: radii.panel,
    elevation: 16,
    maxHeight: '92%',
  },
  body: { flexGrow: 0, flexShrink: 1 },
  handle: {
    width: sizes.handleWidth,
    height: sizes.handleHeight,
    borderRadius: radii.handle,
    backgroundColor: colors.handle,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    minHeight: heights.panelHeader,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: fontSizes.panelTitle,
    color: colors.textPrimary,
  },
  close: {
    width: heights.touchTarget,
    height: heights.touchTarget,
    marginRight: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
