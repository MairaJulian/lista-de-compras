import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSizes, motion, radii } from '../theme';
import { Icon, IconName } from './Icon';
import { useAnimatedPresence } from './useAnimatedPresence';

type Tone = 'amber' | 'danger';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  icon: IconName;
  tone?: Tone;
  onClose: () => void;
  /** Botones (Button), uno debajo del otro. */
  children: React.ReactNode;
};

const toneColors = {
  amber: { background: colors.amberSoft, icon: colors.amberText },
  danger: { background: colors.dangerSoft, icon: colors.danger },
} as const;

/** Aviso centrado: velo, ícono en círculo, título, texto y botones. Aparece con leve escala + fade. */
export function CenteredDialog({
  visible,
  title,
  message,
  icon,
  tone = 'amber',
  onClose,
  children,
}: Props) {
  const { mounted, progress } = useAnimatedPresence(visible, motion.dialogDuration);

  if (!mounted) {
    return null;
  }

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [motion.dialogStartScale, 1],
  });

  return (
    <Modal transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: progress }]}>
        <Pressable
          accessibilityLabel="Cerrar aviso"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
      </Animated.View>
      <View pointerEvents="box-none" style={styles.center}>
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[styles.dialog, { opacity: progress, transform: [{ scale }] }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: toneColors[tone].background }]}>
            <Icon name={icon} size={28} color={toneColors[tone].icon} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>{children}</View>
        </Animated.View>
      </View>
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
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 35 },
  dialog: {
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.dialog,
    elevation: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 4,
    fontFamily: fonts.heading,
    fontSize: fontSizes.dialogTitle,
    lineHeight: 29,
    color: colors.textPrimary,
  },
  message: {
    marginBottom: 12,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  actions: { gap: 12 },
});
