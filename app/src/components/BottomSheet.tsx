import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Pressable,
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
  children: React.ReactNode;
};

/** Panel inferior: velo, manija, título con ✕ y contenido. Sube en ~0,35 s. */
export function BottomSheet({ visible, title, onClose, children }: Props) {
  const { mounted, progress } = useAnimatedPresence(visible, motion.panelDuration);
  const { bottom } = useSafeAreaInsets();

  if (!mounted) {
    return null;
  }

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Modal transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: progress }]}>
        <Pressable accessibilityLabel="Cerrar" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView behavior="padding" pointerEvents="box-none" style={styles.container}>
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={[styles.sheet, { paddingBottom: 28 + bottom, transform: [{ translateY }] }]}
        >
          <View style={styles.handle} />
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
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
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
  },
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
    height: heights.panelHeader,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.panelTitle, color: colors.textPrimary },
  close: {
    width: heights.touchTarget,
    height: heights.touchTarget,
    marginRight: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
