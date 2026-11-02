import { renderHook, act } from '@testing-library/react-native';

import {
  dismissLeaveUndo,
  LEAVE_UNDO_MS,
  showLeaveUndo,
  undoLeave,
  useLeaveUndo,
} from './leaveUndoStore';
import { setItemDeleted } from './listSource';
import type { ListItem } from './types';

const item = (id: string): ListItem => ({
  id,
  listId: 'l1',
  name: id,
  done: true,
  addedBy: 'u1',
});

beforeEach(() => {
  (setItemDeleted as jest.Mock).mockClear();
  dismissLeaveUndo();
});

describe('leaveUndoStore', () => {
  it('el aviso dura 8 segundos', () => {
    expect(LEAVE_UNDO_MS).toBe(8000);
  });

  it('muestra el aviso con los ítems borrados', async () => {
    const { result } = await renderHook(() => useLeaveUndo());
    expect(result.current).toBeUndefined();
    await act(async () => showLeaveUndo('h1', 'u1', [item('a'), item('b')]));
    expect(result.current?.items.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('sin ítems no muestra nada', async () => {
    const { result } = await renderHook(() => useLeaveUndo());
    await act(async () => showLeaveUndo('h1', 'u1', []));
    expect(result.current).toBeUndefined();
  });

  it('deshacer restaura todos con setItemDeleted(false) y oculta el aviso', async () => {
    const { result } = await renderHook(() => useLeaveUndo());
    await act(async () => showLeaveUndo('h1', 'u1', [item('a'), item('b')]));
    await act(async () => undoLeave());
    expect(setItemDeleted).toHaveBeenCalledTimes(2);
    expect(setItemDeleted).toHaveBeenCalledWith('h1', 'u1', 'a', false);
    expect(setItemDeleted).toHaveBeenCalledWith('h1', 'u1', 'b', false);
    expect(result.current).toBeUndefined();
  });

  it('pasado el tiempo (dismiss) ya no hay nada que deshacer', async () => {
    await act(async () => showLeaveUndo('h1', 'u1', [item('a')]));
    await act(async () => dismissLeaveUndo());
    await act(async () => undoLeave());
    expect(setItemDeleted).not.toHaveBeenCalled();
  });

  it('un borrado nuevo reinicia el aviso con otro token', async () => {
    const { result } = await renderHook(() => useLeaveUndo());
    await act(async () => showLeaveUndo('h1', 'u1', [item('a')]));
    const first = result.current?.token;
    await act(async () => showLeaveUndo('h1', 'u1', [item('b')]));
    expect(result.current?.token).not.toBe(first);
    expect(result.current?.items.map((i) => i.id)).toEqual(['b']);
  });
});
