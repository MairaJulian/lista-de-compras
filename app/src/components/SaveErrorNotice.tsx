import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fonts, radii } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';

type Props = {
  title: string;
  message: string;
  onRetry: () => void;
  onDiscard: () => void;
};

/**
 * Aviso rojo de "Error al guardar" (`37`): "No pudimos guardar 2 cambios" con Reintentar y Descartar.
 * También lo usan los errores de crear, renombrar y eliminar una lista, que el diseño no trae.
 */
export function SaveErrorNotice({ title, message, onRetry, onDiscard }: Props) {
  return (
    <View accessibilityRole="alert" style={styles.notice}>
      <View style={styles.header}>
        <Icon name="alertCircle" size={28} color={colors.danger} />
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          label="Reintentar"
          icon="refresh"
          variant="dangerFilled"
          flex={3}
          onPress={onRetry}
        />
        <Button label="Descartar" variant="danger" flex={2} onPress={onDiscard} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    padding: 16,
    gap: 14,
    borderRadius: radii.card,
    backgroundColor: colors.dangerSoft,
  },
  header: { flexDirection: 'row', gap: 12 },
  texts: { flex: 1, gap: 2 },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.bodyLarge,
    lineHeight: 24,
    color: colors.danger,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    lineHeight: 20,
    color: colors.danger,
  },
  actions: { flexDirection: 'row', gap: 12 },
});
