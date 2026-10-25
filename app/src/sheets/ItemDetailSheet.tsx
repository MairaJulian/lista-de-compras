import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, BottomSheet, Button, QuantityStepper, TextField } from '../components';
import type { ItemPatch } from '../data/listLogic';
import type { ListItem, Member } from '../data/types';
import { colors, fontSizes, fonts, sizes } from '../theme';

type Props = {
  visible: boolean;
  /** Ítem tocado. Puede desaparecer (Eliminar) mientras el panel todavía se está cerrando. */
  item: ListItem | undefined;
  addedBy: Member;
  onClose: () => void;
  onSave: (itemId: string, patch: ItemPatch) => void;
  onDelete: (itemId: string) => void;
};

/** Panel "Detalle del ítem" (`10-detalle-item`). */
export function ItemDetailSheet({ visible, item, addedBy, onClose, onSave, onDelete }: Props) {
  // Si el ítem se elimina, el panel sigue mostrando el último mientras baja.
  const [current, setCurrent] = useState(item);
  if (item && item !== current) setCurrent(item);

  return (
    <BottomSheet visible={visible} title="Detalle del ítem" onClose={onClose}>
      {current && (
        <DetailForm
          item={current}
          addedBy={addedBy}
          onSave={(patch) => onSave(current.id, patch)}
          onDelete={() => onDelete(current.id)}
        />
      )}
    </BottomSheet>
  );
}

// Se monta cada vez que se abre el panel, así los campos arrancan con los datos del ítem.
function DetailForm({
  item,
  addedBy,
  onSave,
  onDelete,
}: {
  item: ListItem;
  addedBy: Member;
  onSave: (patch: ItemPatch) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ?? 1);
  const [note, setNote] = useState(item.note ?? '');

  const save = () => {
    // Solo los campos que cambiaron, para no pisar lo que otra persona tocó en el resto.
    const patch: ItemPatch = {};
    if (name.trim() !== item.name) patch.name = name;
    if (quantity !== (item.quantity ?? 1)) patch.quantity = quantity;
    if (note.trim() !== (item.note ?? '')) patch.note = note.trim() || undefined;
    onSave(patch);
  };

  return (
    <View>
      <TextField label="Nombre" value={name} onChangeText={setName} returnKeyType="done" />
      <View style={styles.quantityRow}>
        <Text style={styles.quantityLabel}>Cantidad</Text>
        <QuantityStepper
          value={quantity}
          onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
          onIncrement={() => setQuantity((q) => q + 1)}
        />
      </View>
      <TextField label="Nota" value={note} onChangeText={setNote} multiline />
      <View style={styles.author}>
        <Avatar name={addedBy.name} tone={addedBy.tone} size={sizes.avatarLarge} />
        <View>
          <Text style={styles.authorLabel}>Agregado por</Text>
          <Text style={styles.authorName}>{addedBy.name}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button label="Eliminar" variant="danger" flex={1} onPress={onDelete} />
        <Button label="Guardar" flex={2} disabled={!name.trim()} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quantityRow: {
    height: 64,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textPrimary,
  },
  author: { height: 64, marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 12 },
  authorLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  authorName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.body, color: colors.textPrimary },
  actions: { marginTop: 8, flexDirection: 'row', gap: 12 },
});
