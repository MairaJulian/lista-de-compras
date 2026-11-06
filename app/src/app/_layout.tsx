import { useFonts } from 'expo-font';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { startSession, useSession } from '../auth/sessionStore';
import { setEntered, setSigningIn, useEntered, useSigningIn } from '../auth/signingInStore';
import { startCrashReporting } from '../data/crashReporting';
import { clearFailures } from '../data/failureStore';
import { forgetHousehold } from '../data/householdSource';
import { startHousehold, useHouseholdState } from '../data/householdStore';
import { configureFirestore } from '../data/firestoreConfig';
import { useListsLoad } from '../data/hooks';
import { startListData, useListData } from '../data/listStore';
import { purgeOncePerOpening } from '../data/purgeSource';
import { goToNoHousehold, goToRemoved } from '../navigation/session';
import { takePendingInvite } from '../data/pendingInvite';
import { LoadingScreen } from '../screens/LoadingScreen';
import { colors } from '../theme';
import { fontAssets } from '../theme/fontAssets';

/**
 * El menú de desarrollo se carga con `require` dentro de `__DEV__`: en el APK de release Metro
 * saca todo ese código del bundle (con un `import` común quedaría incluido aunque no se muestre).
 */
const DevMenu = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('../dev/DevMenu') as typeof import('../dev/DevMenu')).DevMenu
  : null;

const PURGE_DELAY_MS = 3000;

// La copia local de Firestore se configura antes de la primera lectura (ver `firestoreConfig.ts`).
configureFirestore();
startCrashReporting();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const session = useSession();
  const router = useRouter();

  useEffect(() => startSession(), []);

  // Con un hogar real (no el de ejemplo) se lee el hogar y la membresía mientras la app está abierta.
  const householdId = session.status === 'signedIn' && !session.demo ? session.householdId : null;
  useEffect(() => (householdId ? startHousehold(householdId) : undefined), [householdId]);
  // Y una sola suscripción para las listas, los ítems y los miembros de ese hogar.
  useEffect(() => (householdId ? startListData(householdId) : undefined), [householdId]);

  // Una vez por apertura de la app, ya cargado el hogar con el servidor, se eliminan en segundo plano
  // los ítems y las listas borrados hace más de 30 días (ver `purgeSource.ts`).
  const listData = useListData();
  const purgeReady = listData.status === 'ready' && listData.connectedOnce;
  useEffect(() => {
    if (!householdId || !purgeReady) return;
    // Unos segundos después, para no competir con la primera pantalla.
    const timer = setTimeout(() => void purgeOncePerOpening(householdId), PURGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [householdId, purgeReady]);

  // Una invitación abierta sin sesión se retoma cuando la persona entra (tenga o no otros grupos).
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const realSignedIn = session.status === 'signedIn' && !session.demo;
  useEffect(() => {
    if (!navigationReady || !realSignedIn) return;
    const code = takePendingInvite();
    if (!code) return;
    // Después de que las rutas protegidas lleven a Sin hogar, que si no pisan la invitación.
    const timer = setTimeout(() => router.push(`/unirse/${code}`), 0);
    return () => clearTimeout(timer);
  }, [navigationReady, realSignedIn, router]);

  // Si la membresía deja de estar activa (te quitaron, o saliste desde otro celular) se vacía el
  // `hogarActualId` propio y se va a Sin hogar; solo a quien quitaron se le muestra el aviso.
  const household = useHouseholdState();
  useEffect(() => {
    if (!navigationReady || !householdId || household.status !== 'removed') return;
    // Los cambios que la persona hizo sin conexión y el servidor rechazó por esto no son un error de
    // guardado: se descartan y se muestra el aviso de que ya no es parte del hogar.
    clearFailures();
    forgetHousehold(householdId).catch(() => {
      // Sin conexión no se puede vaciar ahora; se vuelve a detectar al abrir la app.
    });
    if (household.reason === 'quitado') {
      goToRemoved(household.householdName);
    } else {
      goToNoHousehold();
    }
  }, [navigationReady, householdId, household]);

  // Pantalla `46-cargando-entrada`: desde que se elige la cuenta de Google, y al abrir la app con
  // sesión, hasta la primera lectura del hogar y las listas (tapa la navegación sin desmontarla).
  // Si tarda o falla se destapa Inicio, que muestra `32-error-carga` con "Reintentar".
  const signingIn = useSigningIn();
  const listsLoad = useListsLoad();
  const entryDone = useEntered();
  const signedInNow = session.status === 'signedIn';
  useEffect(() => {
    if (signedInNow) setSigningIn(false);
  }, [signedInNow]);
  useEffect(() => {
    if (session.status === 'signedOut') setEntered(false);
    else if (realSignedIn && listsLoad.status !== 'loading') setEntered(true);
  }, [session.status, realSignedIn, listsLoad.status]);
  const showEntering =
    signingIn ||
    (realSignedIn && householdId !== null && !entryDone && listsLoad.status === 'loading');

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
              <Stack.Screen name="crear-otro-grupo" />
              <Stack.Screen name="mis-grupos" />
              <Stack.Screen name="hogar-creado" />
            </Stack.Protected>
            {/* Se abren desde un enlace de invitación, con o sin sesión. */}
            <Stack.Screen name="unirse/index" />
            <Stack.Screen name="unirse/[codigo]" />
            <Stack.Screen name="error-enlace" />
            <Stack.Screen name="error-sin-conexion" />
          </Stack>
        )}
        {showEntering && (
          <View style={StyleSheet.absoluteFill}>
            <LoadingScreen entering />
          </View>
        )}
        {DevMenu && <DevMenu />}
      </View>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
