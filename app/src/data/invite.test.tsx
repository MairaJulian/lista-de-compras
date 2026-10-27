import { act, renderHook } from '@testing-library/react-native';

import { useSession } from '../auth/sessionStore';
import { useInvite } from './hooks';
import { useHouseholdState, type HouseholdState } from './householdStore';
import { createInvite, revokeInvite, watchInvite } from './inviteSource';

jest.mock('../auth/sessionStore', () => ({ useSession: jest.fn() }));
jest.mock('./householdStore', () => ({
  useHouseholdState: jest.fn(),
  retryHousehold: jest.fn(),
  seedHousehold: jest.fn(),
}));

const HOUR = 60 * 60 * 1000;
const maira = { id: 'u1', name: 'Maira', role: 'creator' as const, tone: 'green' as const };
const ready = (activeInviteId: string | null): HouseholdState => ({
  status: 'ready',
  household: { id: 'h1', name: 'Nuestra casa', activeInviteId, me: maira, members: [maira] },
});
const timestamp = (millis: number) => ({ toMillis: () => millis });

let emit: { data: (d: object | undefined) => void; error: () => void };

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  (useSession as jest.Mock).mockReturnValue({ status: 'signedIn', demo: false, householdId: 'h1' });
  (watchInvite as jest.Mock).mockImplementation((_code, data, error) => {
    emit = { data, error };
    return () => {};
  });
});

afterEach(() => jest.useRealTimers());

describe('useInvite con una sesión real', () => {
  it('sin invitación vigente queda "sin enlace" y no lee nada', async () => {
    (useHouseholdState as jest.Mock).mockReturnValue(ready(null));
    const { result } = await renderHook(() => useInvite());
    expect(result.current.status).toBe('ready');
    expect(result.current.invite.active).toBe(false);
    expect(watchInvite).not.toHaveBeenCalled();
  });

  it('mientras no se leyó el hogar o la invitación está cargando', async () => {
    (useHouseholdState as jest.Mock).mockReturnValue({ status: 'loading' });
    const first = await renderHook(() => useInvite());
    expect(first.result.current.status).toBe('loading');

    (useHouseholdState as jest.Mock).mockReturnValue(ready('K7P2-9XQ-4MN'));
    const second = await renderHook(() => useInvite());
    expect(second.result.current.status).toBe('loading');
    expect(watchInvite).toHaveBeenCalledWith(
      'K7P2-9XQ-4MN',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('lee la invitación vigente y cuenta las horas que le quedan', async () => {
    (useHouseholdState as jest.Mock).mockReturnValue(ready('K7P2-9XQ-4MN'));
    const { result } = await renderHook(() => useInvite());

    await act(async () =>
      emit.data({ estado: 'activa', venceEn: timestamp(Date.now() + 47 * HOUR) }),
    );
    expect(result.current.status).toBe('ready');
    expect(result.current.invite).toEqual({ code: 'K7P2-9XQ-4MN', hoursLeft: 47, active: true });
  });

  it('una invitación recién creada dice 48 h aunque la pantalla se abrió antes', async () => {
    (useHouseholdState as jest.Mock).mockReturnValue(ready('K7P2-9XQ-4MN'));
    const { result } = await renderHook(() => useInvite());

    await act(async () => void jest.advanceTimersByTime(30 * 1000));
    await act(async () =>
      emit.data({ estado: 'activa', venceEn: timestamp(Date.now() + 48 * HOUR) }),
    );
    expect(result.current.invite.hoursLeft).toBe(48);
  });

  it('con el paso del tiempo baja las horas y al vencer queda inactiva, sin releer', async () => {
    (useHouseholdState as jest.Mock).mockReturnValue(ready('K7P2-9XQ-4MN'));
    const { result } = await renderHook(() => useInvite());
    await act(async () =>
      emit.data({ estado: 'activa', venceEn: timestamp(Date.now() + 2 * HOUR - 1000) }),
    );
    expect(result.current.invite.hoursLeft).toBe(2);

    await act(async () => void jest.advanceTimersByTime(HOUR));
    expect(result.current.invite.hoursLeft).toBe(1);

    await act(async () => void jest.advanceTimersByTime(HOUR));
    expect(result.current.invite.active).toBe(false);
    expect(watchInvite).toHaveBeenCalledTimes(1);
  });

  it('una invitación revocada o inexistente queda inactiva', async () => {
    (useHouseholdState as jest.Mock).mockReturnValue(ready('K7P2-9XQ-4MN'));
    const { result } = await renderHook(() => useInvite());
    await act(async () => emit.data({ estado: 'revocada', venceEn: timestamp(Date.now() + HOUR) }));
    expect(result.current.invite.active).toBe(false);
    await act(async () => emit.data(undefined));
    expect(result.current.invite.active).toBe(false);
  });

  it('si falla la lectura queda en error y "Reintentar" vuelve a leer', async () => {
    (useHouseholdState as jest.Mock).mockReturnValue(ready('K7P2-9XQ-4MN'));
    const { result } = await renderHook(() => useInvite());
    await act(async () => emit.error());
    expect(result.current.status).toBe('error');

    await act(async () => result.current.retry());
    expect(result.current.status).toBe('loading');
    expect(watchInvite).toHaveBeenCalledTimes(2);
  });

  it('no muestra la invitación anterior mientras llega la nueva', async () => {
    (useHouseholdState as jest.Mock).mockReturnValue(ready('OLD-CODE-1234'));
    const { result, rerender } = await renderHook(() => useInvite());
    await act(async () =>
      emit.data({ estado: 'activa', venceEn: timestamp(Date.now() + 10 * HOUR) }),
    );
    expect(result.current.invite.code).toBe('OLD-CODE-1234');

    (useHouseholdState as jest.Mock).mockReturnValue(ready('NEW-CODE-5678'));
    await rerender({});
    expect(result.current.status).toBe('loading');
    await act(async () =>
      emit.data({ estado: 'activa', venceEn: timestamp(Date.now() + 48 * HOUR) }),
    );
    expect(result.current.invite).toEqual({ code: 'NEW-CODE-5678', hoursLeft: 48, active: true });
  });

  it('generar y desactivar usan el hogar real y propagan el error si no se pudo', async () => {
    (useHouseholdState as jest.Mock).mockReturnValue(ready('K7P2-9XQ-4MN'));
    (createInvite as jest.Mock).mockResolvedValue('NEW-CODE-5678');
    (revokeInvite as jest.Mock).mockRejectedValue(new Error('unavailable'));
    const { result } = await renderHook(() => useInvite());

    await result.current.regenerate();
    expect(createInvite).toHaveBeenCalledWith('h1');
    await expect(result.current.deactivate()).rejects.toThrow('unavailable');
    expect(revokeInvite).toHaveBeenCalledWith('h1');
  });
});
