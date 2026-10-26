import { deriveSession, demoAccount, signedInState, startRoute } from './sessionState';

const user = { displayName: 'Maira Julián', email: 'maira@example.com', photoURL: 'http://foto/1' };

describe('signedInState', () => {
  it('usa nombre, mail y foto del documento y marca que tiene hogar', () => {
    expect(
      signedInState(user, {
        nombre: 'Maira',
        email: 'maira@gmail.com',
        foto: 'http://foto/2',
        hogarActualId: 'h1',
      }),
    ).toEqual({
      status: 'signedIn',
      account: { name: 'Maira', email: 'maira@gmail.com', photo: 'http://foto/2' },
      hasHousehold: true,
      householdId: 'h1',
    });
  });

  it('con hogarActualId vacío, ausente o null está sin hogar', () => {
    for (const hogarActualId of [null, '', undefined]) {
      expect(signedInState(user, { nombre: 'Maira', hogarActualId })).toMatchObject({
        hasHousehold: false,
        householdId: null,
      });
    }
  });

  it('si el documento todavía no existe usa los datos de la cuenta de Google', () => {
    expect(signedInState(user, undefined)).toEqual({
      status: 'signedIn',
      account: { name: 'Maira Julián', email: 'maira@example.com', photo: 'http://foto/1' },
      hasHousehold: false,
      householdId: null,
    });
  });

  it('sin ningún dato deja nombre y mail vacíos y foto null', () => {
    expect(
      signedInState({ displayName: null, email: null, photoURL: null }, undefined),
    ).toMatchObject({ account: { name: '', email: '', photo: null } });
  });
});

describe('deriveSession y startRoute', () => {
  const withHome = signedInState(user, { hogarActualId: 'h1' });
  const noHome = signedInState(user, { hogarActualId: null });

  it('mientras se averigua la sesión no hay pantalla de arranque', () => {
    expect(startRoute(deriveSession({ status: 'loading' }, true))).toBeUndefined();
  });

  it('sin sesión → Bienvenida', () => {
    expect(startRoute(deriveSession({ status: 'signedOut' }, true))).toBe('/');
  });

  it('con sesión y sin hogar → Sin hogar', () => {
    expect(startRoute(deriveSession(noHome, true))).toBe('/sin-hogar');
  });

  it('con sesión y hogar → Listas', () => {
    expect(startRoute(deriveSession(withHome, false))).toBe('/listas');
  });

  it('la sesión de ejemplo sigue el hogar de los datos de ejemplo', () => {
    const demo = deriveSession({ status: 'demo' }, true);
    expect(demo).toMatchObject({ status: 'signedIn', demo: true, account: demoAccount });
    expect(startRoute(demo)).toBe('/listas');
    expect(startRoute(deriveSession({ status: 'demo' }, false))).toBe('/sin-hogar');
  });
});
