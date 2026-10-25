import {
  addItem,
  countPending,
  countUnsynced,
  formatQuantity,
  markSynced,
  splitItems,
  toggleItem,
} from './listLogic';
import type { ListItem } from './types';

const base: ListItem[] = [
  { id: 'a', listId: 'l', name: 'Leche', done: false, addedBy: 'lucia' },
  { id: 'b', listId: 'l', name: 'Arroz', done: true, addedBy: 'diego', doneBy: 'diego' },
];

describe('toggleItem', () => {
  it('tilda un pendiente y guarda quién lo tildó', () => {
    const result = toggleItem(base, 'a', 'vos', true);
    expect(result[0]).toMatchObject({ done: true, doneBy: 'vos' });
    expect(countPending(result)).toBe(0);
  });

  it('destilda un comprado y borra quién lo tildó', () => {
    const result = toggleItem(base, 'b', 'vos', true);
    expect(result[1].done).toBe(false);
    expect(result[1].doneBy).toBeUndefined();
  });

  it('sin conexión marca el cambio como sin sincronizar; con conexión no', () => {
    expect(toggleItem(base, 'a', 'vos', false)[0].pendingSync).toBe(true);
    expect(toggleItem(base, 'a', 'vos', true)[0].pendingSync).toBeUndefined();
  });

  it('no modifica el arreglo original ni los demás ítems', () => {
    const result = toggleItem(base, 'a', 'vos', true);
    expect(base[0].done).toBe(false);
    expect(result[1]).toBe(base[1]);
  });
});

describe('addItem', () => {
  it('agrega arriba de todo, pendiente y a nombre de quien lo agrega', () => {
    const result = addItem(base, 'l', '  Pan ', 'vos', true, 'n1');
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: 'n1', name: 'Pan', done: false, addedBy: 'vos' });
  });

  it('ignora un nombre vacío', () => {
    expect(addItem(base, 'l', '   ', 'vos', true, 'n1')).toBe(base);
  });

  it('sin conexión queda sin sincronizar', () => {
    expect(addItem(base, 'l', 'Pan', 'vos', false, 'n1')[0].pendingSync).toBe(true);
  });
});

describe('contadores', () => {
  it('separa y cuenta pendientes y comprados', () => {
    const { pending, done } = splitItems(base);
    expect(pending.map((i) => i.id)).toEqual(['a']);
    expect(done.map((i) => i.id)).toEqual(['b']);
    expect(countPending(base)).toBe(1);
  });

  it('cuenta los cambios sin sincronizar y los limpia al volver la conexión', () => {
    const offline = addItem(toggleItem(base, 'b', 'vos', false), 'l', 'Pan', 'vos', false, 'n1');
    expect(countUnsynced(offline)).toBe(2);
    expect(countUnsynced(markSynced(offline))).toBe(0);
  });
});

describe('formatQuantity', () => {
  it('formatea ×N, cantidad con unidad y sin cantidad', () => {
    expect(formatQuantity({ quantity: 2 })).toBe('×2');
    expect(formatQuantity({ quantity: 1, unit: 'kg' })).toBe('1 kg');
    expect(formatQuantity({})).toBeUndefined();
  });
});
