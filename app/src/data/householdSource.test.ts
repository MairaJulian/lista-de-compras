import { createHousehold, watchHousehold } from './householdSource';

jest.unmock('./householdSource');

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockRunTransaction = jest.fn();
const snapshotHandlers: Record<string, { next: (s: unknown) => void; error: () => void }> = {};
const mockStop = jest.fn();
let mockCurrentUser: { uid: string } | null = { uid: 'u1' };

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: () => ({ currentUser: mockCurrentUser }),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: (_db: unknown, name: string) => ({ collectionPath: name }),
  doc: (parent: { collectionPath?: string }, ...segments: string[]) =>
    parent.collectionPath !== undefined
      ? { path: `${parent.collectionPath}/nuevo-id`, id: 'nuevo-id' }
      : { path: segments.join('/'), id: segments[segments.length - 1] },
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  onSnapshot: (ref: { path: string }, next: (s: unknown) => void, error: () => void) => {
    snapshotHandlers[ref.path] = { next, error };
    return mockStop;
  },
}));

const account = { name: 'Maira', photo: null };

describe('createHousehold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { uid: 'u1' };
    mockGet.mockResolvedValue({ exists: () => true });
    mockRunTransaction.mockImplementation((_db, update) =>
      update({ get: mockGet, set: mockSet, update: mockUpdate }),
    );
  });

  it('crea hogar, miembro creador y hogarActualId en una transacción', async () => {
    const created = await createHousehold('Nuestra casa', account);

    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      { path: 'hogares/nuevo-id', id: 'nuevo-id' },
      expect.objectContaining({
        nombre: 'Nuestra casa',
        creadoPor: 'u1',
        creadorActualId: 'u1',
        creadoEn: 'SERVER_TIMESTAMP',
      }),
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'hogares/nuevo-id/miembros/u1' }),
      expect.objectContaining({ rol: 'creador', estado: 'activo', desde: 'SERVER_TIMESTAMP' }),
    );
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: 'usuarios/u1' }), {
      hogarActualId: 'nuevo-id',
    });
    expect(created).toEqual({
      id: 'nuevo-id',
      name: 'Nuestra casa',
      me: { id: 'u1', name: 'Maira', role: 'creator', tone: 'green' },
    });
  });

  it('lee primero (así sin conexión falla) y no escribe nada si la lectura falla', async () => {
    mockGet.mockRejectedValue(new Error('unavailable'));
    await expect(createHousehold('Nuestra casa', account)).rejects.toThrow('unavailable');
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('no escribe si no existe el documento de la persona', async () => {
    mockGet.mockResolvedValue({ exists: () => false });
    await expect(createHousehold('Nuestra casa', account)).rejects.toThrow();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('falla sin sesión', async () => {
    mockCurrentUser = null;
    await expect(createHousehold('Nuestra casa', account)).rejects.toThrow('sesión');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});

describe('watchHousehold', () => {
  const snap = (data: object | undefined) => ({ exists: () => !!data, data: () => data });
  const memberDoc = { nombre: 'Maira', rol: 'creador', estado: 'activo', colorAvatar: 'green' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { uid: 'u1' };
  });

  it('avisa cuando llegaron el hogar y la membresía propia', () => {
    const onData = jest.fn();
    watchHousehold('h1', onData, jest.fn());

    snapshotHandlers['hogares/h1'].next(snap({ nombre: 'Nuestra casa' }));
    expect(onData).not.toHaveBeenCalled();
    snapshotHandlers['hogares/h1/miembros/u1'].next(snap(memberDoc));
    expect(onData).toHaveBeenCalledWith({
      id: 'h1',
      name: 'Nuestra casa',
      me: { id: 'u1', name: 'Maira', role: 'creator', tone: 'green' },
    });

    snapshotHandlers['hogares/h1'].next(snap({ nombre: 'Otro nombre' }));
    expect(onData).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Otro nombre' }));
  });

  it('avisa el error si falla la lectura del hogar o de la membresía', () => {
    const onError = jest.fn();
    watchHousehold('h1', jest.fn(), onError);
    snapshotHandlers['hogares/h1'].error();
    snapshotHandlers['hogares/h1/miembros/u1'].error();
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('avisa el error si el hogar no existe o la membresía no está activa', () => {
    const onError = jest.fn();
    watchHousehold('h1', jest.fn(), onError);
    snapshotHandlers['hogares/h1'].next(snap(undefined));
    snapshotHandlers['hogares/h1/miembros/u1'].next(snap({ ...memberDoc, estado: 'quitado' }));
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('avisa el error sin sesión, y al dejar de escuchar corta las dos lecturas', () => {
    const onError = jest.fn();
    mockCurrentUser = null;
    watchHousehold('h1', jest.fn(), onError);
    expect(onError).toHaveBeenCalledTimes(1);

    mockCurrentUser = { uid: 'u1' };
    watchHousehold('h1', jest.fn(), jest.fn())();
    expect(mockStop).toHaveBeenCalledTimes(2);
  });
});
