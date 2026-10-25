import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Avatar,
  BottomSheet,
  Button,
  CenteredDialog,
  Icon,
  ItemGroup,
  ItemRow,
  ListCard,
  QuickAddField,
  StatusPill,
  TextField,
} from '../components';
import { useInsets } from '../system/insets';
import { colors, fontSizes, fonts, listTones, ListTone } from '../theme';

const vos = { name: 'Vos', tone: 'green' } as const;
const lucia = { name: 'Lucía', tone: 'amber' } as const;
const diego = { name: 'Diego', tone: 'blue' } as const;

/** Pantalla de desarrollo (solo `__DEV__`): todos los componentes juntos para revisarlos de un vistazo. */
export function ComponentsScreen({ onBack }: { onBack?: () => void }) {
  const { top, bottom } = useInsets();
  const [online, setOnline] = useState(true);
  const [draft, setDraft] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [color, setColor] = useState<ListTone>('green');

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: top + 32, paddingBottom: 40 + bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Componentes
          </Text>
          {onBack && (
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
              <Icon name="back" />
              <Text style={styles.backText}>Volver</Text>
            </Pressable>
          )}
        </View>

        <Section title="Avatares">
          <View style={styles.row}>
            <Avatar {...vos} />
            <Avatar {...lucia} />
            <Avatar {...diego} />
            <Avatar {...lucia} size={36} />
          </View>
        </Section>

        <Section title="Botones">
          <Button label="Guardar" />
          <Button label="Quedarme" variant="secondary" />
          <Button label="Eliminar" variant="danger" />
          <Button label="Crear lista" large />
          <Button label="Deshabilitado" disabled />
        </Section>

        <Section title="Indicador de conexión">
          <View style={styles.row}>
            <StatusPill online={online} onPress={() => setOnline((value) => !value)} />
          </View>
        </Section>

        <Section title="Tarjetas de lista">
          <View style={styles.row}>
            <ListCard name="Supermercado" pendingCount={7} tone="green" icon="cart" />
            <ListCard name="Verdulería" pendingCount={5} tone="amber" icon="leaf" />
          </View>
          <View style={styles.row}>
            <ListCard name="Farmacia" pendingCount={2} tone="blue" icon="plusSquare" />
            <ListCard name="Ferretería" pendingCount={0} tone="neutral" icon="wrench" />
          </View>
        </Section>

        <Section title="Filas de ítem">
          <ItemGroup>
            <ItemRow name="Leche" quantity="×2" addedBy={lucia} />
            <ItemRow name="Pan lactal" addedBy={vos} />
            <ItemRow name="Pilas AA" quantity="×4" pendingSync addedBy={vos} />
            <ItemRow
              name="Yerba mate con un nombre muy largo que no entra en la fila"
              quantity="1 kg"
              addedBy={diego}
            />
          </ItemGroup>
          <ItemGroup>
            <ItemRow name="Arroz" done={done} onToggle={() => setDone((v) => !v)} addedBy={diego} />
            <ItemRow name="Detergente" done quantity="×2" addedBy={vos} />
          </ItemGroup>
        </Section>

        <Section title="Campos de texto">
          <QuickAddField value={draft} onChangeText={setDraft} onSubmit={() => setDraft('')} />
          <TextField label="Nombre" placeholder="Por ejemplo: Panadería" />
          <TextField label="Nota" multiline />
        </Section>

        <Section title="Colores de lista">
          <View style={styles.row}>
            {(Object.keys(listTones) as ListTone[]).map((tone) => (
              <Pressable
                key={tone}
                accessibilityRole="button"
                accessibilityState={{ selected: color === tone }}
                accessibilityLabel={`Color ${tone}`}
                onPress={() => setColor(tone)}
                style={[styles.swatch, { backgroundColor: listTones[tone].swatch }]}
              >
                {color === tone && <Icon name="check" size={22} />}
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Panel inferior y aviso">
          <Button label="Abrir panel" variant="secondary" onPress={() => setSheetOpen(true)} />
          <Button label="Abrir aviso" variant="secondary" onPress={() => setDialogOpen(true)} />
        </Section>
      </ScrollView>

      <BottomSheet visible={sheetOpen} title="Nueva lista" onClose={() => setSheetOpen(false)}>
        <TextField label="Nombre" placeholder="Por ejemplo: Panadería" />
        <View style={styles.sheetAction}>
          <Button label="Crear lista" large onPress={() => setSheetOpen(false)} />
        </View>
      </BottomSheet>

      <CenteredDialog
        visible={dialogOpen}
        icon="trash"
        title="¿Salir de la lista?"
        message="Se van a borrar los 3 ítems comprados de Supermercado. Los pendientes se quedan."
        onClose={() => setDialogOpen(false)}
      >
        <Button label="Salir y borrar" onPress={() => setDialogOpen(false)} />
        <Button label="Quedarme" variant="secondary" onPress={() => setDialogOpen(false)} />
      </CenteredDialog>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.screenTitle, color: colors.textPrimary },
  back: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.body, color: colors.textPrimary },
  section: { gap: 8 },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textSecondary,
  },
  sectionBody: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetAction: { marginTop: 28 },
});
