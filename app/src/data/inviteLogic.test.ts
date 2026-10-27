import {
  generateInviteCode,
  INVITE_HOURS,
  inviteExpiry,
  inviteFromDocument,
  inviteLink,
  inviteMessage,
} from './inviteLogic';

// En la app la fuente es `expo-crypto`; en los tests, la criptográfica de Node.
const { randomFillSync } = jest.requireActual<{
  randomFillSync: (bytes: Uint8Array) => Uint8Array;
}>('crypto');
const cryptoBytes = (length: number) => randomFillSync(new Uint8Array(length));
const fixedBytes = (bytes: number[]) => () => Uint8Array.from(bytes);

describe('generateInviteCode', () => {
  it('tiene el formato K7P2-9XQ-4MN: 4-3-3 caracteres, 10 sin contar guiones', () => {
    expect(generateInviteCode(cryptoBytes)).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{3}-[A-Z2-9]{3}$/);
  });

  it('usa un alfabeto sin caracteres ambiguos (0, O, 1, I, L)', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateInviteCode(cryptoBytes)).not.toMatch(/[01OIL]/);
    }
  });

  it('cumple lo que piden las reglas: letras, números y guiones, 10 o más sin guiones', () => {
    const code = generateInviteCode(cryptoBytes);
    expect(code).toMatch(/^[A-Za-z0-9-]+$/);
    expect(code.length).toBeLessThanOrEqual(24);
    expect(code.replace(/-/g, '').length).toBeGreaterThanOrEqual(10);
  });

  it('no se repite en una tanda grande', () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generateInviteCode(cryptoBytes)));
    expect(codes.size).toBe(2000);
  });

  it('reparte los caracteres sin sesgo marcado y usa todo el alfabeto', () => {
    const counts = new Map<string, number>();
    const total = 6000;
    for (let i = 0; i < total; i++) {
      for (const char of generateInviteCode(cryptoBytes).replace(/-/g, '')) {
        counts.set(char, (counts.get(char) ?? 0) + 1);
      }
    }
    expect(counts.size).toBe(31);
    const expected = (total * 10) / 31;
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(expected * 0.85);
      expect(count).toBeLessThan(expected * 1.15);
    }
  });

  it('descarta los bytes que darían un reparto desparejo (248 o más)', () => {
    // 255 y 248 se descartan; 0..9 dan los primeros caracteres del alfabeto ('2'..'B').
    const code = generateInviteCode(fixedBytes([255, 248, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    expect(code).toBe('2345-678-9AB');
  });

  it('pide más bytes si los primeros no alcanzan', () => {
    let calls = 0;
    const code = generateInviteCode(() => {
      calls += 1;
      return calls === 1
        ? new Uint8Array(20).fill(255)
        : Uint8Array.from({ length: 20 }, (_, i) => i);
    });
    expect(calls).toBe(2);
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{3}-[A-Z2-9]{3}$/);
  });
});

describe('vencimiento', () => {
  const HOUR = 60 * 60 * 1000;
  const now = Date.UTC(2026, 9, 27, 12, 0, 0);
  const timestamp = (millis: number) => ({ toMillis: () => millis });

  it('vence 48 horas después', () => {
    expect(INVITE_HOURS).toBe(48);
    expect(inviteExpiry(now)).toBe(now + 48 * HOUR);
  });

  it('una invitación recién creada está activa y vence en 48 h', () => {
    const invite = inviteFromDocument(
      'K7P2-9XQ-4MN',
      { estado: 'activa', venceEn: timestamp(inviteExpiry(now)) },
      now,
    );
    expect(invite).toEqual({ code: 'K7P2-9XQ-4MN', hoursLeft: 48, active: true });
  });

  it('redondea las horas hacia arriba', () => {
    const at = (remaining: number) =>
      inviteFromDocument('X', { estado: 'activa', venceEn: timestamp(now + remaining) }, now);
    expect(at(47 * HOUR + 1).hoursLeft).toBe(48);
    expect(at(47 * HOUR).hoursLeft).toBe(47);
    expect(at(30 * 60 * 1000).hoursLeft).toBe(1);
  });

  it('vencida (justo ahora o antes) deja de estar activa', () => {
    const expiredAt = (millis: number) =>
      inviteFromDocument('X', { estado: 'activa', venceEn: timestamp(millis) }, now);
    expect(expiredAt(now)).toEqual({ code: 'X', hoursLeft: 0, active: false });
    expect(expiredAt(now - HOUR).active).toBe(false);
  });

  it('revocada no está activa aunque no haya vencido', () => {
    const invite = inviteFromDocument(
      'X',
      { estado: 'revocada', venceEn: timestamp(now + 10 * HOUR) },
      now,
    );
    expect(invite).toEqual({ code: 'X', hoursLeft: 0, active: false });
  });

  it.each([
    ['sin documento', undefined],
    ['sin vencimiento', { estado: 'activa' }],
    ['con un vencimiento que no es una fecha', { estado: 'activa', venceEn: 'mañana' }],
    ['con un estado desconocido', { estado: 'otra', venceEn: timestamp(now + HOUR) }],
  ])('%s no está activa', (_case, data) => {
    expect(inviteFromDocument('X', data, now).active).toBe(false);
  });
});

describe('enlace y mensaje para compartir', () => {
  it('el enlace abre la pantalla de invitación con el código', () => {
    expect(inviteLink('K7P2-9XQ-4MN')).toBe('changuito://unirse/K7P2-9XQ-4MN');
  });

  it('el mensaje lleva el nombre del hogar, el código y el enlace', () => {
    expect(inviteMessage('Nuestra casa', 'K7P2-9XQ-4MN')).toBe(
      'Sumate a Nuestra casa en Changuito.\nCódigo: K7P2-9XQ-4MN\nEnlace: changuito://unirse/K7P2-9XQ-4MN',
    );
  });
});
