import { createHousehold, renameHousehold, watchHousehold } from './householdSource';

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
  collection: (_db: unknown, ...segments: string[]) => ({
    collectionPath: segments.join('/'),
    path: segments.join('/'),
  }),
  doc: (parent: { collectionPath?: string }, ...segments: string[]) =>
    parent.collectionPath !== undefined
      ? { path: `${parent.collectionPath}/nuevo-id`, id: 'nuevo-id' }
      : { path: segments.join('/'), id: segments[segments.length - 1] },
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  query: (ref: { path: string }) => ref,
  where: jest.fn(),
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
      activeInviteId: null,
      me: { id: 'u1', name: 'Maira', role: 'creator', tone: 'green' },
      members: [{ id: 'u1', name: 'Maira', role: 'creator', tone: 'green' }],
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

describe('renameHousehold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { uid: 'u1' };
    mockGet.mockResolvedValue({ exists: () => true });
    mockRunTransaction.mockImplementation((_db, update) =>
      update({ get: mockGet, set: mockSet, update: mockUpdate }),
    );
  });

  it('cambia solo el campo nombre, en una transacción', async () => {
    await renameHousehold('h1', 'Casa nueva');
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: 'hogares/h1' }), {
      nombre: 'Casa nueva',
    });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('lee primero (así sin conexión falla) y no escribe si la lectura falla', async () => {
    mockGet.mockRejectedValue(new Error('unavailable'));
    await expect(renameHousehold('h1', 'Casa nueva')).rejects.toThrow('unavailable');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('no escribe si el hogar no existe', async () => {
    mockGet.mockResolvedValue({ exists: () => false });
    await expect(renameHousehold('h1', 'Casa nueva')).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('falla sin sesión', async () => {
    mockCurrentUser = null;
    await expect(renameHousehold('h1', 'Casa nueva')).rejects.toThrow('sesión');
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

  const membersSnap = (docs: { id: string; data: object }[]) => ({
    docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
  });

  it('avisa cuando llegaron el hogar, la membresía propia y los miembros', () => {
    const onData = jest.fn();
    watchHousehold('h1', onData, jest.fn());

    snapshotHandlers['hogares/h1'].next(snap({ nombre: 'Nuestra casa' }));
    expect(onData).not.toHaveBeenCalled();
    snapshotHandlers['hogares/h1/miembros/u1'].next(snap(memberDoc));
    expect(onData).not.toHaveBeenCalled();
    snapshotHandlers['hogares/h1/miembros'].next(membersSnap([{ id: 'u1', data: memberDoc }]));
    const maira = { id: 'u1', name: 'Maira', role: 'creator', tone: 'green' };
    expect(onData).toHaveBeenCalledWith({
      id: 'h1',
      name: 'Nuestra casa',
      activeInviteId: null,
      me: maira,
      members: [maira],
    });

    snapshotHandlers['hogares/h1'].next(
      snap({ nombre: 'Nuestra casa', invitacionActivaId: 'K7P2-9XQ-4MN' }),
    );
    expect(onData).toHaveBeenLastCalledWith(
      expect.objectContaining({ activeInviteId: 'K7P2-9XQ-4MN' }),
    );
    snapshotHandlers['hogares/h1'].next(snap({ nombre: 'Nuestra casa', invitacionActivaId: null }));
    expect(onData).toHaveBeenLastCalledWith(expect.objectContaining({ activeInviteId: null }));

    snapshotHandlers['hogares/h1'].next(snap({ nombre: 'Otro nombre' }));
    expect(onData).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Otro nombre' }));
  });

  it('cuando se suma un miembro vuelve a avisar con la lista nueva', () => {
    const onData = jest.fn();
    watchHousehold('h1', onData, jest.fn());
    snapshotHandlers['hogares/h1'].next(snap({ nombre: 'Nuestra casa' }));
    snapshotHandlers['hogares/h1/miembros/u1'].next(snap(memberDoc));
    snapshotHandlers['hogares/h1/miembros'].next(membersSnap([{ id: 'u1', data: memberDoc }]));
    const lucia = { nombre: 'Lucía', rol: 'miembro', estado: 'activo', colorAvatar: 'amber' };
    snapshotHandlers['hogares/h1/miembros'].next(
      membersSnap([
        { id: 'u1', data: memberDoc },
        { id: 'u2', data: lucia },
      ]),
    );
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData.mock.calls[1][0].members.map((m: { name: string }) => m.name)).toEqual([
      'Maira',
      'Lucía',
    ]);
  });

  it('avisa el error si falla la lectura del hogar, de la membresía o de los miembros', () => {
    const onError = jest.fn();
    watchHousehold('h1', jest.fn(), onError);
    snapshotHandlers['hogares/h1'].error();
    snapshotHandlers['hogares/h1/miembros/u1'].error();
    snapshotHandlers['hogares/h1/miembros'].error();
    expect(onError).toHaveBeenCalledTimes(3);
  });

  it('avisa el error si el hogar no existe o la membresía no está activa', () => {
    const onError = jest.fn();
    watchHousehold('h1', jest.fn(), onError);
    snapshotHandlers['hogares/h1'].next(snap(undefined));
    snapshotHandlers['hogares/h1/miembros/u1'].next(snap({ ...memberDoc, estado: 'quitado' }));
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('avisa el error sin sesión, y al dejar de escuchar corta las tres lecturas', () => {
    const onError = jest.fn();
    mockCurrentUser = null;
    watchHousehold('h1', jest.fn(), onError);
    expect(onError).toHaveBeenCalledTimes(1);

    mockCurrentUser = { uid: 'u1' };
    watchHousehold('h1', jest.fn(), jest.fn())();
    expect(mockStop).toHaveBeenCalledTimes(3);
  });
});
