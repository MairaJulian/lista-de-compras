import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, SwatchPicker, TextField } from '../components';
import { MAX_LIST_NAME } from '../data/listLogic';
import type { ListTone } from '../theme';
import { colors, fontSizes, fonts } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, tone: ListTone) => void;
};

/** Panel "Nueva lista" (`04-nueva-lista`): nombre y 1 de 4 colores. */
export function NewListSheet({ visible, onClose, onCreate }: Props) {
  return (
    <BottomSheet visible={visible} title="Nueva lista" onClose={onClose}>
      <NewListForm onCreate={onCreate} />
    </BottomSheet>
  );
}

// El panel desmonta su contenido al cerrarse, así que el formulario empieza vacío cada vez.
function NewListForm({ onCreate }: { onCreate: (name: string, tone: ListTone) => void }) {
  const [name, setName] = useState('');
  const [tone, setTone] = useState<ListTone>('green');

  return (
    <View>
      <TextField
        label="Nombre"
        placeholder="Por ejemplo: Panadería"
        value={name}
        onChangeText={setName}
        autoCapitalize="sentences"
        autoComplete="off"
        maxLength={MAX_LIST_NAME}
        returnKeyType="done"
      />
      <Text style={styles.colorLabel}>Color</Text>
      <SwatchPicker value={tone} onChange={setTone} />
      <View style={styles.action}>
        <Button
          label="Crear lista"
          large
          disabled={!name.trim()}
          onPress={() => onCreate(name, tone)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  colorLabel: {
    marginTop: 20,
    marginBottom: 10,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  action: { marginTop: 28 },
});
