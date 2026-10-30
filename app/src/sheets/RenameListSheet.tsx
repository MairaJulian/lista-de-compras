import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, TextField } from '../components';
import { MAX_LIST_NAME } from '../data/listLogic';
import { colors, fontSizes, fonts } from '../theme';

type Props = {
  visible: boolean;
  /** Nombre actual de la lista. */
  name: string;
  onClose: () => void;
  /** Guarda el nombre nuevo. No se espera al servidor: si lo rechaza, queda el aviso rojo en la lista. */
  onSave: (name: string) => void;
};

/** Panel "Nombre de la lista" (`35-renombrar-lista`): lo puede cambiar cualquier miembro. */
export function RenameListSheet({ visible, name, onClose, onSave }: Props) {
  return (
    <BottomSheet visible={visible} title="Nombre de la lista" onClose={onClose}>
      <RenameListForm name={name} onClose={onClose} onSave={onSave} />
    </BottomSheet>
  );
}

// El panel desmonta su contenido al cerrarse, así que el campo arranca con el nombre actual cada vez.
function RenameListForm({ name, onClose, onSave }: Omit<Props, 'visible'>) {
  const [value, setValue] = useState(name);

  return (
    <View>
      <Text style={styles.current}>
        Ahora se llama <Text style={styles.currentName}>{name}</Text>. Lo ven todas las personas del
        hogar.
      </Text>
      <TextField
        label="Nuevo nombre"
        value={value}
        onChangeText={setValue}
        maxLength={MAX_LIST_NAME}
        autoCapitalize="sentences"
        autoComplete="off"
        returnKeyType="done"
      />
      <View style={styles.actions}>
        <Button
          label="Guardar"
          large
          disabled={!value.trim()}
          onPress={() => {
            onSave(value);
            onClose();
          }}
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
  actions: { marginTop: 24, gap: 12 },
});
