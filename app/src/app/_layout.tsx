import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { startSession, useSession } from '../auth/sessionStore';
import { DevMenu } from '../dev/DevMenu';
import { LoadingScreen } from '../screens/LoadingScreen';
import { colors } from '../theme';
import { fontAssets } from '../theme/fontAssets';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const session = useSession();

  useEffect(() => startSession(), []);

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  const signedIn = session.status === 'signedIn';
  const signedInStart = signedIn && session.hasHousehold ? '/listas' : '/sin-hogar';

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {session.status === 'loading' ? (
          <LoadingScreen />
        ) : (
          <Stack screenOptions={{ headerShown: false, contentStyle: styles.container }}>
            {/* Sin sesión: Bienvenida. Con sesión: el resto de la app (Listas o Sin hogar). */}
            <Stack.Protected guard={!signedIn} redirectTo={signedInStart}>
              <Stack.Screen name="index" />
              <Stack.Screen name="error-login" />
            </Stack.Protected>
            <Stack.Protected guard={signedIn} redirectTo="/">
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="lista/[id]" />
              <Stack.Screen name="invitar" />
              <Stack.Screen name="perfil" />
              <Stack.Screen name="sin-hogar" />
              <Stack.Screen name="codigo" />
              <Stack.Screen name="crear-hogar" />
              <Stack.Screen name="hogar-creado" />
            </Stack.Protected>
            {/* Se abren desde un enlace de invitación, con o sin sesión. */}
            <Stack.Screen name="unirse" />
            <Stack.Screen name="error-enlace" />
            <Stack.Screen name="error-sin-conexion" />
          </Stack>
        )}
        {__DEV__ && <DevMenu />}
      </View>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
