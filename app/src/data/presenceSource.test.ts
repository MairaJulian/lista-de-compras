import { AppState } from 'react-native';

import {
  canCleanUpList,
  PRESENCE_READ_TIMEOUT_MS,
  readPresencesFromServer,
  startPresence,
  writePresence,
} from './presenceSource';

jest.unmock('./presenceSource');

const mockSetDoc = jest.fn();
const mockGetDocsFromServer = jest.fn();

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDocsFromServer: (...args: unknown[]) => mockGetDocsFromServer(...args),
}));

const NOW = 1_700_000_000_000;
const ts = (millis: number) => ({ toMillis: () => millis });
const snapshotOf = (docs: Record<string, Record<string, unknown>>) => ({
  docs: Object.entries(docs).map(([id, data]) => ({ id, data: () => data })),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSetDoc.mockResolvedValue(undefined);
});

describe('writePresence', () => {
  it('escribe solo listaId y ultimoLatido (hora del servidor), con merge', async () => {
    await writePresence('h1', 'u1', 'l1');
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'hogares/h1/presencia/u1' },
      { listaId: 'l1', ultimoLatido: 'SERVER_TIMESTAMP' },
      { merge: true },
    );
  });

  it('un latido que falla no es un error para quien lo escribe', async () => {
    mockSetDoc.mockRejectedValue(new Error('sin red'));
    await expect(writePresence('h1', 'u1', 'l1')).resolves.toBeUndefined();
  });
});

describe('startPresence', () => {
  let listener: ((state: string) => void) | undefined;
  const remove = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    listener = undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler as (state: string) => void;
      return { remove } as never;
    });
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const writes = () =>
    mockSetDoc.mock.calls.map((call) => (call[1] as { listaId: string }).listaId);

  it('late al abrir y cada 30 segundos', () => {
    const stop = startPresence('h1', 'u1', 'l1');
    expect(writes()).toEqual(['l1']);
    jest.advanceTimersByTime(30_000);
    expect(writes()).toEqual(['l1', 'l1']);
    jest.advanceTimersByTime(60_000);
    expect(writes()).toEqual(['l1', 'l1', 'l1', 'l1']);
    stop();
  });

  it('al terminar deja de latir y vacía listaId', () => {
    const stop = startPresence('h1', 'u1', 'l1');
    stop();
    expect(writes()).toEqual(['l1', '']);
    expect(remove).toHaveBeenCalled();
    jest.advanceTimersByTime(120_000);
    expect(writes()).toEqual(['l1', '']);
  });

  it('con la app en segundo plano el latido se detiene, y al volver se retoma', () => {
    const stop = startPresence('h1', 'u1', 'l1');
    listener?.('background');
    jest.advanceTimersByTime(300_000);
    expect(writes()).toEqual(['l1']);
    listener?.('active');
    expect(writes()).toEqual(['l1', 'l1']);
    jest.advanceTimersByTime(30_000);
    expect(writes()).toEqual(['l1', 'l1', 'l1']);
    stop();
  });

  it('si se abre con la app en segundo plano no late hasta que vuelve', () => {
    Object.defineProperty(AppState, 'currentState', { value: 'background', configurable: true });
    const stop = startPresence('h1', 'u1', 'l1');
    jest.advanceTimersByTime(90_000);
    expect(writes()).toEqual([]);
    listener?.('active');
    expect(writes()).toEqual(['l1']);
    stop();
  });

  it('volver a "active" dos veces seguidas no duplica el temporizador', () => {
    const stop = startPresence('h1', 'u1', 'l1');
    listener?.('active');
    listener?.('active');
    mockSetDoc.mockClear();
    jest.advanceTimersByTime(30_000);
    expect(writes()).toEqual(['l1']);
    stop();
  });
});

describe('readPresencesFromServer', () => {
  it('lee la colección con una lectura puntual al servidor', async () => {
    mockGetDocsFromServer.mockResolvedValue(
      snapshotOf({ u2: { listaId: 'l1', ultimoLatido: ts(NOW) } }),
    );
    await expect(readPresencesFromServer('h1')).resolves.toEqual([
      { uid: 'u2', listId: 'l1', lastBeat: NOW },
    ]);
    expect(mockGetDocsFromServer).toHaveBeenCalledWith({ path: 'hogares/h1/presencia' });
  });

  it('falla si el servidor no responde a tiempo', async () => {
    jest.useFakeTimers();
    mockGetDocsFromServer.mockReturnValue(new Promise(() => {}));
    const result = expect(readPresencesFromServer('h1')).rejects.toThrow('presence-timeout');
    jest.advanceTimersByTime(PRESENCE_READ_TIMEOUT_MS);
    await result;
    jest.useRealTimers();
  });
});

describe('canCleanUpList', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });
  afterEach(() => jest.restoreAllMocks());

  it('sí, si nadie más la tiene abierta', async () => {
    mockGetDocsFromServer.mockResolvedValue(
      snapshotOf({
        u1: { listaId: 'l1', ultimoLatido: ts(NOW) },
        u2: { listaId: '', ultimoLatido: ts(NOW) },
        u3: { listaId: 'l1', ultimoLatido: ts(NOW - 200_000) },
      }),
    );
    await expect(canCleanUpList('h1', 'l1', 'u1')).resolves.toBe(true);
  });

  it('no, si otra persona la tiene abierta', async () => {
    mockGetDocsFromServer.mockResolvedValue(
      snapshotOf({ u2: { listaId: 'l1', ultimoLatido: ts(NOW - 20_000) } }),
    );
    await expect(canCleanUpList('h1', 'l1', 'u1')).resolves.toBe(false);
  });

  it('no, si la lectura falla (sin conexión, sin permiso): no se borra nada', async () => {
    mockGetDocsFromServer.mockRejectedValue(new Error('unavailable'));
    await expect(canCleanUpList('h1', 'l1', 'u1')).resolves.toBe(false);
  });
});
