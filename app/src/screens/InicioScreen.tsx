import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fab, ListCard } from '../components';
import {
  useCreateList,
  useHousehold,
  useHouseholdLoad,
  useIsRealSession,
  useLists,
} from '../data/hooks';
import type { ListSummary } from '../data/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NewListSheet } from '../sheets/NewListSheet';
import { colors, fontSizes, fonts } from '../theme';
import { LoadErrorState, NoListsState } from './InicioStates';

type Props = {
  onOpenList?: (list: ListSummary) => void;
};

export function InicioScreen({ onOpenList }: Props) {
  const household = useHousehold();
  const lists = useLists();
  const createList = useCreateList();
  const [newListOpen, setNewListOpen] = useState(false);
  const load = useHouseholdLoad();
  const realSession = useIsRealSession();
  const { top } = useSafeAreaInsets();

  // Las tarjetas van de a dos por fila.
  const rows: ListSummary[][] = [];
  for (let i = 0; i < lists.length; i += 2) {
    rows.push(lists.slice(i, i + 2));
  }

  const header = (
    <View style={[styles.header, { paddingTop: top + 32 }]}>
      {/* Sin nombre (leyendo o con error) no hay nada que mostrar arriba del título. */}
      {household.name !== '' && <Text style={styles.household}>{household.name}</Text>}
      <Text accessibilityRole="header" style={styles.title}>
        Listas
      </Text>
    </View>
  );

  // Las listas reales llegan en la Etapa 4: hasta entonces "Nueva lista" avisa en vez de crear.
  const onNewList = () => {
    if (realSession) {
      Alert.alert('Todavía no se pueden crear listas', 'Las listas llegan en la próxima etapa.');
    } else {
      setNewListOpen(true);
    }
  };

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
          {body}
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {header}
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
                {row.length === 1 && <View style={styles.spacer} />}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      {load.status === 'ready' && (
        <View style={styles.fab}>
          <Fab label="Nueva lista" icon="plus" onPress={onNewList} />
        </View>
      )}
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
  household: {
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
  grid: { paddingHorizontal: 24, paddingVertical: 16, gap: 16 },
  row: { flexDirection: 'row', gap: 16 },
  spacer: { flex: 1 },
  fill: { flex: 1 },
  fab: { position: 'absolute', right: 20, bottom: 20 },
});
