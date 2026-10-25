import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ComponentsScreen } from './src/dev/ComponentsScreen';
import { FirestorePing } from './src/dev/FirestorePing';
import { colors, fonts } from './src/theme';
import { fontAssets } from './src/theme/fontAssets';

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  const [showComponents, setShowComponents] = useState(false);

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  if (__DEV__ && showComponents) {
    return (
      <>
        <ComponentsScreen onBack={() => setShowComponents(false)} />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Changuito</Text>
      <Text style={styles.subtitle}>Lista de compras compartida</Text>
      {__DEV__ && (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowComponents(true)}
            style={styles.devButton}
          >
            <Text style={styles.devButtonText}>Ver componentes</Text>
          </Pressable>
          <FirestorePing />
        </>
      )}
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 40,
    color: colors.primaryText,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textSecondary,
  },
  devButton: {
    marginTop: 24,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.primaryText,
  },
});
