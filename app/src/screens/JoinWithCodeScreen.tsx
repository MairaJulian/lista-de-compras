import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Button, FormLayout, Icon, LargeField } from '../components';
import { colors, fontSizes, fonts } from '../theme';

type Props = {
  onBack?: () => void;
  onJoin?: (code: string) => void;
  /** Cómo se lee el portapapeles; por defecto el del sistema. */
  readClipboard?: () => Promise<string>;
};

/** Unirme con un código (`18-sin-hogar-codigo`): "Unirme" se habilita al haber texto. */
export function JoinWithCodeScreen({
  onBack,
  onJoin,
  readClipboard = Clipboard.getStringAsync,
}: Props) {
  const [code, setCode] = useState('');
  const hasCode = code.trim().length > 0;

  const paste = async () => {
    const text = (await readClipboard()).trim();
    if (text) {
      setCode(text);
    }
  };

  return (
    <FormLayout
      headerTitle="Unirme con un código"
      onBack={onBack}
      icon="link"
      title="Escribí o pegá tu código"
      message="Te lo pasó quien creó el hogar. Tiene letras y números."
      footer={
        <Button label="Unirme" large disabled={!hasCode} onPress={() => onJoin?.(code.trim())} />
      }
    >
      <LargeField
        label="Código de invitación"
        code
        value={code}
        onChangeText={setCode}
        placeholder="K7P2-9XQ-4MN"
        autoCapitalize="characters"
        trailing={
          <Pressable accessibilityRole="button" onPress={paste} style={styles.paste}>
            <Icon name="paste" size={18} color={colors.primaryText} />
            <Text style={styles.pasteLabel}>Pegar</Text>
          </Pressable>
        }
      />
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  paste: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pasteLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.primaryText },
});
