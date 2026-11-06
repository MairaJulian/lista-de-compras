import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, ButtonRow, GroupBadge, Icon, ScreenHeader } from '../components';
import { useMyGroups, useSwitchGroup } from '../data/hooks';
import {
  archivedLabel,
  groupAppearance,
  groupRoleLabel,
  splitGroups,
  type GroupSummary,
} from '../data/groupLogic';
import { colors, fontSizes, fonts, radii } from '../theme';
import { LoadErrorState } from './InicioStates';

type Props = {
  onBack?: () => void;
  onCreate?: () => void;
  onJoin?: () => void;
  /** Después de elegir un grupo activo (ya se cambió de grupo): normalmente va a Inicio. */
  onOpened?: () => void;
  /** Un grupo archivado se abre en `52` (Etapa 9, PR 2d); mientras tanto no se puede abrir. */
  onOpenArchived?: (group: GroupSummary) => void;
};

function GroupRow({
  group,
  viewing,
  last,
  onPress,
}: {
  group: GroupSummary;
  viewing: boolean;
  last: boolean;
  onPress?: () => void;
}) {
  const { icon, tone } = groupAppearance(group.type, group.archived);
  const detail = group.archived ? archivedLabel(group.archivedAt) : groupRoleLabel(group);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.name}, ${detail}${viewing ? ', viendo' : ''}`}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.row, !last && styles.rowDivider]}
    >
      <GroupBadge icon={icon} tone={tone} size={44} />
      <View style={styles.rowText}>
        <Text style={[styles.rowName, group.archived && styles.archivedText]}>{group.name}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      {viewing ? (
        <View style={styles.viewing}>
          <Text style={styles.viewingLabel}>Viendo</Text>
        </View>
      ) : (
        onPress && <Icon name="chevronRight" size={24} color={colors.textSecondary} />
      )}
    </Pressable>
  );
}

/**
 * Mis grupos (`48-mis-grupos`): activos (con "Viendo" en el actual) y archivados, y los botones
 * Crear grupo y Unirme con un código. Se lee una vez al abrir (sin listeners).
 */
export function MyGroupsScreen({ onBack, onCreate, onJoin, onOpened, onOpenArchived }: Props) {
  const myGroups = useMyGroups();
  const switchGroup = useSwitchGroup();
  const [limitShown, setLimitShown] = useState(false);
  const { active, archived } = splitGroups(myGroups.groups);

  const guarded = (action?: () => void) => () => {
    if (myGroups.limitReached) {
      setLimitShown(true);
      return;
    }
    action?.();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Mis grupos" backLabel="Volver" onBack={onBack} />
      {myGroups.status === 'error' ? (
        <LoadErrorState onRetry={myGroups.retry} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>
            Tocá uno para verlo. Podés estar en todos los que quieras.
          </Text>

          {myGroups.status === 'loading' && <Text style={styles.status}>Buscando tus grupos…</Text>}

          {active.length > 0 && (
            <>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Activos <Text style={styles.sectionCount}>{active.length}</Text>
              </Text>
              <View style={styles.card}>
                {active.map((group, index) => (
                  <GroupRow
                    key={group.id}
                    group={group}
                    viewing={group.id === myGroups.currentId}
                    last={index === active.length - 1}
                    onPress={() => {
                      if (group.id !== myGroups.currentId) switchGroup(group);
                      onOpened?.();
                    }}
                  />
                ))}
              </View>
            </>
          )}

          {archived.length > 0 && (
            <>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Archivados <Text style={styles.sectionCount}>{archived.length}</Text>
              </Text>
              <View style={styles.card}>
                {archived.map((group, index) => (
                  <GroupRow
                    key={group.id}
                    group={group}
                    viewing={false}
                    last={index === archived.length - 1}
                    onPress={onOpenArchived && (() => onOpenArchived(group))}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        {limitShown && (
          <View accessibilityRole="alert" style={styles.notice}>
            <Icon name="alertCircle" size={22} color={colors.danger} />
            <Text style={styles.noticeText}>{myGroups.limitMessage}</Text>
          </View>
        )}
        <ButtonRow>
          <Button label="Crear grupo" icon="plus" large grow={1} onPress={guarded(onCreate)} />
          <Button
            label="Unirme con un código"
            variant="secondary"
            large
            grow={1}
            onPress={guarded(onJoin)}
          />
        </ButtonRow>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  intro: {
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  status: {
    paddingVertical: 24,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.bodyLarge,
    color: colors.textPrimary,
  },
  sectionCount: { color: colors.textSecondary },
  card: { borderRadius: radii.group, backgroundColor: colors.surface, overflow: 'hidden' },
  row: {
    minHeight: 80,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  viewing: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  viewingLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.secondary,
    color: colors.primaryText,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.separator },
  rowText: { flex: 1 },
  rowName: { fontFamily: fonts.heading, fontSize: 19, color: colors.textPrimary },
  archivedText: { color: colors.textSecondary },
  rowDetail: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32, gap: 12 },
  notice: {
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
});
