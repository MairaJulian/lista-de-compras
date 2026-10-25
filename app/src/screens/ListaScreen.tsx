import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, ItemGroup, ItemRow, QuickAddField, StatusPill } from '../components';
import { useHousehold, useList, useListContents, useMemberLookup } from '../data/hooks';
import { formatQuantity } from '../data/listLogic';
import type { ListItem } from '../data/types';
import { colors, fontSizes, fonts, radii } from '../theme';

type Props = {
  listId: string;
  onBack?: () => void;
};

export function ListaScreen({ listId, onBack }: Props) {
  const list = useList(listId);
  const household = useHousehold();
  const { pending, done, online, unsyncedCount, toggle, add, toggleOnline } =
    useListContents(listId);
  const memberOf = useMemberLookup();
  const [draft, setDraft] = useState('');
  const { top, bottom } = useSafeAreaInsets();

  const submit = () => {
    if (!draft.trim()) return;
    add(draft);
    setDraft('');
  };

  const renderRow = (item: ListItem) => {
    // Avatar de quien lo agregó mientras está pendiente y de quien lo tildó al pasar a comprados.
    const author = memberOf(item.done && item.doneBy ? item.doneBy : item.addedBy);
    return (
      <ItemRow
        key={item.id}
        name={item.name}
        quantity={formatQuantity(item)}
        done={item.done}
        pendingSync={item.pendingSync}
        addedBy={author}
        onToggle={() => toggle(item.id)}
      />
    );
  };

  const empty = pending.length === 0 && done.length === 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a las listas"
          onPress={onBack}
          style={styles.back}
        >
          <Icon name="back" size={30} />
        </Pressable>
        <View style={styles.titles}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {list?.name}
          </Text>
          <Text style={styles.household}>{household.name}</Text>
        </View>
        <StatusPill online={online} onPress={toggleOnline} />
      </View>

      {!online && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{offlineMessage(unsyncedCount)}</Text>
        </View>
      )}

      <View style={styles.quickAdd}>
        <QuickAddField value={draft} onChangeText={setDraft} onSubmit={submit} />
      </View>

      {empty ? (
        <View style={styles.empty}>
          <View style={styles.emptyCircle}>
            <Icon name="cart" size={56} color={colors.primary} />
          </View>
          <Text accessibilityRole="header" style={styles.emptyTitle}>
            Esta lista está vacía
          </Text>
          <Text style={styles.emptyText}>
            Escribí arriba lo que falta comprar y se suma para todos en casa.
          </Text>
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: 28 + bottom }]}
        >
          <SectionTitle label="Pendientes" count={pending.length} />
          {pending.length > 0 && <ItemGroup>{pending.map(renderRow)}</ItemGroup>}
          {done.length > 0 && (
            <>
              <SectionTitle label="Comprados" count={done.length} muted />
              <ItemGroup>{done.map(renderRow)}</ItemGroup>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function offlineMessage(unsyncedCount: number) {
  if (unsyncedCount === 0) {
    return 'Los cambios se guardan en tu celular y se sincronizan cuando vuelva la conexión.';
  }
  return unsyncedCount === 1
    ? '1 cambio sin sincronizar. Se enviará solo cuando vuelva la conexión.'
    : `${unsyncedCount} cambios sin sincronizar. Se enviarán solos cuando vuelva la conexión.`;
}

function SectionTitle({ label, count, muted }: { label: string; count: number; muted?: boolean }) {
  return (
    <View style={[styles.sectionTitle, muted && styles.sectionTitleSpaced]}>
      <Text accessibilityRole="header" style={[styles.sectionLabel, muted && styles.muted]}>
        {label}
      </Text>
      <Text style={[styles.sectionLabel, styles.muted]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 16,
  },
  back: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  household: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  notice: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.notice,
    backgroundColor: colors.amberSoft,
  },
  noticeText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    lineHeight: 18,
    color: colors.amberText,
  },
  quickAdd: { marginTop: 14, marginBottom: 8, marginHorizontal: 20 },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    padding: 8,
    paddingHorizontal: 4,
  },
  sectionTitleSpaced: { paddingTop: 24 },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textPrimary,
  },
  muted: { color: colors.textSecondary },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingBottom: 120,
    gap: 12,
  },
  emptyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    lineHeight: 29,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: 24,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
