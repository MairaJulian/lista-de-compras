import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, CenteredDialog, Icon, ScreenHeader } from '../components';
import { formatExpiry } from '../data/householdLogic';
import { useHousehold, useInvite } from '../data/hooks';
import { inviteLink, inviteMessage } from '../data/inviteLogic';
import { colors, fontSizes, fonts, radii } from '../theme';
import { LoadErrorState } from './InicioStates';

type Props = {
  onBack?: () => void;
  /** Cómo se comparte el enlace; por defecto abre el menú de compartir de Android. */
  onShare?: (message: string) => void;
  /** Cómo se copia al portapapeles; por defecto el del sistema. */
  onCopyText?: (text: string) => Promise<unknown>;
};

type Failure = 'generate' | 'deactivate';

// Textos míos: el diseño no trae una variante para estos errores (ver las notas del PR 4).
const failureMessages: Record<Failure, string> = {
  generate: 'No pudimos generar el enlace. Revisá tu conexión y probá de nuevo.',
  deactivate: 'No pudimos desactivar el enlace. Revisá tu conexión y probá de nuevo.',
};

/** Invitar (`12-invitar`) y su estado sin enlace (`22-invitar-sin-enlace`). */
export function InviteScreen({
  onBack,
  onShare = shareMessage,
  onCopyText = Clipboard.setStringAsync,
}: Props) {
  const household = useHousehold();
  const { status, invite, regenerate, deactivate, retry } = useInvite();
  const [copied, setCopied] = useState<'link' | 'code'>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure>();
  const { bottom } = useSafeAreaInsets();

  // Generar y desactivar necesitan al servidor: sin conexión fallan al instante y se avisa abajo.
  const run = async (action: () => Promise<void>, onFail: Failure) => {
    setBusy(true);
    setFailure(undefined);
    setCopied(undefined);
    try {
      await action();
    } catch {
      setFailure(onFail);
    }
    setBusy(false);
  };

  const copy = (kind: 'link' | 'code', text: string) => {
    setCopied(kind);
    onCopyText(text);
  };

  if (status !== 'ready') {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Invitar" backLabel="Volver a Hogar" onBack={onBack} />
        {status === 'error' && <LoadErrorState onRetry={retry} />}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Invitar" backLabel="Volver a Hogar" onBack={onBack} />

      {invite.active ? (
        <>
          <View style={styles.intro}>
            <Text accessibilityRole="header" style={styles.heading}>
              Sumá a alguien a {household.name}
            </Text>
            <Text style={styles.subtitle}>
              Pasale el enlace o el código. Se une con su cuenta de Google.
            </Text>
          </View>

          <InviteCard
            label="Enlace"
            value={inviteLink(invite.code)}
            copied={copied === 'link'}
            onCopy={() => copy('link', inviteLink(invite.code))}
          />
          <InviteCard
            label="Código"
            value={invite.code}
            code
            copied={copied === 'code'}
            onCopy={() => copy('code', invite.code)}
          />

          <View style={styles.expiry}>
            <View style={styles.expiryPill}>
              <Icon name="clock" size={16} color={colors.neutralText} />
              <Text style={styles.expiryText}>{formatExpiry(invite)}</Text>
            </View>
            <Text style={styles.expiryNote}>Funciona con el enlace y con el código.</Text>
          </View>

          <View style={styles.spacer} />

          <View style={[styles.actions, { paddingBottom: 32 + bottom }]}>
            <FailureNote failure={failure} />
            <Button
              label="Compartir enlace"
              icon="share"
              large
              onPress={() => onShare(inviteMessage(household.name, invite.code))}
            />
            <Button
              label="Generar enlace nuevo"
              icon="refresh"
              variant="secondary"
              disabled={busy}
              onPress={() => run(regenerate, 'generate')}
            />
            <Button
              label="Desactivar enlace"
              variant="danger"
              disabled={busy}
              onPress={() => setConfirmOpen(true)}
            />
          </View>
        </>
      ) : (
        <>
          <View style={styles.inactive}>
            <View style={styles.inactiveCircle}>
              <Icon name="linkOff" size={48} color={colors.neutralText} />
            </View>
            <Text accessibilityRole="header" style={styles.inactiveTitle}>
              El enlace ya no está activo
            </Text>
            <Text style={styles.inactiveText}>
              Venció o lo desactivaste. Generá uno nuevo para seguir invitando.
            </Text>
          </View>

          <View style={styles.spacer} />

          <View style={[styles.actions, { paddingBottom: 40 + bottom }]}>
            <FailureNote failure={failure} />
            <Button
              label="Generar enlace nuevo"
              icon="refresh"
              large
              disabled={busy}
              onPress={() => run(regenerate, 'generate')}
            />
          </View>
        </>
      )}

      <CenteredDialog
        visible={confirmOpen}
        icon="linkOff"
        tone="danger"
        title="¿Desactivar el enlace?"
        message="Nadie va a poder unirse con este enlace ni con su código. Podés generar uno nuevo cuando quieras."
        onClose={() => setConfirmOpen(false)}
      >
        <Button
          label="Desactivar"
          variant="dangerFilled"
          onPress={() => {
            setConfirmOpen(false);
            run(deactivate, 'deactivate');
          }}
        />
        <Button label="Cancelar" variant="secondary" onPress={() => setConfirmOpen(false)} />
      </CenteredDialog>
    </View>
  );
}

function shareMessage(message: string) {
  Share.share({ message });
}

function FailureNote({ failure }: { failure?: Failure }) {
  return failure ? (
    <Text accessibilityRole="alert" style={styles.failure}>
      {failureMessages[failure]}
    </Text>
  ) : null;
}

type CardProps = {
  label: string;
  value: string;
  code?: boolean;
  copied: boolean;
  onCopy: () => void;
};

function InviteCard({ label, value, code, copied, onCopy }: CardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <View style={styles.cardRow}>
        <Text
          numberOfLines={1}
          style={[styles.cardValue, code ? styles.cardValueCode : styles.cardValueLink]}
        >
          {value}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${copied ? 'Copiado' : 'Copiar'} ${label.toLowerCase()}`}
          onPress={onCopy}
          style={styles.copy}
        >
          <Icon name={copied ? 'check' : 'copy'} size={18} color={colors.primaryText} />
          <Text style={styles.copyLabel}>{copied ? 'Copiado' : 'Copiar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  intro: { paddingTop: 16, paddingHorizontal: 24, gap: 6 },
  heading: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    lineHeight: 29,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  card: {
    marginHorizontal: 24,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    borderRadius: radii.group,
    backgroundColor: colors.surface,
  },
  cardLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardValue: { flex: 1, color: colors.textPrimary },
  cardValueLink: { fontFamily: fonts.body, fontSize: fontSizes.body },
  cardValueCode: { fontFamily: fonts.heading, fontSize: 24, letterSpacing: 0.5 },
  copy: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.primaryText },
  expiry: {
    marginHorizontal: 24,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expiryPill: {
    height: 32,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: 16,
    backgroundColor: colors.neutralSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expiryText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.secondary,
    color: colors.neutralText,
  },
  expiryNote: {
    flexShrink: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    color: colors.textSecondary,
  },
  spacer: { flex: 1 },
  failure: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    lineHeight: 22,
    color: colors.danger,
  },
  actions: { paddingHorizontal: 24, gap: 10 },
  inactive: { paddingTop: 72, paddingHorizontal: 32, alignItems: 'center', gap: 12 },
  inactiveCircle: {
    width: 104,
    height: 104,
    marginBottom: 8,
    borderRadius: 52,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTitle: {
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: 26,
    lineHeight: 31,
    color: colors.textPrimary,
  },
  inactiveText: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: 24,
    color: colors.textSecondary,
  },
});
