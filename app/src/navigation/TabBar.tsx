import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '../components';
import { colors, fontSizes, fonts, heights, radii, sizes } from '../theme';

const tabs: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Listas', icon: 'list' },
  { name: 'hogar', label: 'Hogar', icon: 'users' },
];

/** Barra inferior: 2 pestañas con indicador pill de 64 × 32. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const activeName = state.routes[state.index].name;
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { height: heights.tabBar + bottom, paddingBottom: bottom }]}>
      {tabs.map(({ name, label, icon }) => {
        const selected = activeName === name;
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            onPress={() => {
              const route = state.routes.find((item) => item.name === name);
              if (route && !selected) {
                navigateToTab(route.key);
              }
            }}
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
    borderRadius: radii.pill,
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
