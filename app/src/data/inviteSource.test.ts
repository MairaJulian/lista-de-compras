import { createInvite, revokeInvite, watchInvite } from './inviteSource';

jest.unmock('./inviteSource');

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockRunTransaction = jest.fn();
const mockStop = jest.fn();
const snapshotHandlers: Record<string, { next: (s: unknown) => void; error: () => void }> = {};
let mockCurrentUser: { uid: string } | null = { uid: 'u1' };

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: () => ({ currentUser: mockCurrentUser }),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: (_db: unknown, ...segments: string[]) => ({
    path: segments.join('/'),
    id: segments[segments.length - 1],
  }),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  Timestamp: { fromMillis: (millis: number) => ({ millis }) },
  onSnapshot: (ref: { path: string }, next: (s: unknown) => void, error: () => void) => {
    snapshotHandlers[ref.path] = { next, error };
    return mockStop;
  },
}));
// Bytes fijos: 0 a 9 dan el código 2345-678-9AB.
jest.mock('expo-crypto', () => ({
  getRandomBytes: (length: number) => Uint8Array.from({ length }, (_, i) => i),
}));

const NEW_CODE = '2345-678-9AB';
const snap = (data: object | undefined) => ({ exists: () => !!data, data: () => data });

/** Documentos que devuelve `transaction.get`, por ruta. */
function documents(byPath: Record<string, object | undefined>) {
  mockGet.mockImplementation(async (ref: { path: string }) => snap(byPath[ref.path]));
}

const household = (invitacionActivaId: string | null) => ({
  nombre: 'Nuestra casa',
  invitacionActivaId,
});
const member = { nombre: 'Maira', rol: 'creador', estado: 'activo' };

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUser = { uid: 'u1' };
  mockRunTransaction.mockImplementation((_db, update) =>
    update({ get: mockGet, set: mockSet, update: mockUpdate }),
  );
});

describe('createInvite', () => {
  it('crea la invitación a 48 h con los datos que verifican las reglas y apunta el hogar a ella', async () => {
    const before = Date.now();
    documents({ 'hogares/h1': household(null), 'hogares/h1/miembros/u1': member });

    await expect(createInvite('h1')).resolves.toBe(NEW_CODE);

    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(1);
    const [ref, data] = mockSet.mock.calls[0];
    expect(ref.path).toBe(`invitaciones/${NEW_CODE}`);
    expect(data).toEqual({
      hogarId: 'h1',
      creadaPor: 'u1',
      venceEn: { millis: expect.any(Number) },
      estado: 'activa',
      hogarNombre: 'Nuestra casa',
      invitadoPorNombre: 'Maira',
    });
    const hours = (data.venceEn.millis - before) / (60 * 60 * 1000);
    expect(hours).toBeGreaterThanOrEqual(48);
    expect(hours).toBeLessThan(48.01);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: 'hogares/h1' }), {
      invitacionActivaId: NEW_CODE,
    });
  });

  it('revoca la invitación anterior si seguía activa, en la misma transacción', async () => {
    documents({
      'hogares/h1': household('OLD-CODE-1234'),
      'hogares/h1/miembros/u1': member,
      'invitaciones/OLD-CODE-1234': { estado: 'activa' },
    });

    await createInvite('h1');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'invitaciones/OLD-CODE-1234' }),
      { estado: 'revocada' },
    );
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: 'hogares/h1' }), {
      invitacionActivaId: NEW_CODE,
    });
  });

  it('no toca la anterior si ya estaba revocada (las reglas solo dejan pasar de activa a revocada)', async () => {
    documents({
      'hogares/h1': household('OLD-CODE-1234'),
      'hogares/h1/miembros/u1': member,
      'invitaciones/OLD-CODE-1234': { estado: 'revocada' },
    });

    await createInvite('h1');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: 'hogares/h1' }), {
      invitacionActivaId: NEW_CODE,
    });
  });

  it('lee todo antes de escribir, y no escribe nada si la lectura falla (sin conexión)', async () => {
    mockGet.mockRejectedValue(new Error('unavailable'));
    await expect(createInvite('h1')).rejects.toThrow('unavailable');
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('no escribe si el hogar o la membresía no existen', async () => {
    documents({ 'hogares/h1': household(null) });
    await expect(createInvite('h1')).rejects.toThrow();
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('falla sin sesión', async () => {
    mockCurrentUser = null;
    await expect(createInvite('h1')).rejects.toThrow('sesión');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});

describe('revokeInvite', () => {
  it('revoca la invitación vigente y vacía invitacionActivaId', async () => {
    documents({
      'hogares/h1': household('OLD-CODE-1234'),
      'invitaciones/OLD-CODE-1234': { estado: 'activa' },
    });

    await revokeInvite('h1');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'invitaciones/OLD-CODE-1234' }),
      { estado: 'revocada' },
    );
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: 'hogares/h1' }), {
      invitacionActivaId: null,
    });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('si la invitación ya estaba revocada solo vacía invitacionActivaId', async () => {
    documents({
      'hogares/h1': household('OLD-CODE-1234'),
      'invitaciones/OLD-CODE-1234': { estado: 'revocada' },
    });

    await revokeInvite('h1');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: 'hogares/h1' }), {
      invitacionActivaId: null,
    });
  });

  it('no hace nada si no hay invitación vigente', async () => {
    documents({ 'hogares/h1': household(null) });
    await revokeInvite('h1');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('no escribe si la lectura falla (sin conexión) ni si el hogar no existe', async () => {
    mockGet.mockRejectedValue(new Error('unavailable'));
    await expect(revokeInvite('h1')).rejects.toThrow('unavailable');
    documents({});
    await expect(revokeInvite('h1')).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('falla sin sesión', async () => {
    mockCurrentUser = null;
    await expect(revokeInvite('h1')).rejects.toThrow('sesión');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});

describe('watchInvite', () => {
  it('lee la invitación de a una, avisa sus datos y el error, y deja de escuchar', () => {
    const onData = jest.fn();
    const onError = jest.fn();
    const stop = watchInvite('K7P2-9XQ-4MN', onData, onError);

    snapshotHandlers['invitaciones/K7P2-9XQ-4MN'].next(snap({ estado: 'activa' }));
    expect(onData).toHaveBeenCalledWith({ estado: 'activa' });
    snapshotHandlers['invitaciones/K7P2-9XQ-4MN'].next(snap(undefined));
    expect(onData).toHaveBeenLastCalledWith(undefined);
    snapshotHandlers['invitaciones/K7P2-9XQ-4MN'].error();
    expect(onError).toHaveBeenCalledTimes(1);

    stop();
    expect(mockStop).toHaveBeenCalledTimes(1);
  });
});
