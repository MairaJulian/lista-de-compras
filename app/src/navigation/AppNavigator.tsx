import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';
import { HogarScreen } from '../screens/HogarScreen';
import { InicioScreen } from '../screens/InicioScreen';
import { useNavigation } from './NavigationProvider';
import { TabBar } from './TabBar';

export function AppNavigator() {
  const { tab } = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.screen}>{tab === 'inicio' ? <InicioScreen /> : <HogarScreen />}</View>
      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
});
