import { act, renderHook } from '@testing-library/react-native';

import type { FailedDescriptor } from './failureLogic';
import {
  clearFailures,
  discardFailures,
  retryFailures,
  trackWrite,
  useFailures,
} from './failureStore';
import {
  addItem,
  createList,
  renameList,
  setItemDeleted,
  setItemDone,
  setListDeleted,
  updateItemFields,
} from './listSource';
import type { ListInfo, ListItem } from './types';

const item: ListItem = { id: 'i1', listId: 'l1', name: 'Leche', done: false, addedBy: 'u1' };
const list: ListInfo = { id: 'l1', name: 'Súper', tone: 'green', icon: 'list' };
const base = { householdId: 'h1', uid: 'u1' };
const adding: FailedDescriptor = { ...base, kind: 'addItem', item };

/** Deja correr las promesas ya resueltas o rechazadas. */
const flush = () => act(async () => {});
const denied = () =>
  Object.assign(new Error('permission-denied'), { code: 'firestore/permission-denied' });

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  clearFailures();
  [
    addItem,
    createList,
    renameList,
    setItemDeleted,
    setItemDone,
    setListDeleted,
    updateItemFields,
  ].forEach((write) => (write as jest.Mock).mockClear());
});

afterEach(() => jest.restoreAllMocks());

describe('trackWrite', () => {
  it('guarda la escritura que el servidor rechazó', async () => {
    const { result } = await renderHook(() => useFailures('l1'));
    trackWrite(Promise.reject(denied()), adding);
    await flush();
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ kind: 'addItem', item });
  });

  it('una escritura confirmada no deja nada', async () => {
    const { result } = await renderHook(() => useFailures('l1'));
    trackWrite(Promise.resolve(), adding);
    await flush();
    expect(result.current).toEqual([]);
  });

  it('sin conexión la promesa queda pendiente: no es un fallo', async () => {
    const { result } = await renderHook(() => useFailures('l1'));
    trackWrite(new Promise(() => {}), adding);
    await flush();
    expect(result.current).toEqual([]);
  });

  it('cada pantalla ve solo los suyos', async () => {
    const lista = await renderHook(() => useFailures('l1'));
    const otra = await renderHook(() => useFailures('l2'));
    const inicio = await renderHook(() => useFailures('home'));
    trackWrite(Promise.reject(denied()), adding);
    trackWrite(Promise.reject(denied()), { ...base, kind: 'createList', list, tone: 'green' });
    await flush();
    expect(lista.result.current.map((f) => f.kind)).toEqual(['addItem']);
    expect(otra.result.current).toEqual([]);
    expect(inicio.result.current.map((f) => f.kind)).toEqual(['createList']);
  });

  it('un rechazo que llega después de dejar de leer el hogar no cuenta', async () => {
    const { result } = await renderHook(() => useFailures('l1'));
    let reject: (error: Error) => void = () => {};
    trackWrite(new Promise((_, no) => (reject = no)), adding);
    clearFailures();
    reject(denied());
    await flush();
    expect(result.current).toEqual([]);
  });
});

describe('retryFailures', () => {
  it('vuelve a enviar cada cambio con sus datos, un ítem nuevo con el mismo id', async () => {
    const { result } = await renderHook(() => useFailures('l1'));
    const failing: FailedDescriptor[] = [
      adding,
      { ...base, kind: 'toggleItem', item, done: true },
      { ...base, kind: 'editItem', item, patch: { quantity: 2 } },
      { ...base, kind: 'deleteItem', item, deleted: true },
      { ...base, kind: 'renameList', list, name: 'Verdulería' },
    ];
    failing.forEach((descriptor) => trackWrite(Promise.reject(denied()), descriptor));
    await flush();
    expect(result.current).toHaveLength(5);

    await act(async () => retryFailures('l1'));
    await flush();

    expect(addItem).toHaveBeenCalledWith('h1', 'u1', 'l1', 'Leche', 'i1');
    expect(setItemDone).toHaveBeenCalledWith('h1', 'u1', 'i1', true);
    expect(updateItemFields).toHaveBeenCalledWith('h1', 'i1', { quantity: 2 });
    expect(setItemDeleted).toHaveBeenCalledWith('h1', 'u1', 'i1', true);
    expect(renameList).toHaveBeenCalledWith('h1', 'l1', 'Verdulería');
    // Salieron bien: desaparecen.
    expect(result.current).toEqual([]);
  });

  it('reintenta en el orden en que se hicieron', async () => {
    const order: string[] = [];
    (addItem as jest.Mock).mockImplementationOnce(() => {
      order.push('addItem');
      return { id: 'i1', saved: Promise.resolve() };
    });
    (setItemDone as jest.Mock).mockImplementationOnce(() => {
      order.push('toggleItem');
      return Promise.resolve();
    });
    trackWrite(Promise.reject(denied()), adding);
    trackWrite(Promise.reject(denied()), { ...base, kind: 'toggleItem', item, done: true });
    await flush();
    await act(async () => retryFailures('l1'));
    expect(order).toEqual(['addItem', 'toggleItem']);
  });

  it('reintenta crear y eliminar listas con los datos de la lista', async () => {
    trackWrite(Promise.reject(denied()), { ...base, kind: 'createList', list, tone: 'amber' });
    trackWrite(Promise.reject(denied()), { ...base, kind: 'deleteList', list });
    await flush();
    await act(async () => retryFailures('home'));
    expect(createList).toHaveBeenCalledWith('h1', 'u1', 'Súper', 'amber', 'l1');
    expect(setListDeleted).toHaveBeenCalledWith('h1', 'u1', 'l1');
  });

  it('si el servidor lo rechaza otra vez, vuelve a quedar como fallido', async () => {
    const { result } = await renderHook(() => useFailures('l1'));
    trackWrite(Promise.reject(denied()), { ...base, kind: 'toggleItem', item, done: true });
    await flush();
    (setItemDone as jest.Mock).mockReturnValueOnce(Promise.reject(denied()));
    await act(async () => retryFailures('l1'));
    await flush();
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({ kind: 'toggleItem', done: true });
  });

  it('solo toca los fallos de esa pantalla', async () => {
    trackWrite(Promise.reject(denied()), adding);
    trackWrite(Promise.reject(denied()), { ...base, kind: 'deleteList', list });
    await flush();
    await act(async () => retryFailures('l1'));
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(setListDeleted).not.toHaveBeenCalled();
  });
});

describe('discardFailures', () => {
  it('los saca de la lista sin enviar nada', async () => {
    const { result } = await renderHook(() => useFailures('l1'));
    trackWrite(Promise.reject(denied()), adding);
    await flush();
    await act(async () => discardFailures('l1'));
    expect(result.current).toEqual([]);
    expect(addItem).not.toHaveBeenCalled();
  });
});
