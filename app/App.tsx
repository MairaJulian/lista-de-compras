import { DMSans_400Regular } from '@expo-google-fonts/dm-sans';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { FirestorePing } from './src/dev/FirestorePing';
import { colors, fonts } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_800ExtraBold, DMSans_400Regular });

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Changuito</Text>
      <Text style={styles.subtitle}>Lista de compras compartida</Text>
      {__DEV__ && <FirestorePing />}
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
});
