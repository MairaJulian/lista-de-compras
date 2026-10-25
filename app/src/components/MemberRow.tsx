import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarTone, colors, fontSizes, fonts, heights, sizes } from '../theme';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

type Props = {
  name: string;
  tone: AvatarTone;
  roleLabel: string;
  /** Muestra el botón ⋯ (solo lo ve quien creó el hogar). */
  showOptions?: boolean;
  onOptions?: () => void;
};

/** Fila de miembro del hogar: avatar de 44, nombre, rol y botón ⋯. Va dentro de un ItemGroup. */
export function MemberRow({ name, tone, roleLabel, showOptions, onOptions }: Props) {
  return (
    <View style={styles.row}>
      <Avatar name={name} tone={tone} size={sizes.avatarMember} />
      <View style={styles.text}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.role}>{roleLabel}</Text>
      </View>
      {showOptions && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Opciones de ${name}`}
          onPress={onOptions}
          style={styles.options}
        >
          <Icon name="dots" color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 16,
    paddingRight: 8,
    backgroundColor: colors.surface,
  },
  text: { flex: 1 },
  name: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyLarge, color: colors.textPrimary },
  role: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    color: colors.textSecondary,
  },
  options: {
    width: heights.touchTarget,
    height: heights.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
