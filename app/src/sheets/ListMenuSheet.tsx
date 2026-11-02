import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, Icon } from '../components';
import { colors, fontSizes, fonts } from '../theme';

type Props = {
  visible: boolean;
  name: string;
  /** Pendientes y comprados. */
  itemCount: number;
  householdName: string;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
};

/** Menú de la lista (`34-menu-lista`), desde el ⋯ del encabezado: Renombrar y Eliminar lista. */
export function ListMenuSheet({
  visible,
  name,
  itemCount,
  householdName,
  onClose,
  onRename,
  onDelete,
}: Props) {
  const items = itemCount === 1 ? '1 ítem' : `${itemCount} ítems`;
  return (
    <BottomSheet visible={visible} title={`Menú de ${name}`} onClose={onClose} showHeader={false}>
      <View>
        <View style={styles.list}>
          <View style={styles.circle}>
            <Icon name="cart" size={26} color={colors.primary} />
          </View>
          <View style={styles.titles}>
            <Text accessibilityRole="header" numberOfLines={1} style={styles.name}>
              {name}
            </Text>
            <Text style={styles.detail}>
              {items} · {householdName}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onRename}
          style={[styles.option, styles.rename]}
        >
          <Icon name="pencil" color={colors.textPrimary} />
          <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Renombrar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onDelete}
          style={[styles.option, styles.delete]}
        >
          <Icon name="trash" color={colors.danger} />
          <Text style={[styles.optionLabel, { color: colors.danger }]}>Eliminar lista</Text>
        </Pressable>
        <Text style={styles.note}>
          Si la renombrás o la eliminás, el cambio lo ve todo el hogar.
        </Text>
        <Button label="Cancelar" variant="secondary" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { height: 64, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 14 },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 22, color: colors.textPrimary },
  detail: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    color: colors.textSecondary,
  },
  option: {
    height: 60,
    marginTop: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rename: { backgroundColor: colors.neutralSoft },
  delete: { backgroundColor: colors.dangerSoft },
  optionLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyLarge },
  note: {
    marginTop: 10,
    marginBottom: 18,
    marginHorizontal: 4,
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
