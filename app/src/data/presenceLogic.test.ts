import {
  HEARTBEAT_MS,
  isListOpenByOthers,
  PRESENCE_EXPIRES_MS,
  presenceFromDocument,
  type Presence,
} from './presenceLogic';

const NOW = 1_000_000_000;
const ts = (millis: number) => ({ toMillis: () => millis });
const presence = (uid: string, listId: string, lastBeat?: number): Presence => ({
  uid,
  listId,
  lastBeat,
});

describe('presenceFromDocument', () => {
  it('lee la lista y el último latido', () => {
    expect(presenceFromDocument('u2', { listaId: 'l1', ultimoLatido: ts(5) })).toEqual({
      uid: 'u2',
      listId: 'l1',
      lastBeat: 5,
    });
  });

  it('un documento vacío o incompleto no cuenta como lista abierta', () => {
    expect(presenceFromDocument('u2', undefined)).toEqual({
      uid: 'u2',
      listId: '',
      lastBeat: undefined,
    });
    expect(presenceFromDocument('u2', { listaId: 7, ultimoLatido: 'x' })).toEqual({
      uid: 'u2',
      listId: '',
      lastBeat: undefined,
    });
  });
});

describe('isListOpenByOthers', () => {
  it('el latido es cada 30 segundos y se vence a los 2 minutos', () => {
    expect(HEARTBEAT_MS).toBe(30_000);
    expect(PRESENCE_EXPIRES_MS).toBe(120_000);
  });

  it('otra persona con esa lista abierta y un latido reciente cuenta', () => {
    expect(isListOpenByOthers([presence('u2', 'l1', NOW - 10_000)], 'l1', 'u1', NOW)).toBe(true);
  });

  it('con un latido de hace casi 2 minutos todavía cuenta; de 2 minutos o más, no', () => {
    expect(isListOpenByOthers([presence('u2', 'l1', NOW - 119_999)], 'l1', 'u1', NOW)).toBe(true);
    expect(isListOpenByOthers([presence('u2', 'l1', NOW - 120_000)], 'l1', 'u1', NOW)).toBe(false);
    expect(isListOpenByOthers([presence('u2', 'l1', NOW - 600_000)], 'l1', 'u1', NOW)).toBe(false);
  });

  it('quien consulta no se cuenta a sí mismo', () => {
    expect(isListOpenByOthers([presence('u1', 'l1', NOW)], 'l1', 'u1', NOW)).toBe(false);
  });

  it('otra lista, o ninguna (listaId vacío), no cuenta', () => {
    expect(isListOpenByOthers([presence('u2', 'l2', NOW)], 'l1', 'u1', NOW)).toBe(false);
    expect(isListOpenByOthers([presence('u2', '', NOW)], 'l1', 'u1', NOW)).toBe(false);
  });

  it('sin hora de latido no cuenta', () => {
    expect(isListOpenByOthers([presence('u2', 'l1')], 'l1', 'u1', NOW)).toBe(false);
  });

  it('un latido del futuro (reloj adelantado) cuenta: ante la duda no se borra', () => {
    expect(isListOpenByOthers([presence('u2', 'l1', NOW + 60_000)], 'l1', 'u1', NOW)).toBe(true);
  });

  it('basta una persona entre varias; sin nadie, no hay otra', () => {
    const all = [
      presence('u2', 'l2', NOW),
      presence('u3', 'l1', NOW - 500_000),
      presence('u4', 'l1', NOW - 5_000),
    ];
    expect(isListOpenByOthers(all, 'l1', 'u1', NOW)).toBe(true);
    expect(isListOpenByOthers(all.slice(0, 2), 'l1', 'u1', NOW)).toBe(false);
    expect(isListOpenByOthers([], 'l1', 'u1', NOW)).toBe(false);
  });
});
