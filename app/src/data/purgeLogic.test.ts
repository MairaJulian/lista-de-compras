import { drainInBatches, PURGE_BATCH_SIZE, PURGE_MAX_ROUNDS, purgeCutoff } from './purgeLogic';

const DAY = 24 * 60 * 60 * 1000;

describe('purgeCutoff', () => {
  it('es de hace 31 días: un día de margen sobre los 30 que piden las reglas', () => {
    expect(purgeCutoff(100 * DAY)).toBe(69 * DAY);
  });
});

describe('drainInBatches', () => {
  const ids = (count: number, from = 0) => Array.from({ length: count }, (_, i) => `d${from + i}`);

  it('sin nada que eliminar no escribe', async () => {
    const remove = jest.fn();
    await expect(drainInBatches(async () => [], remove)).resolves.toBe(0);
    expect(remove).not.toHaveBeenCalled();
  });

  it('una tanda corta se elimina y termina sin volver a consultar', async () => {
    const fetch = jest.fn().mockResolvedValue(ids(3));
    const remove = jest.fn().mockResolvedValue(undefined);
    await expect(drainInBatches(fetch, remove)).resolves.toBe(3);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(ids(3));
  });

  it('con tandas llenas de 500 sigue hasta que una viene corta', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(ids(PURGE_BATCH_SIZE, 0))
      .mockResolvedValueOnce(ids(PURGE_BATCH_SIZE, 500))
      .mockResolvedValueOnce(ids(120, 1000));
    const remove = jest.fn().mockResolvedValue(undefined);
    await expect(drainInBatches(fetch, remove)).resolves.toBe(1120);
    expect(remove.mock.calls.map((call) => call[0].length)).toEqual([500, 500, 120]);
  });

  it('una tanda de exactamente 500 consulta otra vez y termina al venir vacía', async () => {
    const fetch = jest.fn().mockResolvedValueOnce(ids(PURGE_BATCH_SIZE)).mockResolvedValueOnce([]);
    const remove = jest.fn().mockResolvedValue(undefined);
    await expect(drainInBatches(fetch, remove)).resolves.toBe(500);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('elimina cada tanda antes de pedir la siguiente', async () => {
    const order: string[] = [];
    const fetch = jest.fn(async () => {
      order.push('fetch');
      return order.length > 2 ? [] : ids(PURGE_BATCH_SIZE);
    });
    const remove = jest.fn(async () => {
      order.push('remove');
    });
    await drainInBatches(fetch, remove);
    expect(order).toEqual(['fetch', 'remove', 'fetch']);
  });

  it('si algo no se llega a eliminar corta en el tope de tandas', async () => {
    const fetch = jest.fn().mockResolvedValue(ids(PURGE_BATCH_SIZE));
    const remove = jest.fn().mockResolvedValue(undefined);
    await drainInBatches(fetch, remove);
    expect(fetch).toHaveBeenCalledTimes(PURGE_MAX_ROUNDS);
  });

  it('si una tanda falla, el error sale y no sigue', async () => {
    const fetch = jest.fn().mockResolvedValue(ids(PURGE_BATCH_SIZE));
    const remove = jest.fn().mockRejectedValue(new Error('permission-denied'));
    await expect(drainInBatches(fetch, remove)).rejects.toThrow('permission-denied');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('si la consulta falla (sin conexión), el error sale sin eliminar nada', async () => {
    const remove = jest.fn();
    await expect(
      drainInBatches(() => Promise.reject(new Error('unavailable')), remove),
    ).rejects.toThrow('unavailable');
    expect(remove).not.toHaveBeenCalled();
  });
});
