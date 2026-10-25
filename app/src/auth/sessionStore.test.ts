import { resetMockStore } from '../mock/store';
import { signOutEverywhere, watchSession } from './sessionSource';
import { signedInState } from './sessionState';
import { enterDemoSession, getSession, resetSession, signOut, startSession } from './sessionStore';

const user = { displayName: 'Maira', email: 'maira@example.com', photoURL: null };

describe('sesión', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockStore();
    resetSession();
  });

  it('arranca averiguando la sesión', () => {
    expect(getSession()).toEqual({ status: 'loading' });
  });

  it('sigue lo que avisa Firebase', () => {
    (watchSession as jest.Mock).mockImplementationOnce((onChange) => {
      onChange(signedInState(user, { hogarActualId: null }));
      return () => {};
    });
    startSession();
    expect(getSession()).toMatchObject({ status: 'signedIn', hasHousehold: false, demo: false });
  });

  it('la sesión de ejemplo no se pisa con lo que avisa Firebase', () => {
    let emit: (state: unknown) => void = () => {};
    (watchSession as jest.Mock).mockImplementationOnce((onChange) => {
      emit = onChange;
      return () => {};
    });
    startSession();
    enterDemoSession();
    emit({ status: 'signedOut' });
    expect(getSession()).toMatchObject({ status: 'signedIn', demo: true, hasHousehold: true });
  });

  it('cerrar sesión con una cuenta real cierra Google y Firebase', async () => {
    resetSession(signedInState(user, undefined));
    await signOut();
    expect(signOutEverywhere).toHaveBeenCalledTimes(1);
  });

  it('cerrar la sesión de ejemplo no toca Firebase y deja sin sesión', async () => {
    enterDemoSession();
    await signOut();
    expect(signOutEverywhere).not.toHaveBeenCalled();
    expect(getSession()).toEqual({ status: 'signedOut' });
  });
});
