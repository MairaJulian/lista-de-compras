import { act, renderHook } from '@testing-library/react-native';

import { signedInState } from '../auth/sessionState';
import { resetSession } from '../auth/sessionStore';
import { useHousehold, useHouseholdLoad, useList, useListsLoad, useLists } from './hooks';
import { resetHouseholdStore, seedHousehold } from './householdStore';
import { resetListData, startListData } from './listStore';
import { watchHouseholdData } from './listSource';

// Al cambiar de grupo, entre que cambia `hogarActualId` y que la raíz empieza a leer el grupo nuevo
// hay un momento en que los stores todavía tienen el grupo anterior: no se tiene que ver nada de él.

const account = { displayName: 'Maira', email: 'm@example.com', photoURL: null };
const me = { id: 'u1', name: 'Maira', role: 'creator' as const, tone: 'green' as const };
const sync = { fromCache: false, pendingItemIds: [], pendingListIds: [] };

const dataOf = (listName: string) => ({
  lists: [
    { id: 'l1', name: listName, tone: 'green' as const, icon: 'list' as const, createdAt: 1 },
  ],
  items: [{ id: 'i1', listId: 'l1', name: 'Leche', done: false, addedBy: 'u1', addedAt: 1 }],
  members: [me],
  sync,
});

function signIn(householdId: string | null) {
  resetSession(signedInState(account, { hogarActualId: householdId }));
}

describe('cambiar de grupo no deja ver datos del anterior', () => {
  beforeEach(() => {
    resetHouseholdStore();
    resetListData();
    (watchHouseholdData as jest.Mock).mockReset().mockImplementation((id, onData) => {
      onData(dataOf(id === 'h1' ? 'Lista de la casa' : 'Lista de la juntada'));
      return () => {};
    });
    signIn('h1');
    startListData('h1');
    seedHousehold({
      id: 'h1',
      name: 'Casa',
      type: 'familia',
      archived: false,
      activeInviteId: null,
      me,
      members: [me],
    });
  });

  it('con el grupo actual muestra sus listas y su nombre', async () => {
    const { result } = await renderHook(() => ({ lists: useLists(), household: useHousehold() }));
    expect(result.current.lists.map((list) => list.name)).toEqual(['Lista de la casa']);
    expect(result.current.household.name).toBe('Casa');
  });

  it('en el mismo instante en que cambia hogarActualId ya no muestra listas ni nombre del anterior', async () => {
    const { result } = await renderHook(() => ({
      lists: useLists(),
      household: useHousehold(),
      listsLoad: useListsLoad(),
      householdLoad: useHouseholdLoad(),
      list: useList('l1'),
    }));
    expect(result.current.lists).toHaveLength(1);

    // La sesión pasa a `h2`, pero nadie empezó a leer `h2` todavía (los stores siguen con `h1`).
    await act(async () => signIn('h2'));

    expect(result.current.lists).toEqual([]);
    expect(result.current.list).toBeUndefined();
    expect(result.current.household).toEqual({ id: '', name: '', members: [] });
    expect(result.current.listsLoad.status).toBe('loading');
    expect(result.current.householdLoad.status).toBe('loading');
  });

  it('cuando se empieza a leer el grupo nuevo muestra solo sus listas', async () => {
    const { result } = await renderHook(() => useLists());
    await act(async () => signIn('h2'));
    expect(result.current).toEqual([]);
    await act(async () => void startListData('h2'));
    expect(result.current.map((list) => list.name)).toEqual(['Lista de la juntada']);
  });

  it('al quedarse sin grupo no queda nada del anterior', async () => {
    const { result } = await renderHook(() => useLists());
    await act(async () => signIn(null));
    expect(result.current).toEqual([]);
  });
});
