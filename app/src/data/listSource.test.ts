import {
  addItem,
  createList,
  renameList,
  setItemDeleted,
  setListDeleted,
  setItemDone,
  updateItemFields,
  watchHouseholdData,
} from './listSource';

jest.unmock('./listSource');

const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockStop = jest.fn();
const handlers: Record<string, { next: (s: unknown) => void; error: () => void }> = {};
const mockWhere = jest.fn((...args: unknown[]) => ({ where: args }));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: (_db: unknown, ...segments: string[]) => ({
    collectionPath: segments.join('/'),
    path: segments.join('/'),
  }),
  doc: (parent: { collectionPath?: string }, ...segments: string[]) =>
    parent.collectionPath !== undefined
      ? {
          path: `${parent.collectionPath}/${segments[0] ?? 'nuevo-id'}`,
          id: segments[0] ?? 'nuevo-id',
        }
      : { path: segments.join('/'), id: segments[segments.length - 1] },
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  deleteField: () => 'DELETE_FIELD',
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  query: (ref: { path: string }, ...constraints: unknown[]) => ({ ...ref, constraints }),
  where: (...args: unknown[]) => mockWhere(...args),
  onSnapshot: (ref: { path: string }, next: (s: unknown) => void, error: () => void) => {
    handlers[ref.path] = { next, error };
    return mockStop;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSetDoc.mockResolvedValue(undefined);
  mockUpdateDoc.mockResolvedValue(undefined);
});

describe('escrituras', () => {
  it('crea la lista con id del celular, hora del servidor y sin eliminar', () => {
    const { id } = createList('h1', 'u1', 'Súper', 'amber');
    expect(id).toBe('nuevo-id');
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'hogares/h1/listas/nuevo-id', id: 'nuevo-id' },
      {
        nombre: 'Súper',
        color: 'amber',
        creadaPor: 'u1',
        creadaEn: 'SERVER_TIMESTAMP',
        eliminada: false,
      },
    );
  });

  it('al reintentar crea la lista con el mismo id', () => {
    const { id } = createList('h1', 'u1', 'Súper', 'amber', 'lista-1');
    expect(id).toBe('lista-1');
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'hogares/h1/listas/lista-1', id: 'lista-1' },
      expect.objectContaining({ nombre: 'Súper' }),
    );
  });

  it('al reintentar agrega el ítem con el mismo id', () => {
    const { id } = addItem('h1', 'u1', 'l1', 'Leche', 'item-1');
    expect(id).toBe('item-1');
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'hogares/h1/items/item-1', id: 'item-1' },
      expect.objectContaining({ nombre: 'Leche', borrado: false, comprado: false }),
    );
  });

  it('renombrar toca solo el nombre', () => {
    renameList('h1', 'l1', 'Verdulería');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'hogares/h1/listas/l1', id: 'l1' },
      { nombre: 'Verdulería' },
    );
  });

  it('eliminar la lista es una sola escritura que la marca, con quién y cuándo, sin tocar sus ítems', () => {
    setListDeleted('h1', 'u1', 'l1');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'hogares/h1/listas/l1', id: 'l1' },
      { eliminada: true, eliminadaPor: 'u1', eliminadaEn: 'SERVER_TIMESTAMP' },
    );
  });

  it('agrega el ítem siempre con comprado y borrado en false, quién lo agregó y la hora del servidor', () => {
    addItem('h1', 'u1', 'l1', 'Leche');
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'hogares/h1/items/nuevo-id', id: 'nuevo-id' },
      {
        listaId: 'l1',
        nombre: 'Leche',
        comprado: false,
        agregadoPor: 'u1',
        agregadoEn: 'SERVER_TIMESTAMP',
        borrado: false,
      },
    );
  });

  it('devuelve la promesa de la escritura sin esperarla: sin conexión queda pendiente', () => {
    mockSetDoc.mockReturnValue(new Promise(() => {}));
    const { id, saved } = addItem('h1', 'u1', 'l1', 'Leche');
    expect(id).toBe('nuevo-id');
    expect(saved).toBeInstanceOf(Promise);
  });

  it('tildar toca solo comprado, tildadoPor y tildadoEn', () => {
    setItemDone('h1', 'u1', 'i1', true);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'hogares/h1/items/i1', id: 'i1' },
      { comprado: true, tildadoPor: 'u1', tildadoEn: 'SERVER_TIMESTAMP' },
    );
  });

  it('destildar vacía quién y cuándo', () => {
    setItemDone('h1', 'u1', 'i1', false);
    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
      comprado: false,
      tildadoPor: 'DELETE_FIELD',
      tildadoEn: 'DELETE_FIELD',
    });
  });

  it('editar toca solo los campos del parche y nunca la unidad', () => {
    updateItemFields('h1', 'i1', { quantity: 3 });
    expect(mockUpdateDoc).toHaveBeenLastCalledWith(expect.anything(), { cantidad: 3 });
    updateItemFields('h1', 'i1', { name: 'Leche entera', note: 'Sin lactosa' });
    expect(mockUpdateDoc).toHaveBeenLastCalledWith(expect.anything(), {
      nombre: 'Leche entera',
      nota: 'Sin lactosa',
    });
  });

  it('una nota vaciada borra el campo', () => {
    updateItemFields('h1', 'i1', { note: undefined });
    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), { nota: 'DELETE_FIELD' });
  });

  it('un parche vacío no escribe nada', async () => {
    await updateItemFields('h1', 'i1', {});
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('eliminar marca el ítem como borrado con quién y cuándo; deshacer lo vacía', () => {
    setItemDeleted('h1', 'u1', 'i1', true);
    expect(mockUpdateDoc).toHaveBeenLastCalledWith(expect.anything(), {
      borrado: true,
      borradoPor: 'u1',
      borradoEn: 'SERVER_TIMESTAMP',
    });
    setItemDeleted('h1', 'u1', 'i1', false);
    expect(mockUpdateDoc).toHaveBeenLastCalledWith(expect.anything(), {
      borrado: false,
      borradoPor: 'DELETE_FIELD',
      borradoEn: 'DELETE_FIELD',
    });
  });
});

describe('watchHouseholdData', () => {
  const snapshot = (docs: { id: string; data: Record<string, unknown> }[]) => ({
    docs: docs.map(({ id, data }) => ({ id, data: () => data })),
  });
  const ts = (millis: number) => ({ toMillis: () => millis });

  it('pide solo los ítems no borrados', () => {
    watchHouseholdData('h1', jest.fn(), jest.fn());
    expect(mockWhere).toHaveBeenCalledWith('borrado', '==', false);
  });

  it('avisa recién cuando llegaron las tres lecturas, y después con cada cambio', () => {
    const onData = jest.fn();
    watchHouseholdData('h1', onData, jest.fn());
    handlers['hogares/h1/listas'].next(
      snapshot([
        { id: 'l1', data: { nombre: 'Súper', color: 'green', creadaEn: ts(1), eliminada: false } },
      ]),
    );
    handlers['hogares/h1/items'].next(snapshot([]));
    expect(onData).not.toHaveBeenCalled();
    handlers['hogares/h1/miembros'].next(
      snapshot([{ id: 'u3', data: { nombre: 'Diego', estado: 'salio', colorAvatar: 'blue' } }]),
    );
    expect(onData).toHaveBeenCalledTimes(1);
    const data = onData.mock.calls[0][0];
    expect(data.lists.map((l: { name: string }) => l.name)).toEqual(['Súper']);
    // También los miembros que salieron: siguen teniendo nombre en sus ítems viejos.
    expect(data.members.map((m: { name: string }) => m.name)).toEqual(['Diego']);

    handlers['hogares/h1/items'].next(
      snapshot([
        {
          id: 'i1',
          data: { listaId: 'l1', nombre: 'Leche', agregadoPor: 'u1', agregadoEn: ts(2) },
        },
      ]),
    );
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData.mock.calls[1][0].items.map((i: { name: string }) => i.name)).toEqual(['Leche']);
  });

  it('las listas salen de la más vieja a la más nueva', () => {
    const onData = jest.fn();
    watchHouseholdData('h1', onData, jest.fn());
    handlers['hogares/h1/items'].next(snapshot([]));
    handlers['hogares/h1/miembros'].next(snapshot([]));
    handlers['hogares/h1/listas'].next(
      snapshot([
        { id: 'b', data: { nombre: 'B', color: 'green', creadaEn: ts(20) } },
        { id: 'a', data: { nombre: 'A', color: 'green', creadaEn: ts(10) } },
      ]),
    );
    expect(onData.mock.calls[0][0].lists.map((l: { id: string }) => l.id)).toEqual(['a', 'b']);
  });

  it('avisa del error de cualquiera de las lecturas', () => {
    const onError = jest.fn();
    watchHouseholdData('h1', jest.fn(), onError);
    handlers['hogares/h1/items'].error();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('al dejar de escuchar corta las tres lecturas', () => {
    const stop = watchHouseholdData('h1', jest.fn(), jest.fn());
    stop();
    expect(mockStop).toHaveBeenCalledTimes(3);
  });
});
