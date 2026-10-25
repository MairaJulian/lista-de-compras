import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { enterDemoSession, signOut, useSession } from '../auth/sessionStore';
import { colors, fontSizes, fonts } from '../theme';
import { ComponentsScreen } from './ComponentsScreen';
import { FirestorePing } from './FirestorePing';

type Page = 'menu' | 'components' | 'firestore';

/** Menú de desarrollo (solo `__DEV__`): botón "DEV" flotante arriba a la izquierda. */
export function DevMenu() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<Page>('menu');
  const { top } = useSafeAreaInsets();
  const session = useSession();

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Menú de desarrollo"
        onPress={() => setOpen(true)}
        style={[styles.badge, { top: top + 4 }]}
      >
        <Text style={styles.badgeText}>DEV</Text>
      </Pressable>
    );
  }

  const close = () => {
    setPage('menu');
    setOpen(false);
  };

  const go = (path: Parameters<typeof router.push>[0]) => {
    close();
    router.push(path);
  };

  if (page === 'components') {
    return (
      <View style={styles.overlay}>
        <ComponentsScreen onBack={() => setPage('menu')} />
      </View>
    );
  }

  return (
    <View style={[styles.overlay, styles.menu, { paddingTop: top + 32 }]}>
      <Text accessibilityRole="header" style={styles.title}>
        Desarrollo
      </Text>
      {session.status === 'signedOut' && (
        // Todavía no existen hogares reales: con esto se sigue viendo toda la app con datos de ejemplo.
        <DevButton
          label="Entrar con datos de ejemplo"
          onPress={() => {
            close();
            enterDemoSession();
          }}
        />
      )}
      {session.status === 'signedIn' && (
        <>
          {/* Sin hogar no hay pestaña Hogar, y Sin hogar (`17`) no trae acceso a Perfil. */}
          <DevButton label="Ver perfil" onPress={() => go('/perfil')} />
          <DevButton
            label="Cerrar sesión"
            onPress={() => {
              close();
              void signOut();
            }}
          />
        </>
      )}
      <DevButton label="Ver componentes" onPress={() => setPage('components')} />
      {/* La invitación se abre desde un enlace; mientras no haya enlaces reales, desde acá. */}
      <DevButton
        label="Ver invitación recibida"
        onPress={() => {
          close();
          router.push('/unirse');
        }}
      />
      <DevButton label="Ver sin hogar" onPress={() => go('/sin-hogar')} />
      <DevButton label="Ver aviso de que te sacaron" onPress={() => go('/sin-hogar?sacaron=1')} />
      <DevButton label="Ver error de inicio de sesión" onPress={() => go('/error-login')} />
      {page === 'firestore' ? (
        <FirestorePing />
      ) : (
        <DevButton label="Probar Firestore" onPress={() => setPage('firestore')} />
      )}
      <DevButton label="Cerrar" onPress={close} />
    </View>
  );
}

function DevButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    left: 8,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.amberText },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.background },
  menu: { paddingHorizontal: 24, gap: 16 },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.screenTitle, color: colors.textPrimary },
  button: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.primaryText },
});
