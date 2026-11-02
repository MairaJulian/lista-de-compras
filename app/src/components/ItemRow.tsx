import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarTone, colors, fontSizes, fonts, heights, radii, sizes } from '../theme';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

type Props = {
  name: string;
  quantity?: string;
  done?: boolean;
  /** Cambio sin sincronizar: muestra el reloj ámbar. */
  pendingSync?: boolean;
  /** Por qué no se guardó ("No se guardó: ítem nuevo"): la fila se marca en rojo, con "!" en vez del avatar. */
  error?: string;
  addedBy: { name: string; tone: AvatarTone };
  onToggle?: () => void;
  onPress?: () => void;
};

/** Fila de ítem: checkbox, nombre, cantidad y avatar. Va dentro de un ItemGroup. */
export function ItemRow({
  name,
  quantity,
  done,
  pendingSync,
  error,
  addedBy,
  onToggle,
  onPress,
}: Props) {
  const height = done ? heights.rowDone : heights.rowPending;
  return (
    <View style={[styles.row, error ? { minHeight: heights.rowError } : { height }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: !!done }}
        accessibilityLabel={done ? 'Volver a pendientes' : 'Marcar como comprado'}
        onPress={onToggle}
        style={styles.checkboxArea}
      >
        {done ? (
          <View style={[styles.checkbox, styles.checkboxDone]}>
            <Icon name="check" size={14} color={colors.onPrimary} />
          </View>
        ) : (
          <View style={[styles.checkbox, styles.checkboxEmpty]} />
        )}
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.content}>
        <View style={styles.line}>
          <Text style={[styles.name, done && styles.nameDone]} numberOfLines={1}>
            {name}
          </Text>
          {!!quantity && <Text style={styles.quantity}>{quantity}</Text>}
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </Pressable>
      {pendingSync && (
        <View accessibilityRole="image" accessibilityLabel="Sin sincronizar">
          <Icon name="clock" size={20} color={colors.amberIcon} />
        </View>
      )}
      {error ? (
        <View accessibilityRole="image" accessibilityLabel="No se guardó" style={styles.errorBadge}>
          <Text style={styles.errorBadgeMark}>!</Text>
        </View>
      ) : (
        <Avatar name={addedBy.name} tone={addedBy.tone} />
      )}
    </View>
  );
}

/** Une varias filas con la línea de 1 px entre ellas. */
export function ItemGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  group: {
    borderRadius: radii.group,
    overflow: 'hidden',
    backgroundColor: colors.separator,
    gap: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 6,
    paddingRight: 16,
    backgroundColor: colors.surface,
  },
  checkboxArea: {
    width: heights.touchTarget,
    height: heights.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxEmpty: { borderWidth: 2, borderColor: colors.checkboxBorder },
  checkboxDone: { backgroundColor: colors.primary },
  content: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  error: {
    marginTop: 2,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.secondary,
    color: colors.danger,
  },
  errorBadge: {
    width: sizes.avatar,
    height: sizes.avatar,
    borderRadius: sizes.avatar / 2,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBadgeMark: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    includeFontPadding: false,
    color: colors.danger,
  },
  name: {
    flexShrink: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.bodyLarge,
    color: colors.textPrimary,
  },
  nameDone: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  quantity: { fontFamily: fonts.body, fontSize: fontSizes.secondary, color: colors.textSecondary },
});
