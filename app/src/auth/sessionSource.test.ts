import { signOutEverywhere, watchSession } from './sessionSource';

jest.unmock('./sessionSource');

const mockAuthSignOut = jest.fn();
const mockGoogleSignOut = jest.fn();
const mockStopAuth = jest.fn();
const mockStopDoc = jest.fn();
let authCallback: (user: unknown) => void;
let docNext: (snapshot: unknown) => void;
let docError: () => void;

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: (_auth: unknown, callback: (user: unknown) => void) => {
    authCallback = callback;
    return mockStopAuth;
  },
  signOut: (...args: unknown[]) => mockAuthSignOut(...args),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn((_db, collection: string, id: string) => ({ path: `${collection}/${id}` })),
  onSnapshot: (_ref: unknown, next: (s: unknown) => void, error: () => void) => {
    docNext = next;
    docError = error;
    return mockStopDoc;
  },
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { signOut: (...args: unknown[]) => mockGoogleSignOut(...args) },
}));

const user = { uid: 'u1', displayName: 'Maira', email: 'maira@example.com', photoURL: null };

describe('watchSession', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sin usuario avisa que no hay sesión', () => {
    const onChange = jest.fn();
    watchSession(onChange);
    authCallback(null);
    expect(onChange).toHaveBeenCalledWith({ status: 'signedOut' });
  });

  it('con usuario escucha usuarios/{uid} y avisa con el hogar', () => {
    const onChange = jest.fn();
    watchSession(onChange);
    authCallback(user);
    docNext({ data: () => ({ nombre: 'Maira', hogarActualId: 'h1' }) });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'signedIn', hasHousehold: true }),
    );
  });

  it('si no puede leer el documento entra igual, sin hogar', () => {
    const onChange = jest.fn();
    watchSession(onChange);
    authCallback(user);
    docError();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'signedIn', hasHousehold: false }),
    );
  });

  it('al cambiar de usuario o salir deja de escuchar el documento anterior', () => {
    const stop = watchSession(jest.fn());
    authCallback(user);
    authCallback(null);
    expect(mockStopDoc).toHaveBeenCalledTimes(1);
    authCallback(user);
    stop();
    expect(mockStopDoc).toHaveBeenCalledTimes(2);
    expect(mockStopAuth).toHaveBeenCalledTimes(1);
  });
});

describe('signOutEverywhere', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cierra la sesión de Google y la de Firebase', async () => {
    await signOutEverywhere();
    expect(mockGoogleSignOut).toHaveBeenCalledTimes(1);
    expect(mockAuthSignOut).toHaveBeenCalledTimes(1);
  });

  it('si Google falla igual cierra la de Firebase', async () => {
    mockGoogleSignOut.mockRejectedValueOnce(new Error('sin sesión de Google'));
    await signOutEverywhere();
    expect(mockAuthSignOut).toHaveBeenCalledTimes(1);
  });

  it('si Firebase falla, el error le llega a quien llamó', async () => {
    mockAuthSignOut.mockRejectedValueOnce(new Error('falló'));
    await expect(signOutEverywhere()).rejects.toThrow('falló');
  });
});
