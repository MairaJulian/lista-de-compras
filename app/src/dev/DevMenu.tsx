import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useInsets } from '../system/insets';
import { colors, fontSizes, fonts } from '../theme';
import { ComponentsScreen } from './ComponentsScreen';
import { FirestorePing } from './FirestorePing';

type Page = 'menu' | 'components' | 'firestore';

/** Menú de desarrollo (solo `__DEV__`): botón "DEV" flotante arriba a la izquierda. */
export function DevMenu() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<Page>('menu');
  const { top } = useInsets();

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
      <DevButton label="Ver componentes" onPress={() => setPage('components')} />
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
