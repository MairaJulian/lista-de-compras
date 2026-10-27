import { waitFor } from '@testing-library/react-native';

import {
  createHousehold,
  forgetHousehold,
  leaveCurrentHousehold,
  removeMemberFromHousehold,
  renameHousehold,
  watchHousehold,
} from './householdSource';

jest.unmock('./householdSource');

const mockGet = jest.fn();
const mockGetFromCache = jest.fn();
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
  getDocFromCache: (...args: unknown[]) => mockGetFromCache(...args),
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

const snapshotOf = (data: object | undefined) => ({ exists: () => !!data, data: () => data });

/** Hace que `transaction.get` devuelva, según el documento, lo que se le indique. */
function readsDocuments(documents: Record<string, object | undefined>) {
  mockGet.mockImplementation(async (ref: { path: string }) => snapshotOf(documents[ref.path]));
}

describe('removeMemberFromHousehold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { uid: 'u1' };
    mockRunTransaction.mockImplementation((_db, update) =>
      update({ get: mockGet, set: mockSet, update: mockUpdate }),
    );
  });

  it('pasa al miembro a quitado con la hora del servidor, tocando solo esos dos campos', async () => {
    readsDocuments({ 'hogares/h1/miembros/u2': { estado: 'activo', rol: 'miembro' } });
    await removeMemberFromHousehold('h1', 'u2');
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'hogares/h1/miembros/u2' }),
      { estado: 'quitado', hasta: 'SERVER_TIMESTAMP' },
    );
  });

  it('si esa persona ya no estaba activa no escribe nada', async () => {
    readsDocuments({ 'hogares/h1/miembros/u2': { estado: 'salio', rol: 'miembro' } });
    await removeMemberFromHousehold('h1', 'u2');
    readsDocuments({});
    await removeMemberFromHousehold('h1', 'u2');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('no quita a quien creó el hogar', async () => {
    readsDocuments({ 'hogares/h1/miembros/u2': { estado: 'activo', rol: 'creador' } });
    await expect(removeMemberFromHousehold('h1', 'u2')).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('sin conexión la lectura falla y no escribe', async () => {
    mockGet.mockRejectedValue(new Error('unavailable'));
    await expect(removeMemberFromHousehold('h1', 'u2')).rejects.toThrow('unavailable');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('falla sin sesión', async () => {
    mockCurrentUser = null;
    await expect(removeMemberFromHousehold('h1', 'u2')).rejects.toThrow('sesión');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});

describe('leaveCurrentHousehold', () => {
  const user = { hogarActualId: 'h1' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { uid: 'u1' };
    mockRunTransaction.mockImplementation((_db, update) =>
      update({ get: mockGet, set: mockSet, update: mockUpdate }),
    );
  });

  const updated = (path: string) =>
    mockUpdate.mock.calls.filter(([ref]) => ref.path === path).map(([, data]) => data);

  it('un miembro común sale y vacía su hogarActualId en la misma transacción', async () => {
    readsDocuments({
      'hogares/h1/miembros/u1': { estado: 'activo', rol: 'miembro' },
      'usuarios/u1': user,
    });
    await leaveCurrentHousehold('h1');
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(updated('hogares/h1/miembros/u1')).toEqual([
      { estado: 'salio', hasta: 'SERVER_TIMESTAMP' },
    ]);
    expect(updated('usuarios/u1')).toEqual([{ hogarActualId: null }]);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('quien creó el hogar traspasa el rol en un solo lote: sale como miembro, el elegido pasa a creador', async () => {
    readsDocuments({
      'hogares/h1/miembros/u1': { estado: 'activo', rol: 'creador' },
      'hogares/h1/miembros/u2': { estado: 'activo', rol: 'miembro' },
      'usuarios/u1': user,
    });
    await leaveCurrentHousehold('h1', 'u2');
    expect(updated('hogares/h1/miembros/u1')).toEqual([
      { estado: 'salio', hasta: 'SERVER_TIMESTAMP', rol: 'miembro' },
    ]);
    expect(updated('hogares/h1/miembros/u2')).toEqual([{ rol: 'creador' }]);
    expect(updated('hogares/h1')).toEqual([{ creadorActualId: 'u2' }]);
    expect(updated('usuarios/u1')).toEqual([{ hogarActualId: null }]);
    expect(mockUpdate).toHaveBeenCalledTimes(4);
  });

  it('la última persona sale sin traspaso', async () => {
    readsDocuments({
      'hogares/h1/miembros/u1': { estado: 'activo', rol: 'creador' },
      'usuarios/u1': user,
    });
    await leaveCurrentHousehold('h1');
    expect(updated('hogares/h1/miembros/u1')).toEqual([
      { estado: 'salio', hasta: 'SERVER_TIMESTAMP' },
    ]);
    expect(updated('hogares/h1')).toEqual([]);
  });

  it('si la persona elegida ya no está activa, no escribe nada', async () => {
    readsDocuments({
      'hogares/h1/miembros/u1': { estado: 'activo', rol: 'creador' },
      'hogares/h1/miembros/u2': { estado: 'salio', rol: 'miembro' },
      'usuarios/u1': user,
    });
    await expect(leaveCurrentHousehold('h1', 'u2')).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('si la elegida ya es creadora (dos creadores) no escribe nada', async () => {
    readsDocuments({
      'hogares/h1/miembros/u1': { estado: 'activo', rol: 'creador' },
      'hogares/h1/miembros/u2': { estado: 'activo', rol: 'creador' },
      'usuarios/u1': user,
    });
    await expect(leaveCurrentHousehold('h1', 'u2')).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('si ya había salido (desde otro celular) solo vacía hogarActualId', async () => {
    readsDocuments({
      'hogares/h1/miembros/u1': { estado: 'salio', rol: 'miembro' },
      'usuarios/u1': user,
    });
    await leaveCurrentHousehold('h1');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(updated('usuarios/u1')).toEqual([{ hogarActualId: null }]);
  });

  it('sin conexión la lectura falla y no escribe', async () => {
    mockGet.mockRejectedValue(new Error('unavailable'));
    await expect(leaveCurrentHousehold('h1')).rejects.toThrow('unavailable');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('no escribe si no existe el documento de la persona', async () => {
    readsDocuments({ 'hogares/h1/miembros/u1': { estado: 'activo', rol: 'miembro' } });
    await expect(leaveCurrentHousehold('h1')).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('falla sin sesión', async () => {
    mockCurrentUser = null;
    await expect(leaveCurrentHousehold('h1')).rejects.toThrow('sesión');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});

describe('forgetHousehold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { uid: 'u1' };
    mockRunTransaction.mockImplementation((_db, update) =>
      update({ get: mockGet, set: mockSet, update: mockUpdate }),
    );
  });

  it('vacía hogarActualId si todavía apunta a ese hogar', async () => {
    readsDocuments({ 'usuarios/u1': { hogarActualId: 'h1' } });
    await forgetHousehold('h1');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: 'usuarios/u1' }), {
      hogarActualId: null,
    });
  });

  it('no pisa un hogar al que la persona ya se unió después', async () => {
    readsDocuments({ 'usuarios/u1': { hogarActualId: 'h2' } });
    await forgetHousehold('h1');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('watchHousehold', () => {
  const snap = snapshotOf;
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
    watchHousehold('h1', onData, jest.fn(), jest.fn());

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
    watchHousehold('h1', onData, jest.fn(), jest.fn());
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
    watchHousehold('h1', jest.fn(), onError, jest.fn());
    snapshotHandlers['hogares/h1'].error();
    snapshotHandlers['hogares/h1/miembros/u1'].error();
    snapshotHandlers['hogares/h1/miembros'].error();
    expect(onError).toHaveBeenCalledTimes(3);
  });

  it('avisa el error si el hogar no existe o la membresía propia no existe', () => {
    const onError = jest.fn();
    watchHousehold('h1', jest.fn(), onError, jest.fn());
    snapshotHandlers['hogares/h1'].next(snap(undefined));
    snapshotHandlers['hogares/h1/miembros/u1'].next(snap(undefined));
    expect(onError).toHaveBeenCalledTimes(2);
  });

  describe('si la membresía propia deja de estar activa', () => {
    it.each(['quitado', 'salio'])(
      'avisa "%s" con el nombre del hogar que ya conocía',
      async (estado) => {
        const onError = jest.fn();
        const onRemoved = jest.fn();
        watchHousehold('h1', jest.fn(), onError, onRemoved);
        snapshotHandlers['hogares/h1'].next(snap({ nombre: 'Nuestra casa' }));
        snapshotHandlers['hogares/h1/miembros/u1'].next(snap({ ...memberDoc, estado }));
        await Promise.resolve();
        expect(onRemoved).toHaveBeenCalledWith(estado, 'Nuestra casa');
        expect(onError).not.toHaveBeenCalled();
        expect(mockGetFromCache).not.toHaveBeenCalled();
      },
    );

    it('si la app se abrió ya sin acceso busca el nombre en el caché', async () => {
      const onRemoved = jest.fn();
      mockGetFromCache.mockResolvedValue(snap({ nombre: 'Casa del caché' }));
      watchHousehold('h1', jest.fn(), jest.fn(), onRemoved);
      snapshotHandlers['hogares/h1/miembros/u1'].next(snap({ ...memberDoc, estado: 'quitado' }));
      await waitFor(() => expect(onRemoved).toHaveBeenCalledWith('quitado', 'Casa del caché'));
    });

    it('sin nombre en el caché avisa igual, con el nombre vacío', async () => {
      const onRemoved = jest.fn();
      mockGetFromCache.mockRejectedValue(new Error('not-found'));
      watchHousehold('h1', jest.fn(), jest.fn(), onRemoved);
      snapshotHandlers['hogares/h1/miembros/u1'].next(snap({ ...memberDoc, estado: 'quitado' }));
      await waitFor(() => expect(onRemoved).toHaveBeenCalledWith('quitado', ''));
    });
  });

  it('avisa el error sin sesión, y al dejar de escuchar corta las tres lecturas', () => {
    const onError = jest.fn();
    mockCurrentUser = null;
    watchHousehold('h1', jest.fn(), onError, jest.fn());
    expect(onError).toHaveBeenCalledTimes(1);

    mockCurrentUser = { uid: 'u1' };
    watchHousehold('h1', jest.fn(), jest.fn(), jest.fn())();
    expect(mockStop).toHaveBeenCalledTimes(3);
  });
});
