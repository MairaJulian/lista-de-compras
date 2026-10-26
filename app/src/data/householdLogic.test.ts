import { mockHousehold, mockInvites } from '../mock/data';
import {
  cleanHouseholdName,
  deactivateInvite,
  formatExpiry,
  leaveCase,
  leaveHousehold,
  memberFromDocument,
  newHouseholdDocuments,
  nextCreator,
  regenerateInvite,
  removeMember,
} from './householdLogic';

const members = mockHousehold.members;

describe('removeMember', () => {
  it('quien creó el hogar saca a otro miembro', () => {
    const result = removeMember(members, 'lucia', 'vos');
    expect(result.map((m) => m.id)).toEqual(['vos', 'diego']);
  });

  it('un miembro común no puede sacar a nadie', () => {
    expect(removeMember(members, 'diego', 'lucia')).toBe(members);
  });

  it('nadie se saca a sí mismo con esta acción', () => {
    expect(removeMember(members, 'vos', 'vos')).toBe(members);
  });

  it('un miembro que no existe no cambia nada y no modifica el original', () => {
    expect(removeMember(members, 'nadie', 'vos')).toBe(members);
    removeMember(members, 'lucia', 'vos');
    expect(members).toHaveLength(3);
  });
});

describe('salir del hogar', () => {
  it('elige el aviso según quién sale', () => {
    expect(leaveCase(members, 'lucia')).toBe('common');
    expect(leaveCase(members, 'vos')).toBe('creator');
    expect(leaveCase([members[0]], 'vos')).toBe('last');
  });

  it('el rol de creador pasa al primer miembro que queda', () => {
    expect(nextCreator(members, 'vos')?.id).toBe('lucia');
    const result = leaveHousehold(members, 'vos');
    expect(result.map((m) => [m.id, m.role])).toEqual([
      ['lucia', 'creator'],
      ['diego', 'member'],
    ]);
  });

  it('un miembro común se va sin cambiar roles ni modificar el original', () => {
    const result = leaveHousehold(members, 'lucia');
    expect(result.map((m) => [m.id, m.role])).toEqual([
      ['vos', 'creator'],
      ['diego', 'member'],
    ]);
    expect(members).toHaveLength(3);
    expect(members[1].role).toBe('member');
  });

  it('la última persona deja el hogar vacío', () => {
    expect(leaveHousehold([members[0]], 'vos')).toEqual([]);
  });
});

describe('invitaciones', () => {
  it('generar un enlace nuevo pasa al siguiente, activo, y da la vuelta', () => {
    const next = regenerateInvite(mockInvites, mockInvites[0]);
    expect(next).toEqual({ code: 'R4WD-3ZT-8HC', hoursLeft: 48, active: true });
    expect(regenerateInvite(mockInvites, next).code).toBe('K7P2-9XQ-4MN');
  });

  it('generar uno nuevo reactiva un enlace desactivado', () => {
    const off = deactivateInvite(mockInvites[0]);
    expect(regenerateInvite(mockInvites, off).active).toBe(true);
  });

  it('desactivar no cambia el original', () => {
    const off = deactivateInvite(mockInvites[0]);
    expect(off.active).toBe(false);
    expect(mockInvites[0].active).toBe(true);
  });

  it('formatea el vencimiento', () => {
    expect(formatExpiry(mockInvites[0])).toBe('Vence en 47 h');
  });
});

describe('cleanHouseholdName', () => {
  it('recorta los espacios', () => {
    expect(cleanHouseholdName('  Nuestra casa ')).toBe('Nuestra casa');
  });

  it('rechaza el nombre vacío, solo con espacios o de más de 60 caracteres', () => {
    expect(cleanHouseholdName('')).toBeUndefined();
    expect(cleanHouseholdName('   ')).toBeUndefined();
    expect(cleanHouseholdName('a'.repeat(61))).toBeUndefined();
    expect(cleanHouseholdName('a'.repeat(60))).toBe('a'.repeat(60));
  });
});

describe('newHouseholdDocuments', () => {
  const profile = { uid: 'u1', name: 'Maira', photo: 'http://foto/1' };
  const { household, member } = newHouseholdDocuments(profile, 'Nuestra casa', 'AHORA');

  it('el hogar apunta a quien lo crea como creador, sin invitación', () => {
    expect(household).toEqual({
      nombre: 'Nuestra casa',
      creadoPor: 'u1',
      creadoEn: 'AHORA',
      invitacionActivaId: null,
      creadorActualId: 'u1',
    });
  });

  it('el miembro es el creador activo, con el primer color y sin correo', () => {
    expect(member).toEqual({
      nombre: 'Maira',
      foto: 'http://foto/1',
      colorAvatar: 'green',
      rol: 'creador',
      estado: 'activo',
      desde: 'AHORA',
      hasta: null,
      invitacionId: null,
      invitadoPor: null,
    });
    expect(member).not.toHaveProperty('email');
  });

  it('si la cuenta no trae nombre usa uno que cumpla las reglas', () => {
    const { member: unnamed } = newHouseholdDocuments({ ...profile, name: '  ' }, 'Casa', 'AHORA');
    expect(unnamed.nombre).toBe('Sin nombre');
  });
});

describe('memberFromDocument', () => {
  it('convierte el documento de un miembro activo', () => {
    expect(
      memberFromDocument('u1', {
        nombre: 'Maira',
        rol: 'creador',
        estado: 'activo',
        colorAvatar: 'blue',
      }),
    ).toEqual({ id: 'u1', name: 'Maira', role: 'creator', tone: 'blue' });
    expect(
      memberFromDocument('u2', {
        nombre: 'Lucía',
        rol: 'miembro',
        estado: 'activo',
        colorAvatar: 'amber',
      }),
    ).toMatchObject({ role: 'member', tone: 'amber' });
  });

  it('un color desconocido cae en el primero', () => {
    expect(
      memberFromDocument('u1', {
        nombre: 'Maira',
        rol: 'miembro',
        estado: 'activo',
        colorAvatar: 'rosa',
      }),
    ).toMatchObject({ tone: 'green' });
  });

  it('no hay miembro si el documento no existe o ya no está activo', () => {
    expect(memberFromDocument('u1', undefined)).toBeUndefined();
    expect(
      memberFromDocument('u1', { nombre: 'Maira', rol: 'miembro', estado: 'quitado' }),
    ).toBeUndefined();
    expect(
      memberFromDocument('u1', { nombre: 'Maira', rol: 'miembro', estado: 'salio' }),
    ).toBeUndefined();
  });
});
