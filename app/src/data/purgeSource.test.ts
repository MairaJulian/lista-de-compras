import { purgeExpired, purgeOncePerOpening, resetPurgeRuns } from './purgeSource';

jest.unmock('./purgeSource');

type Constraint = { where?: [string, string, unknown]; limit?: number };

const mockGetDocsFromServer = jest.fn();
const mockCommit = jest.fn();
const mockBatchDelete = jest.fn();

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  doc: (parent: { path: string }, id: string) => ({ path: `${parent.path}/${id}`, id }),
  where: (field: string, operator: string, value: unknown) => ({ where: [field, operator, value] }),
  limit: (count: number) => ({ limit: count }),
  query: (ref: { path: string }, ...constraints: Constraint[]) => ({ ...ref, constraints }),
  Timestamp: { fromMillis: (millis: number) => ({ millis }) },
  getDocsFromServer: (...args: unknown[]) => mockGetDocsFromServer(...args),
  writeBatch: () => ({
    delete: (ref: { path: string }) => mockBatchDelete(ref.path),
    commit: () => mockCommit(),
  }),
}));

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;
const docsOf = (...ids: string[]) => ({ docs: ids.map((id) => ({ id })) });

type Query = { path: string; constraints: Constraint[] };
const describeQuery = (q: Query) => {
  const clause = q.constraints.find((c) => c.where)?.where;
  return `${q.path} ${clause?.[0]} ${clause?.[1]}`;
};

/** Responde cada consulta con lo que haya en `store[<colección> <campo> <operador>]`, una tanda por vez. */
function serve(store: Record<string, string[][]>) {
  mockGetDocsFromServer.mockImplementation(async (q: Query) => {
    const batches = store[describeQuery(q)] ?? [];
    return docsOf(...(batches.shift() ?? []));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetPurgeRuns();
  mockCommit.mockResolvedValue(undefined);
});

describe('purgeExpired', () => {
  it('consulta cada colección por un solo campo (sin índice compuesto), con tope de 500', async () => {
    serve({});
    await purgeExpired('h1', NOW);
    const queries = mockGetDocsFromServer.mock.calls.map((call) => call[0] as Query);
    expect(queries.map(describeQuery)).toEqual([
      'hogares/h1/items borradoEn <',
      'hogares/h1/listas eliminadaEn <',
      'hogares/h1/listas eliminadaEn <',
    ]);
    for (const q of queries) {
      expect(q.constraints).toHaveLength(2);
      expect(q.constraints.find((c) => c.limit)?.limit).toBe(500);
    }
    // El corte es de hace 31 días.
    expect(queries[0].constraints[0].where?.[2]).toEqual({ millis: NOW - 31 * DAY });
  });

  it('elimina los ítems vencidos, luego los ítems de cada lista vencida y al final la lista', async () => {
    serve({
      'hogares/h1/items borradoEn <': [['i1', 'i2']],
      'hogares/h1/listas eliminadaEn <': [['l1'], ['l1']],
      'hogares/h1/items listaId ==': [['i3']],
    });
    await expect(purgeExpired('h1', NOW)).resolves.toBe(4);
    expect(mockBatchDelete.mock.calls.map((call) => call[0])).toEqual([
      'hogares/h1/items/i1',
      'hogares/h1/items/i2',
      'hogares/h1/items/i3',
      'hogares/h1/listas/l1',
    ]);
    expect(mockCommit).toHaveBeenCalledTimes(3);
  });

  it('sin nada vencido no escribe', async () => {
    serve({});
    await expect(purgeExpired('h1', NOW)).resolves.toBe(0);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it('las lecturas van al servidor: sin conexión falla y no encola ninguna escritura', async () => {
    mockGetDocsFromServer.mockRejectedValue(new Error('unavailable'));
    await expect(purgeExpired('h1', NOW)).rejects.toThrow('unavailable');
    expect(mockCommit).not.toHaveBeenCalled();
  });
});

describe('purgeOncePerOpening', () => {
  it('corre una sola vez por hogar en cada apertura', async () => {
    serve({});
    await purgeOncePerOpening('h1');
    await purgeOncePerOpening('h1');
    expect(mockGetDocsFromServer).toHaveBeenCalledTimes(3);
    await purgeOncePerOpening('h2');
    expect(mockGetDocsFromServer).toHaveBeenCalledTimes(6);
  });

  it('si falla no avisa ni reintenta hasta la próxima apertura', async () => {
    mockGetDocsFromServer.mockRejectedValue(new Error('permission-denied'));
    await expect(purgeOncePerOpening('h1')).resolves.toBeUndefined();
    await purgeOncePerOpening('h1');
    expect(mockGetDocsFromServer).toHaveBeenCalledTimes(1);
  });
});
