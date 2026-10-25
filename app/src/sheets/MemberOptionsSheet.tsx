import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, BottomSheet, Button, Icon } from '../components';
import type { Member } from '../data/types';
import { colors, fontSizes, fonts } from '../theme';

type Props = {
  visible: boolean;
  member: Member | undefined;
  householdName: string;
  onClose: () => void;
  onRemove: (member: Member) => void;
};

/** Panel de un miembro (`13-opciones-miembro`): "Quitar del hogar", solo para quien creó el hogar. */
export function MemberOptionsSheet({ visible, member, householdName, onClose, onRemove }: Props) {
  return (
    <BottomSheet
      visible={visible}
      title={`Opciones de ${member?.name ?? ''}`}
      onClose={onClose}
      showHeader={false}
    >
      {member && (
        <View>
          <View style={styles.member}>
            <Avatar name={member.name} tone={member.tone} size={44} />
            <View>
              <Text accessibilityRole="header" style={styles.name}>
                {member.name}
              </Text>
              <Text style={styles.role}>
                {member.role === 'creator' ? 'Creó el hogar' : 'Miembro'}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => onRemove(member)}
            style={styles.remove}
          >
            <Icon name="userMinus" color={colors.danger} />
            <Text style={styles.removeLabel}>Quitar del hogar</Text>
          </Pressable>
          <Text style={styles.note}>
            {member.name} dejará de ver las listas de {householdName}. Solo vos, que creaste el
            hogar, podés hacerlo.
          </Text>
          <Button label="Cancelar" variant="secondary" onPress={onClose} />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  member: { height: 64, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 22, color: colors.textPrimary },
  role: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    color: colors.textSecondary,
  },
  remove: {
    height: 60,
    marginTop: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.bodyLarge, color: colors.danger },
  note: {
    marginTop: 10,
    marginBottom: 18,
    marginHorizontal: 4,
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
