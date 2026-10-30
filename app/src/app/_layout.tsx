import { useFonts } from 'expo-font';
import { router, Stack, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { startSession, useSession } from '../auth/sessionStore';
import { forgetHousehold } from '../data/householdSource';
import { startHousehold, useHouseholdState } from '../data/householdStore';
import { startListData } from '../data/listStore';
import { goToNoHousehold, goToRemoved } from '../navigation/session';
import { takePendingInvite } from '../data/pendingInvite';
import { DevMenu } from '../dev/DevMenu';
import { LoadingScreen } from '../screens/LoadingScreen';
import { colors } from '../theme';
import { fontAssets } from '../theme/fontAssets';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const session = useSession();

  useEffect(() => startSession(), []);

  // Con un hogar real (no el de ejemplo) se lee el hogar y la membresía mientras la app está abierta.
  const householdId = session.status === 'signedIn' && !session.demo ? session.householdId : null;
  useEffect(() => (householdId ? startHousehold(householdId) : undefined), [householdId]);
  // Y una sola suscripción para las listas, los ítems y los miembros de ese hogar.
  useEffect(() => (householdId ? startListData(householdId) : undefined), [householdId]);

  // Una invitación abierta sin sesión se retoma cuando la persona entra (y todavía no tiene hogar).
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const realSignedIn = session.status === 'signedIn' && !session.demo;
  const hasHousehold = session.status === 'signedIn' && session.hasHousehold;
  useEffect(() => {
    if (!navigationReady || !realSignedIn) return;
    const code = takePendingInvite();
    if (!code || hasHousehold) return;
    // Después de que las rutas protegidas lleven a Sin hogar, que si no pisan la invitación.
    const timer = setTimeout(() => router.push(`/unirse/${code}`), 0);
    return () => clearTimeout(timer);
  }, [navigationReady, realSignedIn, hasHousehold]);

  // Si la membresía deja de estar activa (te quitaron, o saliste desde otro celular) se vacía el
  // `hogarActualId` propio y se va a Sin hogar; solo a quien quitaron se le muestra el aviso.
  const household = useHouseholdState();
  useEffect(() => {
    if (!navigationReady || !householdId || household.status !== 'removed') return;
    forgetHousehold(householdId).catch(() => {
      // Sin conexión no se puede vaciar ahora; se vuelve a detectar al abrir la app.
    });
    if (household.reason === 'quitado') {
      goToRemoved(household.householdName);
    } else {
      goToNoHousehold();
    }
  }, [navigationReady, householdId, household]);

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
            <Stack.Screen name="unirse/index" />
            <Stack.Screen name="unirse/[codigo]" />
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
