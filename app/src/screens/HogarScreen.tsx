import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Icon, ItemGroup, MemberRow } from '../components';
import { useCurrentMember, useHousehold } from '../data/hooks';
import type { Member } from '../data/types';
import { useInsets } from '../system/insets';
import { colors, fontSizes, fonts, heights, radii, sizes } from '../theme';

type Props = {
  onOpenProfile?: () => void;
  onInvite?: () => void;
  onMemberOptions?: (member: Member) => void;
  onLeave?: () => void;
};

function roleLabel(member: Member, currentId: string) {
  if (member.role === 'creator') {
    return member.id === currentId ? 'Creaste el hogar' : 'Creó el hogar';
  }
  return 'Miembro';
}

export function HogarScreen({ onOpenProfile, onInvite, onMemberOptions, onLeave }: Props) {
  const household = useHousehold();
  const current = useCurrentMember();
  const { top } = useInsets();
  const count = household.members.length;
  // Solo quien creó el hogar puede sacar a otros miembros.
  const canRemove = current.role === 'creator';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.header, { paddingTop: top + 32 }]}>
        <Text accessibilityRole="header" style={styles.title}>
          Hogar
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tu perfil"
          onPress={onOpenProfile}
          style={styles.profile}
        >
          <Avatar name={current.name} tone={current.tone} size={sizes.avatarMember} />
        </Pressable>
      </View>

      <View style={styles.householdCard}>
        <View style={styles.householdIcon}>
          <Icon name="home" size={28} color={colors.onPrimary} />
        </View>
        <View>
          <Text style={styles.householdName}>{household.name}</Text>
          <Text style={styles.householdCount}>
            {count === 1 ? '1 miembro' : `${count} miembros`}
          </Text>
        </View>
      </View>

      <View style={styles.membersHeader}>
        <Text accessibilityRole="header" style={styles.membersTitle}>
          Miembros
        </Text>
        <Pressable accessibilityRole="button" onPress={onInvite} style={styles.invite}>
          <Icon name="userPlus" size={20} color={colors.onPrimary} />
          <Text style={styles.inviteLabel}>Invitar</Text>
        </Pressable>
      </View>

      <View style={styles.members}>
        <ItemGroup>
          {household.members.map((member) => (
            <MemberRow
              key={member.id}
              name={member.name}
              tone={member.tone}
              roleLabel={roleLabel(member, current.id)}
              showOptions={canRemove && member.id !== current.id}
              onOptions={onMemberOptions && (() => onMemberOptions(member))}
            />
          ))}
        </ItemGroup>
      </View>

      <View style={styles.leave}>
        <Button label="Salir del hogar" variant="danger" onPress={onLeave} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 24 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitleLarge,
    lineHeight: 37,
    color: colors.textPrimary,
  },
  profile: { width: heights.touchTarget, height: heights.touchTarget },
  householdCard: {
    marginHorizontal: 24,
    marginTop: 12,
    padding: 20,
    borderRadius: radii.card,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  householdIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  householdName: {
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  householdCount: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    color: colors.primaryText,
  },
  membersHeader: {
    marginHorizontal: 24,
    marginTop: 28,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membersTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.textPrimary,
  },
  invite: {
    height: heights.touchTarget,
    paddingLeft: 14,
    paddingRight: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.onPrimary },
  members: { marginHorizontal: 24 },
  leave: { marginHorizontal: 24, marginTop: 24 },
});
