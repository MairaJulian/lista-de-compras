import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from '@react-native-firebase/firestore';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

// Con `adb reverse tcp:8080 tcp:8080`, "localhost" llega al emulador de Firestore
// tanto desde el celular por USB como desde el emulador de Android.
const EMULATOR_HOST = 'localhost';
const EMULATOR_PORT = 8080;

let emulatorConnected = false;

function getEmulatorFirestore() {
  const db = getFirestore();
  if (!emulatorConnected) {
    connectFirestoreEmulator(db, EMULATOR_HOST, EMULATOR_PORT);
    emulatorConnected = true;
  }
  return db;
}

export async function runPing(): Promise<string> {
  const ref = doc(getEmulatorFirestore(), 'ping', 'ping');
  const sentAt = new Date().toISOString();
  await setDoc(ref, { sentAt });
  const snapshot = await getDoc(ref);
  const readAt = snapshot.data()?.sentAt;
  if (readAt !== sentAt) {
    throw new Error(`Se escribió ${sentAt} pero se leyó ${String(readAt)}`);
  }
  return `Escribió y leyó ping: ${readAt}`;
}

export function FirestorePing() {
  const [status, setStatus] = useState<string>('Sin probar');
  const [failed, setFailed] = useState(false);

  const onPress = async () => {
    setStatus('Probando…');
    setFailed(false);
    try {
      setStatus(await runPing());
    } catch (error) {
      setFailed(true);
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Solo desarrollo · emulador de Firestore</Text>
      <Pressable style={styles.button} onPress={onPress} accessibilityRole="button">
        <Text style={styles.buttonText}>Probar Firestore</Text>
      </Pressable>
      <Text style={[styles.status, failed && styles.statusError]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  button: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.surface,
  },
  status: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    color: colors.primaryText,
  },
  statusError: {
    color: colors.danger,
  },
});
