import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, TextField } from '../components';
import { MAX_HOUSEHOLD_NAME } from '../data/householdLogic';
import { colors, fontSizes, fonts } from '../theme';

type Props = {
  visible: boolean;
  /** Nombre actual del hogar. */
  name: string;
  onClose: () => void;
  /** Guarda el nombre nuevo; rechaza (o devuelve `false`) si no se pudo. */
  onSave: (name: string) => Promise<boolean>;
};

/** Panel "Nombre del hogar" (`33-editar-hogar`): lo puede cambiar cualquier miembro. */
export function EditHouseholdSheet({ visible, name, onClose, onSave }: Props) {
  return (
    <BottomSheet visible={visible} title="Nombre del hogar" onClose={onClose}>
      <EditHouseholdForm name={name} onClose={onClose} onSave={onSave} />
    </BottomSheet>
  );
}

// El panel desmonta su contenido al cerrarse, así que el campo arranca con el nombre actual cada vez.
function EditHouseholdForm({ name, onClose, onSave }: Omit<Props, 'visible'>) {
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    setSaving(true);
    setFailed(false);
    try {
      if (await onSave(value)) {
        onClose();
        return;
      }
    } catch {
      // Sin conexión o sin permiso: se avisa abajo y se conserva lo escrito.
    }
    setSaving(false);
    setFailed(true);
  };

  return (
    <View>
      <Text style={styles.current}>
        Ahora se llama <Text style={styles.currentName}>{name}</Text>. Lo ven todas las personas del
        hogar.
      </Text>
      <TextField
        label="Nuevo nombre"
        value={value}
        onChangeText={(text) => {
          setValue(text);
          setFailed(false);
        }}
        maxLength={MAX_HOUSEHOLD_NAME}
        autoCapitalize="sentences"
        autoComplete="off"
        returnKeyType="done"
      />
      {failed && (
        <Text accessibilityRole="alert" style={styles.error}>
          No pudimos guardar el nombre. Revisá tu conexión y probá de nuevo.
        </Text>
      )}
      <View style={styles.actions}>
        <Button
          label={saving ? 'Guardando…' : 'Guardar'}
          large
          disabled={!value.trim() || saving}
          onPress={() => void save()}
        />
        <Button label="Cancelar" variant="secondary" large onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  current: {
    marginBottom: 12,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  currentName: { fontFamily: fonts.bodyBold, color: colors.textPrimary },
  error: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    color: colors.danger,
  },
  actions: { marginTop: 24, gap: 12 },
});
