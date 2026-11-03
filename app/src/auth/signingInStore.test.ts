import { act, renderHook } from '@testing-library/react-native';

import { LOADING_TIMEOUT_MS } from '../data/loadingTimeout';
import { setEntered, setSigningIn, useEntered, useSigningIn } from './signingInStore';

describe('signingInStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setSigningIn(false);
    setEntered(false);
  });
  afterEach(() => jest.useRealTimers());

  it('avisa cuando se está entrando y cuando deja de estarlo', async () => {
    const { result } = await renderHook(() => useSigningIn());
    expect(result.current).toBe(false);
    await act(async () => setSigningIn(true));
    expect(result.current).toBe(true);
    await act(async () => setSigningIn(false));
    expect(result.current).toBe(false);
  });

  it('no se queda "entrando" para siempre si el servidor no responde', async () => {
    const { result } = await renderHook(() => useSigningIn());
    await act(async () => setSigningIn(true));
    await act(async () => jest.advanceTimersByTime(LOADING_TIMEOUT_MS + 1));
    expect(result.current).toBe(false);
  });

  it('recuerda que la primera lectura ya terminó', async () => {
    const { result } = await renderHook(() => useEntered());
    expect(result.current).toBe(false);
    await act(async () => setEntered(true));
    expect(result.current).toBe(true);
  });
});
