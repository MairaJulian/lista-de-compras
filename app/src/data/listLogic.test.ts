import {
  addItem,
  addList,
  countPending,
  countUnsynced,
  formatQuantity,
  markSynced,
  removeDone,
  removeItem,
  splitItems,
  toggleItem,
  updateItem,
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

describe('updateItem', () => {
  it('cambia solo los campos del parche', () => {
    const result = updateItem(base, 'a', { quantity: 3, note: 'Sin lactosa' }, true);
    expect(result[0]).toMatchObject({ name: 'Leche', quantity: 3, note: 'Sin lactosa' });
    expect(result[1]).toBe(base[1]);
  });

  it('recorta el nombre y ignora uno vacío', () => {
    expect(updateItem(base, 'a', { name: '  Leche entera ' }, true)[0].name).toBe('Leche entera');
    expect(updateItem(base, 'a', { name: '   ' }, true)).toEqual(base);
  });

  it('un parche vacío no cambia nada, ni siquiera sin conexión', () => {
    expect(updateItem(base, 'a', {}, false)[0]).toBe(base[0]);
  });

  it('sin conexión marca el cambio como sin sincronizar', () => {
    expect(updateItem(base, 'a', { quantity: 2 }, false)[0].pendingSync).toBe(true);
    expect(updateItem(base, 'a', { quantity: 2 }, true)[0].pendingSync).toBeUndefined();
  });
});

describe('removeItem y removeDone', () => {
  it('elimina un ítem', () => {
    expect(removeItem(base, 'a').map((i) => i.id)).toEqual(['b']);
  });

  it('al salir borra los comprados de esa lista y deja pendientes y otras listas', () => {
    const items: ListItem[] = [
      ...base,
      { id: 'c', listId: 'otra', name: 'Tornillos', done: true, addedBy: 'vos' },
    ];
    expect(removeDone(items, 'l').map((i) => i.id)).toEqual(['a', 'c']);
  });
});

describe('addList', () => {
  const lists = [{ id: 'x', name: 'Súper', tone: 'green' as const, icon: 'cart' as const }];

  it('agrega al final con nombre recortado y el color elegido', () => {
    const result = addList(lists, ' Panadería ', 'amber', 'n1');
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: 'n1', name: 'Panadería', tone: 'amber' });
  });

  it('ignora un nombre vacío', () => {
    expect(addList(lists, '  ', 'green', 'n1')).toBe(lists);
  });
});
