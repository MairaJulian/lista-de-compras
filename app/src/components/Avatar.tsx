import { StyleSheet, Text, View } from 'react-native';

import { AvatarTone, avatarTones, fonts, sizes } from '../theme';

type Props = {
  name: string;
  tone: AvatarTone;
  size?: number;
};

export function Avatar({ name, tone, size = sizes.avatar }: Props) {
  const { background, text } = avatarTones[tone];
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
      ]}
    >
      <Text
        style={[styles.initial, { color: text, fontSize: size >= sizes.avatarLarge ? 16 : 13 }]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  initial: { fontFamily: fonts.heading, includeFontPadding: false },
});
