import { signInWithGoogle } from './googleSignIn';

const mockHasPlayServices = jest.fn();
const mockSignIn = jest.fn();
const mockSignInWithCredential = jest.fn();
const mockSaveUser = jest.fn();

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: (...args: unknown[]) => mockHasPlayServices(...args),
    signIn: (...args: unknown[]) => mockSignIn(...args),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: '12501',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
  isErrorWithCode: (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error,
}));

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  GoogleAuthProvider: { credential: jest.fn((token: string) => ({ token })) },
  signInWithCredential: (...args: unknown[]) => mockSignInWithCredential(...args),
}));

jest.mock('./userDocument', () => ({
  saveUserOnSignIn: (...args: unknown[]) => mockSaveUser(...args),
}));

const googleUser = { name: 'Maira G', email: 'g@example.com', photo: 'http://g/p' };

describe('signInWithGoogle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPlayServices.mockResolvedValue(true);
    mockSignIn.mockResolvedValue({ type: 'success', data: { idToken: 'tok', user: googleUser } });
    mockSignInWithCredential.mockResolvedValue({
      user: { uid: 'u1', displayName: 'Maira', email: 'maira@example.com', photoURL: 'http://f/1' },
    });
    mockSaveUser.mockResolvedValue(undefined);
  });

  it('entra a Firebase y guarda el usuario con los datos de la sesión', async () => {
    expect(await signInWithGoogle()).toEqual({ status: 'success' });
    expect(mockSignInWithCredential).toHaveBeenCalledWith({}, { token: 'tok' });
    expect(mockSaveUser).toHaveBeenCalledWith({
      uid: 'u1',
      name: 'Maira',
      email: 'maira@example.com',
      photo: 'http://f/1',
    });
  });

  it('usa los datos de Google si Firebase no trae nombre ni foto', async () => {
    mockSignInWithCredential.mockResolvedValue({
      user: { uid: 'u1', displayName: null, email: null, photoURL: null },
    });
    await signInWithGoogle();
    expect(mockSaveUser).toHaveBeenCalledWith({
      uid: 'u1',
      name: 'Maira G',
      email: 'g@example.com',
      photo: 'http://g/p',
    });
  });

  it('cancelar no es un error y no toca Firebase', async () => {
    mockSignIn.mockResolvedValue({ type: 'cancelled' });
    expect(await signInWithGoogle()).toEqual({ status: 'cancelled' });
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });

  it('cancelar con excepción tampoco es un error', async () => {
    mockSignIn.mockRejectedValue({ code: '12501' });
    expect(await signInWithGoogle()).toEqual({ status: 'cancelled' });
  });

  it('avisa si falta Google Play Services', async () => {
    mockHasPlayServices.mockRejectedValue({ code: 'PLAY_SERVICES_NOT_AVAILABLE' });
    expect(await signInWithGoogle()).toEqual({ status: 'playServicesMissing' });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('devuelve error si Google no entrega idToken', async () => {
    mockSignIn.mockResolvedValue({ type: 'success', data: { idToken: null, user: googleUser } });
    expect(await signInWithGoogle()).toEqual({ status: 'error' });
  });

  it('devuelve error si falla Firebase o el guardado, sin cerrar la app', async () => {
    mockSignInWithCredential.mockRejectedValue(new Error('network'));
    expect(await signInWithGoogle()).toEqual({ status: 'error' });
    mockSignInWithCredential.mockResolvedValue({
      user: { uid: 'u1', displayName: 'M', email: 'e', photoURL: null },
    });
    mockSaveUser.mockRejectedValue(new Error('unavailable'));
    expect(await signInWithGoogle()).toEqual({ status: 'error' });
  });
});
