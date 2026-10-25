import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, fonts, heights, ListTone, listTones, radii } from '../theme';
import { Icon, IconName } from './Icon';

type Props = {
  name: string;
  pendingCount: number;
  tone: ListTone;
  icon: IconName;
  onPress?: () => void;
};

/** Tarjeta de lista de Inicio. Con 0 pendientes muestra el tilde y "Al día". */
export function ListCard({ name, pendingCount, tone, icon, onPress }: Props) {
  const { background, text } = listTones[tone];
  const upToDate = pendingCount === 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${upToDate ? 'al día' : `${pendingCount} pendientes`}`}
      onPress={onPress}
      style={[styles.card, { backgroundColor: background }]}
    >
      <View style={styles.top}>
        <View style={styles.iconCircle}>
          <Icon name={icon} color={text} />
        </View>
        <View style={styles.badge}>
          {upToDate ? (
            <Icon name="check" size={20} color={colors.primary} />
          ) : (
            <Text style={styles.badgeText}>{pendingCount}</Text>
          )}
        </View>
      </View>
      <View>
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {name}
        </Text>
        <Text style={[styles.caption, { color: text }]}>{upToDate ? 'Al día' : 'pendientes'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: heights.card,
    borderRadius: radii.card,
    padding: 16,
    justifyContent: 'space-between',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  name: { fontFamily: fonts.heading, fontSize: fontSizes.cardTitle, color: colors.textPrimary },
  caption: { fontFamily: fonts.body, fontSize: fontSizes.secondary, marginTop: 2 },
});
