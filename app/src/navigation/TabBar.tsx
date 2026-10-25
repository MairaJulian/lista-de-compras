import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, IconName } from '../components';
import { colors, fontSizes, fonts, heights, sizes } from '../theme';
import { useInsets } from '../system/insets';
import { TabName, useNavigation } from './NavigationProvider';

const tabs: { name: TabName; label: string; icon: IconName }[] = [
  { name: 'inicio', label: 'Listas', icon: 'list' },
  { name: 'hogar', label: 'Hogar', icon: 'users' },
];

/** Barra inferior: 2 pestañas con indicador pill de 64 × 32. */
export function TabBar() {
  const { tab, switchTab } = useNavigation();
  const { bottom } = useInsets();

  return (
    <View style={[styles.bar, { height: heights.tabBar + bottom, paddingBottom: bottom }]}>
      {tabs.map(({ name, label, icon }) => {
        const selected = tab === name;
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            onPress={() => switchTab(name)}
            style={styles.tab}
          >
            <View style={[styles.indicator, selected && styles.indicatorSelected]}>
              <Icon name={icon} color={selected ? colors.primaryText : colors.textSecondary} />
            </View>
            <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  indicator: {
    width: sizes.tabIndicatorWidth,
    height: sizes.tabIndicatorHeight,
    borderRadius: sizes.tabIndicatorHeight / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorSelected: { backgroundColor: colors.primarySoftStrong },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  labelSelected: { fontFamily: fonts.bodyBold, color: colors.textPrimary },
});
