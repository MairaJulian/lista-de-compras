import { act, renderHook } from '@testing-library/react-native';

import { clearPending, trackPending, usePendingKeys } from './pendingStore';

const flush = () => act(async () => {});

beforeEach(() => clearPending());

describe('pendingStore', () => {
  it('una escritura sin confirmar cuenta como pendiente en su lista', async () => {
    const { result } = await renderHook(() => ({
      l1: usePendingKeys('l1'),
      l2: usePendingKeys('l2'),
    }));
    await act(async () => trackPending(new Promise(() => {}), { key: 'item:i1', listId: 'l1' }));
    expect(result.current.l1).toEqual(['item:i1']);
    expect(result.current.l2).toEqual([]);
  });

  it('al confirmarse deja de contar', async () => {
    const { result } = await renderHook(() => usePendingKeys('l1'));
    let confirm: () => void = () => {};
    await act(async () =>
      trackPending(new Promise<void>((ok) => (confirm = ok)), { key: 'item:i1', listId: 'l1' }),
    );
    expect(result.current).toHaveLength(1);
    confirm();
    await flush();
    expect(result.current).toEqual([]);
  });

  it('si el servidor la rechaza también deja de contar (pasa a ser un fallo)', async () => {
    const { result } = await renderHook(() => usePendingKeys('l1'));
    await act(async () =>
      trackPending(Promise.reject(new Error('no')), { key: 'item:i1', listId: 'l1' }),
    );
    await flush();
    expect(result.current).toEqual([]);
  });

  it('un ítem borrado sin conexión sigue contando aunque ya no esté en la lectura', async () => {
    const { result } = await renderHook(() => usePendingKeys('l1'));
    await act(async () =>
      trackPending(new Promise(() => {}), { key: 'item:borrado', listId: 'l1' }),
    );
    expect(result.current).toEqual(['item:borrado']);
  });

  it('una confirmación de una sesión anterior no toca el registro nuevo', async () => {
    const { result } = await renderHook(() => usePendingKeys('l1'));
    let confirm: () => void = () => {};
    await act(async () =>
      trackPending(new Promise<void>((ok) => (confirm = ok)), { key: 'item:a', listId: 'l1' }),
    );
    await act(async () => clearPending());
    await act(async () => trackPending(new Promise(() => {}), { key: 'item:b', listId: 'l1' }));
    confirm();
    await flush();
    expect(result.current).toEqual(['item:b']);
  });
});
