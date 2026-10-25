import { saveUserOnSignIn } from './userDocument';

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn((_db, collection: string, id: string) => ({ path: `${collection}/${id}` })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}));

const profile = { uid: 'u1', name: 'Maira', email: 'maira@example.com', photo: 'http://foto/1' };

const existing = (data: object) => ({ exists: () => true, data: () => data });

describe('saveUserOnSignIn', () => {
  beforeEach(() => jest.clearAllMocks());

  it('en el primer ingreso crea usuarios/{uid} con hogarActualId vacío', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined });
    await saveUserOnSignIn(profile);
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'usuarios/u1' },
      {
        nombre: 'Maira',
        email: 'maira@example.com',
        foto: 'http://foto/1',
        creadoEn: 'SERVER_TIMESTAMP',
        hogarActualId: null,
      },
    );
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('guarda foto null si la cuenta no tiene foto', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => undefined });
    await saveUserOnSignIn({ ...profile, photo: null });
    expect(mockSetDoc.mock.calls[0][1].foto).toBeNull();
  });

  it('en ingresos posteriores no escribe nada si no cambió nada', async () => {
    mockGetDoc.mockResolvedValue(
      existing({ nombre: 'Maira', foto: 'http://foto/1', hogarActualId: 'h1' }),
    );
    await saveUserOnSignIn(profile);
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('actualiza solo nombre y foto si cambiaron, sin tocar hogarActualId ni creadoEn', async () => {
    mockGetDoc.mockResolvedValue(
      existing({ nombre: 'Mai', foto: 'http://foto/0', hogarActualId: 'h1' }),
    );
    await saveUserOnSignIn(profile);
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'usuarios/u1' },
      { nombre: 'Maira', foto: 'http://foto/1' },
    );
  });

  it('actualiza solo el campo que cambió', async () => {
    mockGetDoc.mockResolvedValue(existing({ nombre: 'Maira', foto: null, hogarActualId: null }));
    await saveUserOnSignIn(profile);
    expect(mockUpdateDoc).toHaveBeenCalledWith({ path: 'usuarios/u1' }, { foto: 'http://foto/1' });
  });

  it('propaga el error si no puede leer (sin conexión)', async () => {
    mockGetDoc.mockRejectedValue(new Error('unavailable'));
    await expect(saveUserOnSignIn(profile)).rejects.toThrow('unavailable');
  });
});
