import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Icon, ScreenHeader } from '../components';
import {
  useCurrentMember,
  useHousehold,
  useHouseholdLoad,
  useLists,
  useUnarchiveGroup,
} from '../data/hooks';
import { colors, fontSizes, fonts, radii } from '../theme';
import { ActionError } from './HogarScreen';
import { LoadErrorState } from './InicioStates';

type Props = {
  onBack?: () => void;
  /** Después de desarchivar: va a Mis grupos (`48`), donde el grupo ya está en Activos. */
  onUnarchived?: () => void;
};

/**
 * Un grupo archivado visto desde Archivados (`52-grupo-archivado`): "Archivado · solo lectura", el
 * aviso con **Desarchivar grupo** (solo quien lo creó) y las listas en gris con candado, sin
 * contadores ni botón de nueva lista. Las listas todavía no se abren.
 */
export function ArchivedGroupScreen({ onBack, onUnarchived }: Props) {
  const household = useHousehold();
  const load = useHouseholdLoad();
  const lists = useLists();
  const current = useCurrentMember();
  const unarchive = useUnarchiveGroup();
  const [action, setAction] = useState<'idle' | 'busy' | 'failed'>('idle');
  const isCreator = current.role === 'creator';

  const confirm = async () => {
    setAction('busy');
    try {
      await unarchive();
    } catch {
      setAction('failed');
      return;
    }
    setAction('idle');
    onUnarchived?.();
  };

  const rows: (typeof lists)[] = [];
  for (let i = 0; i < lists.length; i += 2) rows.push(lists.slice(i, i + 2));

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={household.name}
        subtitle="Archivado · solo lectura"
        backLabel="Volver"
        onBack={onBack}
      />
      {load.status === 'error' ? (
        <LoadErrorState onRetry={load.retry} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {load.status === 'loading' && <Text style={styles.status}>Cargando…</Text>}
          <View style={styles.notice}>
            <View style={styles.noticeTop}>
              <Icon name="archive" size={28} color={colors.neutralText} />
              <View style={styles.noticeText}>
                <Text style={styles.noticeTitle}>Este grupo está archivado</Text>
                <Text style={styles.noticeBody}>
                  Podés ver sus listas, pero no cambiarlas. Si lo desarchivás, vuelve a Activos.
                </Text>
              </View>
            </View>
            {isCreator && (
              <Button
                label={action === 'busy' ? 'Desarchivando…' : 'Desarchivar grupo'}
                disabled={action === 'busy'}
                onPress={() => void confirm()}
              />
            )}
            {action === 'failed' && (
              <ActionError>
                No pudimos desarchivar el grupo. Revisá tu conexión y probá de nuevo.
              </ActionError>
            )}
            <Text style={styles.noticeNote}>Solo lo puede hacer quien creó el grupo.</Text>
          </View>

          {rows.map((row) => (
            <View key={row[0].id} style={styles.row}>
              {row.map((list) => (
                <View
                  key={list.id}
                  accessible
                  accessibilityLabel={`${list.name}, solo lectura`}
                  style={styles.card}
                >
                  <View style={styles.lock}>
                    <Icon name="lock" size={22} color={colors.neutralText} />
                  </View>
                  <View>
                    <Text style={styles.cardName}>{list.name}</Text>
                    <Text style={styles.cardCaption}>Solo lectura</Text>
                  </View>
                </View>
              ))}
              {row.length === 1 && <View style={styles.spacer} />}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingVertical: 16, gap: 16 },
  status: { fontFamily: fonts.body, fontSize: fontSizes.secondary, color: colors.textSecondary },
  notice: {
    backgroundColor: colors.neutralSoft,
    borderRadius: radii.card,
    padding: 20,
    gap: 14,
  },
  noticeTop: { flexDirection: 'row', gap: 14 },
  noticeText: { flex: 1, gap: 4 },
  noticeTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.body,
    color: colors.neutralText,
  },
  noticeBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    color: colors.textSecondary,
  },
  noticeNote: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', gap: 16 },
  spacer: { flex: 1 },
  card: {
    flex: 1,
    minHeight: 172,
    justifyContent: 'space-between',
    backgroundColor: colors.neutralSoft,
    borderRadius: radii.card,
    padding: 16,
  },
  lock: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  cardName: { fontFamily: fonts.heading, fontSize: fontSizes.body, color: colors.neutralText },
  cardCaption: {
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    color: colors.textSecondary,
  },
});
