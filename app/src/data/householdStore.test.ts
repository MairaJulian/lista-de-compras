import { act, renderHook } from '@testing-library/react-native';

import { watchHousehold } from './householdSource';
import {
  resetHouseholdStore,
  retryHousehold,
  seedHousehold,
  startHousehold,
  useHouseholdState,
} from './householdStore';

const household = {
  id: 'h1',
  name: 'Nuestra casa',
  activeInviteId: null,
  me: { id: 'u1', name: 'Maira', role: 'creator' as const, tone: 'green' as const },
  members: [{ id: 'u1', name: 'Maira', role: 'creator' as const, tone: 'green' as const }],
};

let emit: {
  data: (h: typeof household) => void;
  error: () => void;
  removed: (reason: 'quitado' | 'salio', name: string) => void;
};
const stop = jest.fn();

describe('householdStore', () => {
  beforeEach(() => {
    resetHouseholdStore();
    stop.mockReset();
    (watchHousehold as jest.Mock).mockReset();
    (watchHousehold as jest.Mock).mockImplementation((_id, data, error, removed) => {
      emit = { data, error, removed };
      return stop;
    });
  });

  it('empieza sin leer, pasa a "leyendo" y después a "listo" con los datos', async () => {
    const { result } = await renderHook(() => useHouseholdState());
    expect(result.current).toEqual({ status: 'idle' });

    await act(async () => void startHousehold('h1'));
    expect(result.current).toEqual({ status: 'loading' });
    expect(watchHousehold).toHaveBeenCalledWith(
      'h1',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );

    await act(async () => emit.data(household));
    expect(result.current).toEqual({ status: 'ready', household });
  });

  it('si falla la lectura queda en error y "Reintentar" vuelve a leer', async () => {
    const { result } = await renderHook(() => useHouseholdState());
    await act(async () => void startHousehold('h1'));
    await act(async () => emit.error());
    expect(result.current).toEqual({ status: 'error' });

    await act(async () => retryHousehold());
    expect(result.current).toEqual({ status: 'loading' });
    expect(watchHousehold).toHaveBeenCalledTimes(2);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('el hogar recién creado se ve enseguida y no vuelve a "leyendo" al empezar a leer', async () => {
    const { result } = await renderHook(() => useHouseholdState());
    await act(async () => seedHousehold(household));
    await act(async () => void startHousehold('h1'));
    expect(result.current).toEqual({ status: 'ready', household });
  });

  it('un hogar distinto al sembrado sí vuelve a "leyendo"', async () => {
    const { result } = await renderHook(() => useHouseholdState());
    await act(async () => seedHousehold(household));
    await act(async () => void startHousehold('h2'));
    expect(result.current).toEqual({ status: 'loading' });
  });

  it('al dejar de leer corta la lectura y vacía el estado', async () => {
    const { result } = await renderHook(() => useHouseholdState());
    let stopReading = () => {};
    await act(async () => {
      stopReading = startHousehold('h1');
    });
    await act(async () => stopReading());
    expect(stop).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({ status: 'idle' });
  });

  it('si la membresía deja de estar activa queda en "removed" y deja de leer', async () => {
    const { result } = await renderHook(() => useHouseholdState());
    await act(async () => void startHousehold('h1'));
    await act(async () => emit.data(household));
    await act(async () => emit.removed('quitado', 'Nuestra casa'));
    expect(result.current).toEqual({
      status: 'removed',
      reason: 'quitado',
      householdName: 'Nuestra casa',
    });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('después de "removed" los errores y las lecturas que llegan tarde no lo pisan', async () => {
    const { result } = await renderHook(() => useHouseholdState());
    await act(async () => void startHousehold('h1'));
    await act(async () => emit.removed('salio', 'Nuestra casa'));
    await act(async () => emit.error());
    await act(async () => emit.data(household));
    expect(result.current).toMatchObject({ status: 'removed', reason: 'salio' });
  });

  it('un aviso de una lectura que ya se dejó atrás se ignora', async () => {
    const { result } = await renderHook(() => useHouseholdState());
    let stopReading = () => {};
    await act(async () => {
      stopReading = startHousehold('h1');
    });
    const staleEmit = emit;
    await act(async () => stopReading());
    await act(async () => staleEmit.removed('quitado', 'Nuestra casa'));
    expect(result.current).toEqual({ status: 'idle' });
  });

  it('"Reintentar" sin haber empezado a leer no hace nada', () => {
    retryHousehold();
    expect(watchHousehold).not.toHaveBeenCalled();
  });
});
