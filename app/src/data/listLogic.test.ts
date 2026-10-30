import {
  addItem,
  addList,
  changedFields,
  cleanItemName,
  cleanListName,
  countPending,
  countUnsynced,
  deleteList,
  formatQuantity,
  markSynced,
  removeDone,
  removeItem,
  renameList,
  restoreItem,
  sortLists,
  splitItems,
  summarizeLists,
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

  it('una cantidad ausente o 1 vale 1: sin unidad no se muestra nada, con unidad sí', () => {
    expect(formatQuantity({ quantity: 1 })).toBeUndefined();
    expect(formatQuantity({ unit: 'docena' })).toBe('1 docena');
  });
});

describe('orden de pendientes y comprados', () => {
  const at = (id: string, done: boolean, addedAt: number, doneAt?: number): ListItem => ({
    id,
    listId: 'l',
    name: id,
    done,
    addedBy: 'vos',
    addedAt,
    doneAt,
  });

  it('pendientes por agregadoEn descendente: el nuevo arriba', () => {
    const { pending } = splitItems([at('a', false, 10), at('c', false, 30), at('b', false, 20)]);
    expect(pending.map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });

  it('comprados por tildadoEn descendente: el último tildado arriba, sin importar cuándo se agregó', () => {
    const { done } = splitItems([
      at('a', true, 30, 100),
      at('b', true, 10, 300),
      at('c', true, 20, 200),
    ]);
    expect(done.map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('con la misma hora desempata por id, siempre igual', () => {
    const { pending } = splitItems([at('b', false, 10), at('a', false, 10)]);
    expect(pending.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('sin marcas de tiempo (datos de ejemplo) respeta el orden recibido', () => {
    const { pending } = splitItems([
      { id: 'z', listId: 'l', name: 'z', done: false, addedBy: 'v' },
      { id: 'a', listId: 'l', name: 'a', done: false, addedBy: 'v' },
    ]);
    expect(pending.map((i) => i.id)).toEqual(['z', 'a']);
  });

  it('un ítem recién agregado, con la hora estimada de ahora, queda arriba de los viejos', () => {
    const { pending } = splitItems([at('viejo', false, 1000), at('nuevo', false, Date.now())]);
    expect(pending[0].id).toBe('nuevo');
  });
});

describe('summarizeLists', () => {
  const lists = [
    { id: 'a', name: 'A', tone: 'green' as const, icon: 'list' as const },
    { id: 'b', name: 'B', tone: 'amber' as const, icon: 'list' as const },
    { id: 'c', name: 'C', tone: 'blue' as const, icon: 'list' as const, deleted: true },
  ];
  const item = (id: string, listId: string, rest: Partial<ListItem> = {}): ListItem => ({
    id,
    listId,
    name: id,
    done: false,
    addedBy: 'vos',
    ...rest,
  });

  it('cuenta pendientes por lista sin contar comprados ni borrados', () => {
    const items = [
      item('1', 'a'),
      item('2', 'a'),
      item('3', 'a', { done: true }),
      item('4', 'a', { deleted: true }),
      item('5', 'b', { done: true }),
    ];
    expect(summarizeLists(lists, items).map((l) => [l.id, l.pendingCount])).toEqual([
      ['a', 2],
      ['b', 0],
    ]);
  });

  it('no muestra las listas eliminadas aunque tengan ítems', () => {
    expect(summarizeLists(lists, [item('1', 'c')]).map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('un ítem que pasa de pendiente a comprado baja el contador', () => {
    const before = [item('1', 'a'), item('2', 'a')];
    const after = toggleItem(before, '1', 'vos', true);
    expect(summarizeLists(lists, before)[0].pendingCount).toBe(2);
    expect(summarizeLists(lists, after)[0].pendingCount).toBe(1);
  });
});

describe('sortLists', () => {
  it('de la más vieja a la más nueva; la que todavía no tiene hora, al final', () => {
    const list = (id: string, createdAt?: number) => ({
      id,
      name: id,
      tone: 'green' as const,
      icon: 'list' as const,
      createdAt,
    });
    expect(sortLists([list('c'), list('b', 20), list('a', 10)]).map((l) => l.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('cleanListName y cleanItemName', () => {
  it('recortan y rechazan vacíos y demasiado largos', () => {
    expect(cleanListName('  Súper ')).toBe('Súper');
    expect(cleanListName('   ')).toBeUndefined();
    expect(cleanListName('x'.repeat(80))).toBeDefined();
    expect(cleanListName('x'.repeat(81))).toBeUndefined();
    expect(cleanItemName(' Leche ')).toBe('Leche');
    expect(cleanItemName('')).toBeUndefined();
    expect(cleanItemName('x'.repeat(120))).toBeDefined();
    expect(cleanItemName('x'.repeat(121))).toBeUndefined();
  });

  it('agregar un ítem demasiado largo no agrega nada', () => {
    expect(addItem(base, 'l', 'x'.repeat(121), 'vos', true, 'n1')).toBe(base);
  });
});

describe('changedFields', () => {
  const item = { name: 'Leche', quantity: 2, note: 'Sin lactosa' };

  it('sin cambios no devuelve ningún campo, aunque haya espacios de más en los costados', () => {
    expect(changedFields(item, { name: 'Leche', quantity: 2, note: 'Sin lactosa' })).toEqual({});
    expect(changedFields(item, { name: ' Leche ', quantity: 2, note: ' Sin lactosa ' })).toEqual(
      {},
    );
  });

  it('devuelve solo los campos que cambiaron', () => {
    expect(changedFields(item, { name: 'Leche', quantity: 3, note: 'Sin lactosa' })).toEqual({
      quantity: 3,
    });
    expect(
      changedFields(item, { name: ' Leche entera', quantity: 2, note: 'Sin lactosa' }),
    ).toEqual({ name: 'Leche entera' });
  });

  it('una cantidad ausente vale 1', () => {
    const plain = { name: 'Pan' };
    expect(changedFields(plain, { name: 'Pan', quantity: 1, note: '' })).toEqual({});
    expect(changedFields(plain, { name: 'Pan', quantity: 2, note: '' })).toEqual({ quantity: 2 });
  });

  it('una nota vaciada se borra (campo presente con undefined) y una nota nueva se agrega', () => {
    const cleared = changedFields(item, { name: 'Leche', quantity: 2, note: '  ' });
    expect('note' in cleared).toBe(true);
    expect(cleared.note).toBeUndefined();
    expect(changedFields({ name: 'Pan' }, { name: 'Pan', quantity: 1, note: ' tostado ' })).toEqual(
      { note: 'tostado' },
    );
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
  it('eliminar marca el ítem como borrado: deja de verse y de contarse, y no toca los demás', () => {
    const result = removeItem(base, 'a');
    expect(result[0]).toMatchObject({ id: 'a', deleted: true });
    expect(result[1]).toBe(base[1]);
    expect(splitItems(result).pending).toEqual([]);
    expect(countPending(result)).toBe(0);
  });

  it('deshacer devuelve el ítem tal cual estaba', () => {
    const restored = restoreItem(removeItem(base, 'a'), 'a');
    expect(splitItems(restored).pending.map((i) => i.id)).toEqual(['a']);
    expect(restored[0]).toMatchObject({ name: 'Leche', done: false, addedBy: 'lucia' });
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

describe('renameList y deleteList', () => {
  const lists = [
    { id: 'a', name: 'Súper', tone: 'green' as const, icon: 'cart' as const },
    { id: 'b', name: 'Verdulería', tone: 'amber' as const, icon: 'cart' as const },
  ];

  it('renombra solo esa lista, con el nombre recortado', () => {
    const result = renameList(lists, 'a', '  Mercado ');
    expect(result.map((l) => l.name)).toEqual(['Mercado', 'Verdulería']);
    expect(result[0]).toMatchObject({ id: 'a', tone: 'green' });
  });

  it('un nombre vacío no cambia nada', () => {
    expect(renameList(lists, 'a', '   ')).toBe(lists);
  });

  it('eliminar marca la lista y deja las demás', () => {
    const result = deleteList(lists, 'b');
    expect(result.map((l) => l.deleted)).toEqual([undefined, true]);
    expect(lists[1].name).toBe('Verdulería');
  });
});
