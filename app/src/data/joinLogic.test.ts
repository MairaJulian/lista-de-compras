import {
  codeFromParam,
  InviteInvalidError,
  isInviteUsable,
  isPlausibleCode,
  joinFailure,
  newJoinMember,
  normalizeInviteCode,
  toneForUid,
} from './joinLogic';

const NOW = Date.UTC(2026, 9, 1, 12);
const at = (millis: number) => ({ toMillis: () => millis });
const HOUR = 60 * 60 * 1000;

describe('normalizeInviteCode', () => {
  it('pasa a mayúsculas y saca espacios', () => {
    expect(normalizeInviteCode('  k7p2-9xq-4mn \n')).toBe('K7P2-9XQ-4MN');
  });

  it('formatea un código de 10 caracteres escrito sin guiones o con espacios', () => {
    expect(normalizeInviteCode('k7p29xq4mn')).toBe('K7P2-9XQ-4MN');
    expect(normalizeInviteCode('K7P2 9XQ 4MN')).toBe('K7P2-9XQ-4MN');
  });

  it('se queda con el código si pegaron el mensaje o el enlace que se comparte', () => {
    const message =
      'Sumate a Nuestra casa en Changuito.\nCódigo: K7P2-9XQ-4MN\nEnlace: changuito://unirse/K7P2-9XQ-4MN';
    expect(normalizeInviteCode(message)).toBe('K7P2-9XQ-4MN');
    expect(normalizeInviteCode('changuito://unirse/k7p2-9xq-4mn')).toBe('K7P2-9XQ-4MN');
  });

  it('deja como está lo que no parece un código (después se rechaza)', () => {
    expect(normalizeInviteCode('hola')).toBe('HOLA');
    expect(normalizeInviteCode('')).toBe('');
  });
});

describe('codeFromParam', () => {
  it('normaliza el parámetro de la ruta, venga como texto, lista o sin valor', () => {
    expect(codeFromParam('k7p2-9xq-4mn')).toBe('K7P2-9XQ-4MN');
    expect(codeFromParam(['k7p2-9xq-4mn', 'otro'])).toBe('K7P2-9XQ-4MN');
    expect(codeFromParam(undefined)).toBe('');
  });
});

describe('isPlausibleCode', () => {
  it('acepta el formato de las invitaciones', () => {
    expect(isPlausibleCode('K7P2-9XQ-4MN')).toBe(true);
  });

  it.each(['', 'ABC', 'K7P2-9XQ', 'K7P2/9XQ-4MN', '../hogares/h1', 'K7P2 9XQ 4MN', 'A'.repeat(25)])(
    'rechaza %j (corto, con caracteres que arman rutas o demasiado largo)',
    (code) => {
      expect(isPlausibleCode(code)).toBe(false);
    },
  );
});

describe('isInviteUsable', () => {
  const valid = { estado: 'activa', hogarId: 'h1', venceEn: at(NOW + HOUR) };

  it('sirve si está activa, no venció y dice de qué hogar es', () => {
    expect(isInviteUsable(valid, NOW)).toBe(true);
  });

  it('no sirve si está revocada, venció (o vence ahora), no existe o le faltan datos', () => {
    expect(isInviteUsable({ ...valid, estado: 'revocada' }, NOW)).toBe(false);
    expect(isInviteUsable({ ...valid, venceEn: at(NOW - 1) }, NOW)).toBe(false);
    expect(isInviteUsable({ ...valid, venceEn: at(NOW) }, NOW)).toBe(false);
    expect(isInviteUsable(undefined, NOW)).toBe(false);
    expect(isInviteUsable({ ...valid, hogarId: '' }, NOW)).toBe(false);
    expect(isInviteUsable({ ...valid, venceEn: undefined }, NOW)).toBe(false);
  });
});

describe('toneForUid', () => {
  it('es siempre el mismo para la misma persona y reparte entre los tres colores', () => {
    expect(toneForUid('abc')).toBe(toneForUid('abc'));
    const tones = new Set(Array.from({ length: 60 }, (_, i) => toneForUid(`uid-${i}`)));
    expect(tones).toEqual(new Set(['green', 'amber', 'blue']));
  });
});

describe('newJoinMember', () => {
  const invite = { code: 'K7P2-9XQ-4MN', createdBy: 'u-creadora' };

  it('arma el documento que verifican las reglas: rol miembro, activo, con la invitación', () => {
    const profile = { uid: 'u2', name: ' Lucía ', photo: 'https://f/x.png' };
    expect(newJoinMember(profile, invite, 'AHORA')).toEqual({
      nombre: 'Lucía',
      foto: 'https://f/x.png',
      colorAvatar: toneForUid('u2'),
      rol: 'miembro',
      estado: 'activo',
      desde: 'AHORA',
      hasta: null,
      invitacionId: 'K7P2-9XQ-4MN',
      invitadoPor: 'u-creadora',
    });
  });

  it('no guarda el correo y usa un nombre de reserva si la cuenta no trae uno', () => {
    const member = newJoinMember({ uid: 'u2', name: '  ', photo: null }, invite, 'AHORA');
    expect(member.nombre).toBe('Sin nombre');
    expect(member.foto).toBeNull();
    expect(Object.keys(member)).not.toContain('email');
  });
});

describe('joinFailure', () => {
  it('una invitación que no sirve, o que las reglas rechazan, es código inválido', () => {
    expect(joinFailure(new InviteInvalidError())).toBe('invalid');
    expect(joinFailure({ code: 'firestore/permission-denied' })).toBe('invalid');
    expect(joinFailure({ code: 'permission-denied' })).toBe('invalid');
  });

  it('cualquier otra falla (sin conexión, servidor caído, error raro) es sin conexión', () => {
    expect(joinFailure({ code: 'firestore/unavailable' })).toBe('offline');
    expect(joinFailure(new Error('network'))).toBe('offline');
    expect(joinFailure(undefined)).toBe('offline');
  });
});
