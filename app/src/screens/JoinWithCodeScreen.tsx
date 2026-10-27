import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Button, FormLayout, Icon, LargeField } from '../components';
import { normalizeInviteCode, type JoinResult } from '../data/joinLogic';
import { colors, fontSizes, fonts } from '../theme';

type Props = {
  onBack?: () => void;
  /** Se une con el código. Si devuelve `invalid` se muestra `30-error-codigo`. */
  onJoin?: (code: string) => Promise<JoinResult | void> | JoinResult | void;
  /** Cómo se lee el portapapeles; por defecto el del sistema. */
  readClipboard?: () => Promise<string>;
};

/**
 * Unirme con un código (`18-sin-hogar-codigo`): "Unirme" se habilita al haber texto y, mientras se
 * une, queda en "Uniéndome…". Si el código no existe, venció o se desactivó, `30-error-codigo`.
 */
export function JoinWithCodeScreen({
  onBack,
  onJoin,
  readClipboard = Clipboard.getStringAsync,
}: Props) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const hasCode = code.trim().length > 0;

  const change = (text: string) => {
    setCode(text);
    setInvalid(false);
  };

  const paste = async () => {
    const text = (await readClipboard()).trim();
    if (text) {
      change(normalizeInviteCode(text));
    }
  };

  const join = async () => {
    setJoining(true);
    setInvalid(false);
    try {
      const result = await onJoin?.(normalizeInviteCode(code));
      if (result === 'invalid') setInvalid(true);
    } finally {
      setJoining(false);
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
        <Button
          label={joining ? 'Uniéndome…' : 'Unirme'}
          large
          disabled={!hasCode || joining}
          onPress={() => void join()}
        />
      }
    >
      <LargeField
        label="Código de invitación"
        code
        value={code}
        onChangeText={change}
        editable={!joining}
        placeholder="K7P2-9XQ-4MN"
        autoCapitalize="characters"
        error={
          invalid ? 'Este código no existe o ya venció. Revisalo o pedí uno nuevo.' : undefined
        }
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
