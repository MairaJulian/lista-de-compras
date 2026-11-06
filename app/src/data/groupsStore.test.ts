import { fetchMyGroups } from './groupSource';
import {
  GROUPS_CACHE_MS,
  invalidateGroups,
  loadGroups,
  peekGroups,
  resetGroupsStore,
} from './groupsStore';
import type { GroupSummary } from './groupLogic';

const group = (id: string): GroupSummary => ({
  id,
  name: id,
  type: 'familia',
  archived: false,
  role: 'member',
});

// `groupSource` está reemplazado por un mock en la jest.setup global.
const fetchMock = fetchMyGroups as jest.Mock;

describe('groupsStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
    resetGroupsStore();
    fetchMock.mockReset().mockResolvedValue([group('h1')]);
  });
  afterEach(() => jest.useRealTimers());

  it('lee una vez y reutiliza la lectura reciente (cuida las lecturas)', async () => {
    await loadGroups();
    await loadGroups();
    await loadGroups();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('pasado el minuto vuelve a leer', async () => {
    await loadGroups();
    jest.setSystemTime(1_000_000 + GROUPS_CACHE_MS + 1);
    await loadGroups();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('varios pedidos a la vez comparten una sola lectura', async () => {
    const [a, b] = await Promise.all([loadGroups(), loadGroups()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('"force" ignora la lectura reciente', async () => {
    await loadGroups();
    await loadGroups(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('al invalidar (crear, unirse, salir) vuelve a leer', async () => {
    await loadGroups();
    invalidateGroups();
    expect(peekGroups()).toBeUndefined();
    await loadGroups();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('una lectura que empezó antes de invalidar no queda guardada', async () => {
    let finish: (groups: GroupSummary[]) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const pending = loadGroups();
    invalidateGroups();
    finish([group('viejo')]);
    await pending;
    expect(peekGroups()).toBeUndefined();
  });

  it('si la lectura falla no guarda nada y la siguiente reintenta', async () => {
    fetchMock.mockRejectedValueOnce(new Error('unavailable'));
    await expect(loadGroups()).rejects.toThrow('unavailable');
    expect(peekGroups()).toBeUndefined();
    await expect(loadGroups()).resolves.toEqual([group('h1')]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('"peek" devuelve lo último leído aunque sea viejo', async () => {
    await loadGroups();
    jest.setSystemTime(1_000_000 + 10 * GROUPS_CACHE_MS);
    expect(peekGroups()).toEqual([group('h1')]);
  });

  it('no mezcla personas: sin sesión rechaza y lo guardado de otra no se muestra', async () => {
    const { currentUserId } = jest.requireMock('./groupSource') as {
      currentUserId: jest.Mock;
    };
    await loadGroups();
    currentUserId.mockReturnValueOnce('otra-persona');
    expect(peekGroups()).toBeUndefined();
    currentUserId.mockReturnValueOnce(null);
    await expect(loadGroups()).rejects.toThrow('No hay una sesión abierta.');
  });
});
