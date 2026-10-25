import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fab, ListCard } from '../components';
import { useCreateList, useHousehold, useLists } from '../data/hooks';
import type { ListSummary } from '../data/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NewListSheet } from '../sheets/NewListSheet';
import { colors, fontSizes, fonts } from '../theme';

type Props = {
  onOpenList?: (list: ListSummary) => void;
};

export function InicioScreen({ onOpenList }: Props) {
  const household = useHousehold();
  const lists = useLists();
  const createList = useCreateList();
  const [newListOpen, setNewListOpen] = useState(false);
  const { top } = useSafeAreaInsets();

  // Las tarjetas van de a dos por fila.
  const rows: ListSummary[][] = [];
  for (let i = 0; i < lists.length; i += 2) {
    rows.push(lists.slice(i, i + 2));
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.header, { paddingTop: top + 32 }]}>
          <Text style={styles.household}>{household.name}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Listas
          </Text>
        </View>
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
      <View style={styles.fab}>
        <Fab label="Nueva lista" icon="plus" onPress={() => setNewListOpen(true)} />
      </View>
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
  fab: { position: 'absolute', right: 20, bottom: 20 },
});
