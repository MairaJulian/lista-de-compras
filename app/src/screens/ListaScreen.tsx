import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  CenteredDialog,
  Icon,
  ItemGroup,
  ItemRow,
  QuickAddField,
  SaveErrorNotice,
  StatusPill,
  UndoToast,
} from '../components';
import { noticeCopy, type ListRow } from '../data/failureLogic';
import {
  useHousehold,
  useIsRealSession,
  useList,
  useListActions,
  useListContents,
  useMemberLookup,
  useRemovedList,
} from '../data/hooks';
import { formatQuantity, MAX_ITEM_NAME } from '../data/listLogic';
import { ItemDetailSheet } from '../sheets/ItemDetailSheet';
import { ListMenuSheet } from '../sheets/ListMenuSheet';
import { RenameListSheet } from '../sheets/RenameListSheet';
import { colors, fontSizes, fonts, radii } from '../theme';

type Props = {
  listId: string;
  onBack?: () => void;
};

export function ListaScreen({ listId, onBack }: Props) {
  const list = useList(listId);
  const household = useHousehold();
  const {
    pending,
    done,
    online,
    showConnection,
    unsyncedCount,
    failures,
    toggle,
    add,
    update,
    remove,
    restore,
    removeDone,
    toggleOnline,
  } = useListContents(listId);
  const memberOf = useMemberLookup();
  const { rename, remove: removeList } = useListActions(listId);
  const removedList = useRemovedList(listId);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Quien confirma "Eliminar lista" vuelve a Inicio: el aviso `38` es para las demás personas.
  const [deleting, setDeleting] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  // Último ítem eliminado, mientras todavía se puede deshacer.
  const [undoId, setUndoId] = useState<string>();
  const dismissUndo = useCallback(() => setUndoId(undefined), []);
  const realSession = useIsRealSession();
  const { top, bottom } = useSafeAreaInsets();
  // Con los datos de ejemplo, salir con ítems comprados pide confirmación y los borra (`08`). En la
  // sesión real esa limpieza es de la Etapa 6: la flecha vuelve directo a Inicio y no borra nada.
  const hasDone = done.length > 0 && !realSession;

  const goBack = () => (hasDone ? setLeaveOpen(true) : onBack?.());

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!hasDone) return false;
      setLeaveOpen(true);
      return true;
    });
    return () => subscription.remove();
  }, [hasDone]);

  const leaveAndDelete = () => {
    removeDone();
    setLeaveOpen(false);
    onBack?.();
  };

  const openDetail = (itemId: string) => {
    setDetailId(itemId);
    setDetailOpen(true);
  };

  const detailItem = [...pending, ...done].find(
    (row) => row.item.id === detailId && !row.local,
  )?.item;

  // Si otra persona eliminó la lista, sus cambios sin guardar se pierden con ella.
  const { discard: discardFailures } = failures;
  const listRemoved = removedList !== undefined && !deleting;
  useEffect(() => {
    if (listRemoved) discardFailures();
  }, [listRemoved, discardFailures]);

  const confirmDelete = () => {
    setDeleting(true);
    setDeleteOpen(false);
    removeList();
    onBack?.();
  };

  const submit = () => {
    if (!draft.trim()) return;
    add(draft);
    setDraft('');
  };

  const renderRow = ({ item, error, local }: ListRow) => {
    // Avatar de quien lo agregó mientras está pendiente y de quien lo tildó al pasar a comprados.
    const author = memberOf(item.done && item.doneBy ? item.doneBy : item.addedBy);
    return (
      <ItemRow
        key={item.id}
        name={item.name}
        quantity={formatQuantity(item)}
        done={item.done}
        pendingSync={item.pendingSync}
        error={error}
        addedBy={author}
        // Un ítem que el servidor no tiene todavía no se puede tildar ni editar.
        onToggle={local ? undefined : () => toggle(item.id)}
        onPress={local ? undefined : () => openDetail(item.id)}
      />
    );
  };

  const empty = pending.length === 0 && done.length === 0;
  const unsaved = failures.failures.length > 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a las listas"
          onPress={goBack}
          style={styles.back}
        >
          <Icon name="back" size={30} />
        </Pressable>
        <View style={styles.titles}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {list?.name ?? removedList?.name}
          </Text>
          <Text style={styles.household}>{household.name}</Text>
        </View>
        {showConnection && <StatusPill online={online} onPress={toggleOnline} />}
        {!showConnection && unsaved && <StatusPill online unsaved />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Menú de la lista"
          onPress={() => setMenuOpen(true)}
          style={styles.menu}
        >
          <Icon name="dots" size={26} />
        </Pressable>
      </View>

      {unsaved && (
        <View style={styles.notice}>
          <SaveErrorNotice
            {...noticeCopy(failures.failures)}
            onRetry={failures.retry}
            onDiscard={failures.discard}
          />
        </View>
      )}

      {showConnection && !online && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{offlineMessage(unsyncedCount)}</Text>
        </View>
      )}

      <View style={styles.quickAdd}>
        <QuickAddField
          value={draft}
          onChangeText={setDraft}
          onSubmit={submit}
          maxLength={MAX_ITEM_NAME}
        />
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

      <ItemDetailSheet
        visible={detailOpen}
        item={detailItem}
        addedBy={memberOf(detailItem?.addedBy ?? '')}
        onClose={() => setDetailOpen(false)}
        onSave={(itemId, patch) => {
          update(itemId, patch);
          setDetailOpen(false);
        }}
        onDelete={(itemId) => {
          setDetailOpen(false);
          remove(itemId);
          setUndoId(itemId);
        }}
      />

      {undoId !== undefined && (
        <UndoToast
          key={undoId}
          message="Ítem eliminado"
          actionLabel="Deshacer"
          bottomInset={bottom}
          onAction={() => {
            restore(undoId);
            dismissUndo();
          }}
          onTimeout={dismissUndo}
        />
      )}

      <ListMenuSheet
        visible={menuOpen}
        name={list?.name ?? ''}
        itemCount={pending.length + done.length}
        householdName={household.name}
        onClose={() => setMenuOpen(false)}
        onRename={() => {
          setMenuOpen(false);
          setRenameOpen(true);
        }}
        onDelete={() => {
          setMenuOpen(false);
          setDeleteOpen(true);
        }}
      />

      <RenameListSheet
        visible={renameOpen}
        name={list?.name ?? ''}
        onClose={() => setRenameOpen(false)}
        onSave={rename}
      />

      <CenteredDialog
        visible={deleteOpen}
        icon="trash"
        tone="danger"
        title={`¿Eliminar ${list?.name ?? ''}?`}
        message={deleteMessage(pending.length, done.length)}
        onClose={() => setDeleteOpen(false)}
      >
        <Button label="Eliminar lista" variant="dangerFilled" onPress={confirmDelete} />
        <Button label="Cancelar" variant="secondary" onPress={() => setDeleteOpen(false)} />
      </CenteredDialog>

      {/* Sin forma de cerrarlo: solo "Volver a las listas". */}
      <CenteredDialog
        visible={listRemoved}
        icon="trash"
        tone="neutral"
        title="Esta lista ya no existe"
        message={`${memberOf(removedList?.deletedBy ?? '').name} eliminó ${removedList?.name ?? ''}. Sus ítems y los cambios que no se alcanzaron a sincronizar se perdieron.`}
        onClose={() => {}}
      >
        <Button label="Volver a las listas" onPress={onBack} />
      </CenteredDialog>

      <CenteredDialog
        visible={leaveOpen}
        icon="trash"
        title="¿Salir de la lista?"
        message={leaveMessage(done.length, list?.name ?? '')}
        onClose={() => setLeaveOpen(false)}
      >
        <Button label="Salir y borrar" onPress={leaveAndDelete} />
        <Button label="Quedarme" variant="secondary" onPress={() => setLeaveOpen(false)} />
      </CenteredDialog>
    </View>
  );
}

/** "Se van a borrar los 10 ítems (7 pendientes y 3 comprados) y la lista desaparece..." (`36`). */
function deleteMessage(pending: number, done: number) {
  const total = pending + done;
  const ending = 'la lista desaparece para todo el hogar. No se puede deshacer.';
  if (total === 0) return `La lista está vacía y ${ending}`;
  const parts = [
    pending > 0 && (pending === 1 ? '1 pendiente' : `${pending} pendientes`),
    done > 0 && (done === 1 ? '1 comprado' : `${done} comprados`),
  ].filter(Boolean);
  return (
    <>
      {total === 1 ? 'Se va a borrar el ' : 'Se van a borrar los '}
      <Text style={styles.strong}>{total === 1 ? '1 ítem' : `${total} ítems`}</Text> (
      {parts.join(' y ')}) y {ending}
    </>
  );
}

function leaveMessage(doneCount: number, listName: string) {
  return doneCount === 1
    ? `Se va a borrar el ítem comprado de ${listName}. Los pendientes se quedan.`
    : `Se van a borrar los ${doneCount} ítems comprados de ${listName}. Los pendientes se quedan.`;
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
  menu: {
    width: 44,
    height: 44,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strong: { fontFamily: fonts.bodyBold, color: colors.textPrimary },
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
