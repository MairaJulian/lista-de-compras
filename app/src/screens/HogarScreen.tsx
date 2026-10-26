import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, CenteredDialog, Icon, ItemGroup, MemberRow } from '../components';
import {
  useAccount,
  useCurrentMember,
  useHousehold,
  useHouseholdLoad,
  useLeaveHousehold,
  useRemoveMember,
  useRenameHousehold,
} from '../data/hooks';
import { LeaveCase, leaveCase, nextCreator } from '../data/householdLogic';
import type { Member } from '../data/types';
import { EditHouseholdSheet } from '../sheets/EditHouseholdSheet';
import { MemberOptionsSheet } from '../sheets/MemberOptionsSheet';
import { colors, fontSizes, fonts, heights, radii, sizes } from '../theme';
import { LoadErrorState } from './InicioStates';

type Props = {
  onOpenProfile?: () => void;
  onInvite?: () => void;
  /** Después de confirmar "Salir del hogar". */
  onLeft?: () => void;
};

function leaveDialogProps(leaving: LeaveCase, householdName: string) {
  switch (leaving) {
    case 'creator':
      return {
        icon: 'logout',
        tone: 'danger',
        title: `¿Salir de ${householdName}?`,
        message: 'Vos creaste el hogar. Si salís, el rol de creador pasa a otro miembro.',
      } as const;
    case 'last':
      return {
        icon: 'archive',
        tone: 'amber',
        title: 'Sos la última persona del hogar',
        message: `Si salís, ${householdName} se archiva y no queda nadie con acceso a sus listas.`,
      } as const;
    default:
      return {
        icon: 'logout',
        tone: 'danger',
        title: `¿Salir de ${householdName}?`,
        message:
          'Vas a dejar de ver sus listas. Para volver, alguien del hogar tiene que invitarte de nuevo.',
      } as const;
  }
}

function roleLabel(member: Member, currentId: string) {
  if (member.role === 'creator') {
    return member.id === currentId ? 'Creaste el hogar' : 'Creó el hogar';
  }
  return 'Miembro';
}

export function HogarScreen({ onOpenProfile, onInvite, onLeft }: Props) {
  const household = useHousehold();
  const current = useCurrentMember();
  const account = useAccount();
  const load = useHouseholdLoad();
  const renameHousehold = useRenameHousehold();
  const removeMember = useRemoveMember();
  const leaveHousehold = useLeaveHousehold();
  const { top } = useSafeAreaInsets();
  // El panel y el aviso guardan a quién se refieren aparte de si están abiertos, para que el
  // contenido no desaparezca mientras se cierran.
  const [optionsFor, setOptionsFor] = useState<Member>();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [removeFor, setRemoveFor] = useState<Member>();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const count = household.members.length;
  // Solo quien creó el hogar puede sacar a otros miembros.
  const canRemove = current.role === 'creator';
  // Al salir se elige el aviso según el caso: miembro común, creador (el rol pasa a otro) o la última persona.
  const leaving = leaveCase(household.members, current.id);
  const successor = nextCreator(household.members, current.id);

  return (
    <View style={styles.screen}>
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
            <Avatar
              name={account.member.name}
              tone={account.member.tone}
              size={sizes.avatarMember}
            />
          </Pressable>
        </View>

        {load.status !== 'ready' ? (
          // Leyendo el hogar (vacío) o con error (`32-error-carga`).
          load.status === 'error' && <LoadErrorState onRetry={load.retry} />
        ) : (
          <>
            <View style={styles.householdCard}>
              <View style={styles.householdIcon}>
                <Icon name="home" size={28} color={colors.onPrimary} />
              </View>
              <View style={styles.householdText}>
                <Text style={styles.householdName}>{household.name}</Text>
                <Text style={styles.householdCount}>
                  {count === 1 ? '1 miembro' : `${count} miembros`}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar el nombre del hogar"
                onPress={() => setEditOpen(true)}
                style={styles.edit}
              >
                <Icon name="pencil" size={20} color={colors.primaryText} />
              </Pressable>
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
                    name={member.id === current.id ? 'Vos' : member.name}
                    tone={member.tone}
                    roleLabel={roleLabel(member, current.id)}
                    showOptions={canRemove && member.id !== current.id}
                    onOptions={() => {
                      setOptionsFor(member);
                      setOptionsOpen(true);
                    }}
                  />
                ))}
              </ItemGroup>
            </View>

            <View style={styles.leave}>
              <Button label="Salir del hogar" variant="danger" onPress={() => setLeaveOpen(true)} />
            </View>
          </>
        )}
      </ScrollView>

      <EditHouseholdSheet
        visible={editOpen}
        name={household.name}
        onClose={() => setEditOpen(false)}
        onSave={renameHousehold}
      />

      <MemberOptionsSheet
        visible={optionsOpen}
        member={optionsFor}
        householdName={household.name}
        onClose={() => setOptionsOpen(false)}
        onRemove={(member) => {
          setOptionsOpen(false);
          setRemoveFor(member);
          setRemoveOpen(true);
        }}
      />

      <CenteredDialog
        visible={removeOpen}
        leading={removeFor && <Avatar name={removeFor.name} tone={removeFor.tone} size={56} />}
        title={`¿Quitar a ${removeFor?.name ?? ''} del hogar?`}
        message={`Va a dejar de ver las listas de ${household.name}. Más adelante podés volver a invitar a ${removeFor?.name ?? ''}.`}
        onClose={() => setRemoveOpen(false)}
      >
        <Button
          label="Quitar"
          variant="dangerFilled"
          onPress={() => {
            if (removeFor) removeMember(removeFor.id);
            setRemoveOpen(false);
          }}
        />
        <Button label="Cancelar" variant="secondary" onPress={() => setRemoveOpen(false)} />
      </CenteredDialog>

      <CenteredDialog
        visible={leaveOpen}
        {...leaveDialogProps(leaving, household.name)}
        detail={
          leaving === 'creator' && successor ? (
            <View style={styles.successor}>
              <Avatar name={successor.name} tone={successor.tone} size={40} />
              <View>
                <Text style={styles.successorName}>{successor.name}</Text>
                <Text style={styles.successorNote}>Será la nueva persona a cargo</Text>
              </View>
            </View>
          ) : undefined
        }
        onClose={() => setLeaveOpen(false)}
      >
        <Button
          label={leaving === 'last' ? 'Salir y archivar' : 'Salir del hogar'}
          variant="dangerFilled"
          onPress={() => {
            setLeaveOpen(false);
            leaveHousehold();
            onLeft?.();
          }}
        />
        <Button label="Cancelar" variant="secondary" onPress={() => setLeaveOpen(false)} />
      </CenteredDialog>
    </View>
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
  householdText: { flex: 1 },
  edit: {
    width: heights.touchTarget,
    height: heights.touchTarget,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
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
  successor: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successorName: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.body,
    color: colors.textPrimary,
  },
  successorNote: {
    marginTop: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.secondary,
    color: colors.textSecondary,
  },
});
