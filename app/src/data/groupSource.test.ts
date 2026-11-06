import { fetchMyGroups, switchToGroup } from './groupSource';

// La jest.setup global reemplaza `groupSource` por un mock: acá se prueba la implementación real.
jest.unmock('./groupSource');

const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockCount = jest.fn();
const mockUpdateDoc = jest.fn();
const mockWhere = jest.fn((field: string, op: string, value: unknown) => ({ field, op, value }));
let mockUser: { uid: string } | null = { uid: 'u1' };

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: () => ({ currentUser: mockUser }),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collectionGroup: (_db: unknown, id: string) => ({ path: `*/${id}` }),
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  query: (source: { path: string }, ...filters: unknown[]) => ({ ...source, filters }),
  where: (...args: [string, string, unknown]) => mockWhere(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getCountFromServer: (...args: unknown[]) => mockCount(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}));

const timestamp = (millis: number) => ({ toMillis: () => millis });
const membership = (householdId: string, data: object) => ({
  ref: { parent: { parent: { id: householdId } } },
  data: () => data,
});
const household = (data: object | undefined) => ({
  exists: () => data !== undefined,
  data: () => data,
});

describe('fetchMyGroups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: 'u1' };
    mockCount.mockImplementation(async (source: { path: string }) => ({
      data: () => ({ count: source.path.endsWith('/miembros') ? 3 : 7 }),
    }));
  });

  it('consulta solo los grupos propios y activos (por uid y estado)', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await fetchMyGroups();
    const queried = mockGetDocs.mock.calls[0][0];
    expect(queried.path).toBe('*/miembros');
    expect(queried.filters).toEqual([
      { field: 'uid', op: '==', value: 'u1' },
      { field: 'estado', op: '==', value: 'activo' },
    ]);
  });

  it('arma cada grupo con nombre, tipo, rol, fecha de entrada y conteos', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        membership('h1', { rol: 'creador', desde: timestamp(100) }),
        membership('h2', { rol: 'miembro', desde: timestamp(200) }),
      ],
    });
    mockGetDoc.mockImplementation(async (ref: { path: string }) =>
      household(
        ref.path === 'hogares/h1'
          ? { nombre: 'Nuestra casa' }
          : { nombre: 'Juntada', tipo: 'amigos' },
      ),
    );
    expect(await fetchMyGroups()).toEqual([
      {
        id: 'h1',
        name: 'Nuestra casa',
        type: 'familia',
        archived: false,
        archivedAt: undefined,
        role: 'creator',
        since: 100,
        memberCount: 3,
        pendingCount: 7,
      },
      {
        id: 'h2',
        name: 'Juntada',
        type: 'amigos',
        archived: false,
        archivedAt: undefined,
        role: 'member',
        since: 200,
        memberCount: 3,
        pendingCount: 7,
      },
    ]);
  });

  it('cuenta miembros activos e ítems pendientes (no borrados ni comprados) del grupo', async () => {
    mockGetDocs.mockResolvedValue({ docs: [membership('h1', { rol: 'miembro' })] });
    mockGetDoc.mockResolvedValue(household({ nombre: 'Casa' }));
    await fetchMyGroups();
    const queries = mockCount.mock.calls.map((call) => call[0]);
    expect(queries).toEqual([
      { path: 'hogares/h1/miembros', filters: [{ field: 'estado', op: '==', value: 'activo' }] },
      {
        path: 'hogares/h1/items',
        filters: [
          { field: 'borrado', op: '==', value: false },
          { field: 'comprado', op: '==', value: false },
        ],
      },
    ]);
  });

  it('de un grupo archivado no lee conteos (solo el documento) y trae la fecha', async () => {
    mockGetDocs.mockResolvedValue({ docs: [membership('h1', { rol: 'miembro' })] });
    mockGetDoc.mockResolvedValue(
      household({ nombre: 'Cena', archivado: true, archivadoEn: timestamp(500) }),
    );
    const [group] = await fetchMyGroups();
    expect(mockCount).not.toHaveBeenCalled();
    expect(group).toEqual(
      expect.objectContaining({
        archived: true,
        archivedAt: 500,
        memberCount: undefined,
        pendingCount: undefined,
      }),
    );
  });

  it('si un conteo falla el grupo igual aparece, sin ese número', async () => {
    mockGetDocs.mockResolvedValue({ docs: [membership('h1', { rol: 'miembro' })] });
    mockGetDoc.mockResolvedValue(household({ nombre: 'Casa' }));
    mockCount.mockRejectedValue(new Error('unavailable'));
    const [group] = await fetchMyGroups();
    expect(group).toEqual(
      expect.objectContaining({ name: 'Casa', memberCount: undefined, pendingCount: undefined }),
    );
  });

  it('un grupo que no se puede leer o ya no existe no tira abajo a los demás', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        membership('h1', { rol: 'miembro' }),
        membership('h2', { rol: 'miembro' }),
        membership('h3', { rol: 'miembro' }),
      ],
    });
    mockGetDoc.mockImplementation(async (ref: { path: string }) => {
      if (ref.path === 'hogares/h2') throw new Error('permission-denied');
      if (ref.path === 'hogares/h3') return household(undefined);
      return household({ nombre: 'Casa' });
    });
    expect((await fetchMyGroups()).map((group) => group.id)).toEqual(['h1']);
  });

  it('rechaza si la consulta falla (sin conexión) o no hay sesión', async () => {
    mockGetDocs.mockRejectedValue(new Error('unavailable'));
    await expect(fetchMyGroups()).rejects.toThrow('unavailable');
    mockUser = null;
    await expect(fetchMyGroups()).rejects.toThrow('No hay una sesión abierta.');
  });

  it('no abre ningún listener (solo lecturas puntuales)', async () => {
    mockGetDocs.mockResolvedValue({ docs: [membership('h1', { rol: 'miembro' })] });
    mockGetDoc.mockResolvedValue(household({ nombre: 'Casa' }));
    // `onSnapshot` ni siquiera está en el mock de Firestore: usarlo habría fallado.
    await expect(fetchMyGroups()).resolves.toHaveLength(1);
  });
});

describe('switchToGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: 'u1' };
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it('cambia solo hogarActualId y marca ultimoUso en la membresía propia', async () => {
    await switchToGroup('h2', false);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'hogares/h2/miembros/u1' },
      { ultimoUso: 'SERVER_TIMESTAMP' },
    );
    expect(mockUpdateDoc).toHaveBeenCalledWith({ path: 'usuarios/u1' }, { hogarActualId: 'h2' });
  });

  it('en un grupo archivado no marca ultimoUso (las reglas no lo admiten)', async () => {
    await switchToGroup('h4', true);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc).toHaveBeenCalledWith({ path: 'usuarios/u1' }, { hogarActualId: 'h4' });
  });

  it('si falla marcar ultimoUso igual cambia de grupo', async () => {
    mockUpdateDoc.mockImplementation(async (ref: { path: string }) => {
      if (ref.path.includes('miembros')) throw new Error('permission-denied');
    });
    await expect(switchToGroup('h2', false)).resolves.toBeUndefined();
    expect(mockUpdateDoc).toHaveBeenCalledWith({ path: 'usuarios/u1' }, { hogarActualId: 'h2' });
  });

  it('rechaza si el cambio de hogarActualId falla', async () => {
    mockUpdateDoc.mockImplementation(async (ref: { path: string }) => {
      if (ref.path.startsWith('usuarios')) throw new Error('permission-denied');
    });
    await expect(switchToGroup('h2', false)).rejects.toThrow('permission-denied');
  });
});
