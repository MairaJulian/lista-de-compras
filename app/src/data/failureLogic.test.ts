import {
  HOME_SCOPE,
  markFailures,
  noticeCopy,
  rowReason,
  scopeOf,
  type FailedChange,
} from './failureLogic';
import type { ListInfo, ListItem } from './types';

const item = (id: string, name: string, rest: Partial<ListItem> = {}): ListItem => ({
  id,
  listId: 'l1',
  name,
  done: false,
  addedBy: 'u1',
  ...rest,
});
const list: ListInfo = { id: 'l1', name: 'Súper', tone: 'green', icon: 'list' };

describe('scopeOf', () => {
  it('crear y eliminar una lista se ven en Inicio; lo demás, en la lista afectada', () => {
    expect(scopeOf({ kind: 'createList', list, tone: 'green' })).toBe(HOME_SCOPE);
    expect(scopeOf({ kind: 'deleteList', list })).toBe(HOME_SCOPE);
    expect(scopeOf({ kind: 'renameList', list, name: 'Otro' })).toBe('l1');
    expect(scopeOf({ kind: 'addItem', item: item('i1', 'Leche') })).toBe('l1');
  });
});

describe('rowReason', () => {
  it('dice qué no se guardó, con el valor anterior de la cantidad', () => {
    const yerba = item('i1', 'Yerba mate', { quantity: 1, unit: 'kg' });
    expect(rowReason({ kind: 'addItem', item: yerba })).toBe('ítem nuevo');
    expect(rowReason({ kind: 'editItem', item: yerba, patch: { quantity: 2 } })).toBe(
      'cantidad (antes 1 kg)',
    );
    // Sin cantidad cargada el valor anterior es 1.
    expect(rowReason({ kind: 'editItem', item: item('i2', 'Pan'), patch: { quantity: 3 } })).toBe(
      'cantidad (antes 1)',
    );
  });

  it('junta los campos editados y distingue tildar, destildar, eliminar y deshacer', () => {
    const leche = item('i1', 'Leche');
    expect(
      rowReason({
        kind: 'editItem',
        item: leche,
        patch: { name: 'Leche entera', quantity: 2, note: undefined },
      }),
    ).toBe('nombre (antes Leche), cantidad (antes 1), nota');
    expect(rowReason({ kind: 'toggleItem', item: leche, done: true })).toBe('marcar como comprado');
    expect(rowReason({ kind: 'toggleItem', item: leche, done: false })).toBe('volver a pendientes');
    expect(rowReason({ kind: 'deleteItem', item: leche, deleted: true })).toBe('eliminar');
    expect(rowReason({ kind: 'deleteItem', item: leche, deleted: false })).toBe('deshacer');
  });
});

describe('markFailures', () => {
  const leche = item('i1', 'Leche', { quantity: 2 });
  const yerba = item('i2', 'Yerba mate', { quantity: 1, unit: 'kg' });
  const arroz = item('i3', 'Arroz', { done: true });

  it('sin fallos deja las filas como están', () => {
    expect(markFailures({ pending: [leche], done: [arroz] }, [])).toEqual({
      pending: [{ item: leche }],
      done: [{ item: arroz }],
    });
  });

  it('el ítem nuevo que el servidor rechazó va arriba de Pendientes, y no se puede tocar', () => {
    const mermelada = item('nuevo', 'Mermelada');
    const rows = markFailures({ pending: [leche], done: [] }, [
      { kind: 'addItem', item: mermelada },
    ]);
    expect(rows.pending).toEqual([
      { item: mermelada, error: 'No se guardó: ítem nuevo', local: true },
      { item: leche },
    ]);
  });

  it('una edición rechazada queda en su lugar mostrando el valor que se quiso guardar', () => {
    const rows = markFailures({ pending: [leche, yerba], done: [] }, [
      { kind: 'editItem', item: yerba, patch: { quantity: 2 } },
    ]);
    expect(rows.pending[0]).toEqual({ item: leche });
    expect(rows.pending[1]).toEqual({
      item: { ...yerba, quantity: 2 },
      error: 'No se guardó: cantidad (antes 1 kg)',
    });
  });

  it('un tildado rechazado marca la fila donde el servidor la tiene', () => {
    const rows = markFailures({ pending: [leche], done: [arroz] }, [
      { kind: 'toggleItem', item: arroz, done: false },
    ]);
    expect(rows.done[0]).toEqual({
      item: arroz,
      error: 'No se guardó: volver a pendientes',
    });
  });

  it('un "deshacer" rechazado vuelve a mostrar el ítem borrado, en la sección que le toca', () => {
    const rows = markFailures({ pending: [], done: [] }, [
      { kind: 'deleteItem', item: arroz, deleted: false },
    ]);
    expect(rows.done).toEqual([{ item: arroz, error: 'No se guardó: deshacer', local: true }]);
  });

  it('varios fallos del mismo ítem se suman en una sola fila', () => {
    const rows = markFailures({ pending: [leche], done: [] }, [
      { kind: 'editItem', item: leche, patch: { quantity: 3 } },
      { kind: 'toggleItem', item: leche, done: true },
    ]);
    expect(rows.pending).toHaveLength(1);
    expect(rows.pending[0].error).toBe('No se guardó: cantidad (antes 2), marcar como comprado');
  });

  it('ignora los fallos de listas, que no tienen fila', () => {
    const rows = markFailures({ pending: [leche], done: [] }, [
      { kind: 'renameList', list, name: 'Otro' },
    ]);
    expect(rows.pending).toEqual([{ item: leche }]);
  });
});

describe('noticeCopy', () => {
  const nuevo: FailedChange = { kind: 'addItem', item: item('n', 'Mermelada') };

  it('cuenta los cambios, en singular y plural', () => {
    expect(noticeCopy([nuevo]).title).toBe('No pudimos guardar 1 cambio');
    expect(noticeCopy([nuevo, nuevo]).title).toBe('No pudimos guardar 2 cambios');
  });

  it('con filas marcadas dice que siguen en el celular, como en el diseño', () => {
    expect(noticeCopy([nuevo]).message).toBe(
      'Siguen en tu celular, marcados abajo. Probá de nuevo.',
    );
  });

  it('los fallos de listas se cuentan en el aviso, porque no hay fila que marcar', () => {
    expect(noticeCopy([{ kind: 'createList', list, tone: 'green' }]).message).toBe(
      'No se creó «Súper». Probá de nuevo.',
    );
    expect(noticeCopy([{ kind: 'renameList', list, name: 'Verdulería' }]).message).toBe(
      'No se guardó el nombre «Verdulería». Probá de nuevo.',
    );
    expect(noticeCopy([{ kind: 'deleteList', list }]).message).toBe(
      'No se eliminó «Súper». Probá de nuevo.',
    );
    expect(noticeCopy([nuevo, { kind: 'renameList', list, name: 'Otro' }]).message).toBe(
      'Siguen en tu celular, marcados abajo. No se guardó el nombre «Otro». Probá de nuevo.',
    );
  });
});
