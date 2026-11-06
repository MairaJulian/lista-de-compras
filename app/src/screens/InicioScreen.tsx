import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fab, Icon, ListCard, SaveErrorNotice } from '../components';
import { noticeCopy } from '../data/failureLogic';
import {
  useCreateList,
  useHomeFailures,
  useHousehold,
  useLists,
  useListsLoad,
} from '../data/hooks';
import type { ListSummary } from '../data/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GroupSwitcherSheet } from '../sheets/GroupSwitcherSheet';
import { NewListSheet } from '../sheets/NewListSheet';
import { colors, fontSizes, fonts, radii } from '../theme';
import { LoadErrorState, NoListsState } from './InicioStates';

type Props = {
  onOpenList?: (list: ListSummary) => void;
  /** Del panel "Tus grupos" (`47`): crear otro grupo, unirse a otro y ver todos. */
  onCreateGroup?: () => void;
  onJoinGroup?: () => void;
  onSeeGroups?: () => void;
};

export function InicioScreen({ onOpenList, onCreateGroup, onJoinGroup, onSeeGroups }: Props) {
  const household = useHousehold();
  const lists = useLists();
  const createList = useCreateList();
  const [newListOpen, setNewListOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const load = useListsLoad();
  const failures = useHomeFailures();
  const { top } = useSafeAreaInsets();

  // Las tarjetas van de a dos por fila.
  const rows: ListSummary[][] = [];
  for (let i = 0; i < lists.length; i += 2) {
    rows.push(lists.slice(i, i + 2));
  }

  const header = (
    <View style={[styles.header, { paddingTop: top + 32 }]}>
      {/* Sin nombre (leyendo o con error) no hay nada que mostrar arriba del título. */}
      {household.name !== '' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${household.name}. Cambiar de grupo`}
          onPress={() => setGroupsOpen(true)}
          style={styles.switcher}
        >
          <View style={styles.switcherFill} />
          <Text style={styles.household}>{household.name}</Text>
          <Icon name="chevronDown" size={20} color={colors.textSecondary} />
        </Pressable>
      )}
      <Text accessibilityRole="header" style={styles.title}>
        Listas
      </Text>
    </View>
  );

  // Crear o eliminar una lista que el servidor rechazó (no hay fila que marcar: va todo en el aviso).
  const notice = failures.failures.length > 0 && (
    <View style={styles.notice}>
      <SaveErrorNotice
        {...noticeCopy(failures.failures)}
        onRetry={failures.retry}
        onDiscard={failures.discard}
      />
    </View>
  );

  let body: React.ReactNode;
  if (load.status === 'error') {
    body = <LoadErrorState onRetry={load.retry} />;
  } else if (load.status === 'loading') {
    body = <View style={styles.fill} />;
  } else if (lists.length === 0) {
    body = <NoListsState />;
  }

  return (
    <View style={styles.screen}>
      {body ? (
        <>
          {header}
          {notice}
          {body}
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {header}
          {notice}
          <View style={styles.grid}>
            {rows.map((row) => (
              <View key={row[0].id} style={styles.row}>
                {row.map((list) => (
                  <ListCard
                    key={list.id}
                    name={list.name}
                    pendingCount={list.pendingCount}
                    tone={list.tone}
                    icon={list.icon}
                    onPress={onOpenList && (() => onOpenList(list))}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      {load.status === 'ready' && (
        <View style={styles.fab}>
          <Fab label="Nueva lista" icon="plus" onPress={() => setNewListOpen(true)} />
        </View>
      )}
      <GroupSwitcherSheet
        visible={groupsOpen}
        onClose={() => setGroupsOpen(false)}
        onCreate={() => {
          setGroupsOpen(false);
          onCreateGroup?.();
        }}
        onJoin={() => {
          setGroupsOpen(false);
          onJoinGroup?.();
        }}
        onSeeAll={() => {
          setGroupsOpen(false);
          onSeeGroups?.();
        }}
      />
      <NewListSheet
        visible={newListOpen}
        onClose={() => setNewListOpen(false)}
        onCreate={(name, tone) => {
          createList(name, tone);
          setNewListOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  // Espacio abajo para que el botón flotante no tape la última fila.
  content: { paddingBottom: 100 },
  header: { paddingHorizontal: 24, paddingBottom: 8, gap: 2 },
  // El fondo va en una capa propia (siempre montada): el redondeo se conserva en Android.
  switcher: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  switcherFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.pill,
    backgroundColor: colors.neutralSoft,
  },
  household: {
    flexShrink: 1,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitleLarge,
    lineHeight: 37,
    color: colors.textPrimary,
  },
  notice: { marginHorizontal: 24, marginTop: 12 },
  grid: { paddingHorizontal: 24, paddingVertical: 16, gap: 16 },
  row: { flexDirection: 'row', gap: 16 },
  fill: { flex: 1 },
  fab: { position: 'absolute', right: 20, bottom: 20 },
});
