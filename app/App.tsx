import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { DevMenu } from './src/dev/DevMenu';
import { AppNavigator } from './src/navigation/AppNavigator';
import { NavigationProvider } from './src/navigation/NavigationProvider';
import { InsetsProvider } from './src/system/insets';
import { colors } from './src/theme';
import { fontAssets } from './src/theme/fontAssets';

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  return (
    <InsetsProvider>
      <NavigationProvider>
        <View style={styles.container}>
          <AppNavigator />
          {__DEV__ && <DevMenu />}
        </View>
      </NavigationProvider>
      <StatusBar style="dark" />
    </InsetsProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
