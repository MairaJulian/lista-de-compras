import { mockHousehold, mockInvites } from '../mock/data';
import { deactivateInvite, formatExpiry, regenerateInvite, removeMember } from './householdLogic';

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
