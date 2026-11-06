import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, ButtonRow, GroupBadge, Icon } from '../components';
import { useMyGroups, useSwitchGroup } from '../data/hooks';
import { groupAppearance, groupCountsLabel, splitGroups } from '../data/groupLogic';
import { colors, fontSizes, fonts, radii } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: () => void;
  onJoin: () => void;
  onSeeAll: () => void;
};

/**
 * Panel "Tus grupos" (`47-cambiar-grupo`): un renglón por grupo activo, el actual con tilde, y los
 * botones Crear grupo y Unirme con un código. Los archivados no salen acá (están en Mis grupos).
 */
export function GroupSwitcherSheet({ visible, onClose, onCreate, onJoin, onSeeAll }: Props) {
  return (
    <BottomSheet visible={visible} title="Tus grupos" onClose={onClose}>
      <SwitcherContent onClose={onClose} onCreate={onCreate} onJoin={onJoin} onSeeAll={onSeeAll} />
    </BottomSheet>
  );
}

// El panel desmonta su contenido al cerrarse: los grupos se leen cada vez que se abre (y se
// reutiliza la lectura de hasta un minuto, ver `groupsStore`).
function SwitcherContent({ onClose, onCreate, onJoin, onSeeAll }: Omit<Props, 'visible'>) {
  const myGroups = useMyGroups();
  const switchGroup = useSwitchGroup();
  const [limitShown, setLimitShown] = useState(false);
  const { active } = splitGroups(myGroups.groups);

  const guarded = (action: () => void) => () => {
    if (myGroups.limitReached) {
      setLimitShown(true);
      return;
    }
    action();
  };

  return (
    <View>
      <Text style={styles.subtitle}>Elegí cuál querés ver.</Text>

      {myGroups.status === 'loading' && <Text style={styles.status}>Buscando tus grupos…</Text>}
      {myGroups.status === 'error' && (
        <View style={styles.errorBlock}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            No pudimos cargar tus grupos. Revisá tu conexión y probá de nuevo.
          </Text>
          <Button label="Reintentar" icon="refresh" variant="secondary" onPress={myGroups.retry} />
        </View>
      )}

      {active.map((group) => {
        const selected = group.id === myGroups.currentId;
        const { icon, tone } = groupAppearance(group.type);
        const counts = groupCountsLabel(group);
        return (
          <Pressable
            key={group.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${group.name}${counts ? `, ${counts}` : ''}`}
            onPress={() => {
              if (!selected) switchGroup(group);
              onClose();
            }}
            style={styles.row}
          >
            {/* El fondo del actual es una capa propia: un fondo que aparece después de montar le quita el redondeo en Android. */}
            {selected && <View style={styles.selectedFill} />}
            <GroupBadge icon={icon} tone={tone} />
            <View style={styles.rowText}>
              <Text style={styles.rowName}>{group.name}</Text>
              {counts !== '' && <Text style={styles.rowCounts}>{counts}</Text>}
            </View>
            {selected ? (
              <View style={styles.checked}>
                <Icon name="check" size={20} color={colors.onPrimary} />
              </View>
            ) : (
              <View style={styles.unchecked} />
            )}
          </Pressable>
        );
      })}

      {limitShown && (
        <View accessibilityRole="alert" style={styles.notice}>
          <Icon name="alertCircle" size={22} color={colors.danger} />
          <Text style={styles.noticeText}>{myGroups.limitMessage}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <ButtonRow>
          <Button label="Crear grupo" icon="plus" grow={1} onPress={guarded(onCreate)} />
          <Button
            label="Unirme con un código"
            variant="secondary"
            grow={1}
            onPress={guarded(onJoin)}
          />
        </ButtonRow>
        <Pressable accessibilityRole="button" onPress={onSeeAll} style={styles.seeAll}>
          <Text style={styles.seeAllLabel}>Ver todos mis grupos y archivados</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginBottom: 12,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  status: {
    paddingVertical: 20,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  errorBlock: { gap: 12, paddingVertical: 8 },
  errorText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    lineHeight: 20,
    color: colors.danger,
  },
  row: {
    minHeight: 72,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderRadius: radii.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  selectedFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.card,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftStrong,
  },
  rowText: { flex: 1 },
  rowName: { fontFamily: fonts.heading, fontSize: fontSizes.bodyLarge, color: colors.textPrimary },
  rowCounts: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    color: colors.textSecondary,
  },
  checked: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unchecked: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.handle,
  },
  notice: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.secondary,
    lineHeight: 20,
    color: colors.danger,
  },
  actions: { marginTop: 16, gap: 4 },
  seeAll: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  seeAllLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.body, color: colors.primaryText },
});
