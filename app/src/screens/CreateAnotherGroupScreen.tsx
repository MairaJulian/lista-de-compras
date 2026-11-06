import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, GroupBadge, Icon, LargeField, ScreenHeader } from '../components';
import { GROUP_TYPES, groupAppearance, type GroupTone } from '../data/groupLogic';
import type { GroupType } from '../data/householdLogic';
import { colors, fontSizes, fonts, radii } from '../theme';

type Props = {
  onBack?: () => void;
  /** Crea el grupo. Si devuelve `false` o falla se avisa en rojo y se conserva lo escrito. */
  onCreate?: (name: string, type: GroupType) => Promise<boolean | void> | boolean | void;
};

type Status = 'editing' | 'creating' | 'failed';

// Color del borde y del fondo de la opción elegida, según el tipo.
const selectedLook: Record<GroupTone, { background: string; border: string }> = {
  green: { background: colors.primarySoft, border: colors.primary },
  blue: { background: colors.blueSoft, border: colors.blueText },
  amber: { background: colors.amberSoft, border: colors.amberIcon },
  neutral: { background: colors.neutralSoft, border: colors.neutralText },
};

/**
 * Crear otro grupo (`49-crear-otro-grupo`): nombre y tipo (Familia, Amigos, Evento). Es para quien
 * ya está en otros grupos, que no se tocan. Para Evento avisa que se puede archivar al terminar.
 */
export function CreateAnotherGroupScreen({ onBack, onCreate }: Props) {
  const { bottom } = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [type, setType] = useState<GroupType>('familia');
  const [status, setStatus] = useState<Status>('editing');
  const creating = status === 'creating';
  const hasName = name.trim().length > 0;

  const create = async () => {
    setStatus('creating');
    try {
      const created = await onCreate?.(name.trim(), type);
      // Al crearse, la ruta cambia de pantalla: se deja en "Creando…" hasta entonces.
      if (created === false) setStatus('failed');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Crear otro grupo" backLabel="Volver" onBack={onBack} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text accessibilityRole="header" style={styles.title}>
          ¿Cómo se llama el grupo?
        </Text>
        <Text style={styles.message}>
          Lo van a ver todas las personas que invites. Seguís en tus otros grupos.
        </Text>

        <View style={styles.field}>
          <LargeField
            label="Nombre del grupo"
            value={name}
            onChangeText={setName}
            editable={!creating}
            placeholder="Por ejemplo: Juntada del sábado"
          />
        </View>

        <Text style={styles.typeLabel}>¿Qué tipo de grupo es?</Text>
        <View accessibilityRole="radiogroup" style={styles.types}>
          {GROUP_TYPES.map((option) => {
            const { icon, tone } = groupAppearance(option.type);
            const selected = option.type === type;
            return (
              <Pressable
                key={option.type}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                disabled={creating}
                onPress={() => setType(option.type)}
                style={styles.type}
              >
                {/* Borde y fondo siempre presentes en la capa de abajo: así el redondeo no se pierde en Android. */}
                <View
                  style={[
                    styles.typeFill,
                    {
                      backgroundColor: selected ? selectedLook[tone].background : colors.surface,
                      borderColor: selected ? selectedLook[tone].border : colors.border,
                    },
                  ]}
                />
                <GroupBadge icon={icon} tone={selected ? tone : 'neutral'} size={40} />
                <Text style={styles.typeName}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.typeHint}>
          {type === 'evento'
            ? 'Cuando termine el evento, podés archivar el grupo y queda en solo lectura.'
            : 'El tipo solo cambia el color y el ícono del grupo.'}
        </Text>

        {status === 'failed' && (
          <View accessibilityRole="alert" style={styles.notice}>
            <Icon name="alertCircle" size={22} color={colors.danger} />
            <Text style={styles.noticeText}>
              No pudimos crear el grupo. No se perdió nada de lo que escribiste: revisá tu conexión
              y probá de nuevo.
            </Text>
          </View>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 32 + bottom }]}>
        <Button
          label={creating ? 'Creando…' : status === 'failed' ? 'Reintentar' : 'Crear grupo'}
          large
          disabled={!hasName || creating}
          onPress={() => void create()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  message: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: fontSizes.bodyLarge,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  field: { marginTop: 28 },
  typeLabel: {
    marginTop: 28,
    marginBottom: 10,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  type: {
    flexGrow: 1,
    flexBasis: 96,
    minHeight: 92,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  typeFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.card,
    borderWidth: 2,
  },
  typeName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.body, color: colors.textPrimary },
  typeHint: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  notice: {
    marginTop: 20,
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
  footer: { paddingTop: 12, paddingHorizontal: 24 },
});
