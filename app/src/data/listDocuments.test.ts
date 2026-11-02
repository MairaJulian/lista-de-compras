import {
  anyMemberFromDocument,
  itemFromDocument,
  listFromDocument,
  memberOrFallback,
  timestampMillis,
} from './listDocuments';

const ts = (millis: number) => ({ toMillis: () => millis });

describe('timestampMillis', () => {
  it('lee los milisegundos de un Timestamp y toma "ahora" si todavía no hay hora', () => {
    expect(timestampMillis(ts(1234), 99)).toBe(1234);
    expect(timestampMillis(null, 99)).toBe(99);
    expect(timestampMillis(undefined, 99)).toBe(99);
  });
});

describe('listFromDocument', () => {
  it('arma la lista con su color y la hora de creación', () => {
    expect(
      listFromDocument('l1', {
        nombre: 'Súper',
        color: 'amber',
        creadaEn: ts(5),
        eliminada: false,
      }),
    ).toEqual({
      id: 'l1',
      name: 'Súper',
      tone: 'amber',
      icon: 'list',
      deleted: false,
      createdAt: 5,
    });
  });

  it('marca las eliminadas, para poder avisar', () => {
    expect(
      listFromDocument('l1', { nombre: 'Súper', color: 'green', creadaEn: ts(1), eliminada: true })
        ?.deleted,
    ).toBe(true);
  });

  it('guarda quién la eliminó, para el aviso a quien la tenía abierta', () => {
    const list = listFromDocument('l1', {
      nombre: 'Súper',
      color: 'green',
      eliminada: true,
      eliminadaPor: 'u2',
    });
    expect(list?.deletedBy).toBe('u2');
    expect(listFromDocument('l1', { nombre: 'Súper', color: 'green' })?.deletedBy).toBeUndefined();
  });

  it('ignora documentos incompletos o con un color que no existe', () => {
    expect(listFromDocument('l1', { color: 'green' })).toBeUndefined();
    expect(listFromDocument('l1', { nombre: 'Súper', color: 'rojo' })).toBeUndefined();
    expect(listFromDocument('l1', undefined)).toBeUndefined();
  });
});

describe('itemFromDocument', () => {
  const pending = {
    listaId: 'l1',
    nombre: 'Leche',
    comprado: false,
    agregadoPor: 'u1',
    agregadoEn: ts(10),
    borrado: false,
  };

  it('un ítem pendiente sin cantidad ni nota', () => {
    expect(itemFromDocument('i1', pending)).toEqual({
      id: 'i1',
      listId: 'l1',
      name: 'Leche',
      quantity: undefined,
      unit: undefined,
      note: undefined,
      done: false,
      addedBy: 'u1',
      addedAt: 10,
      doneBy: undefined,
      doneAt: undefined,
      deleted: false,
    });
  });

  it('con cantidad, unidad y nota', () => {
    expect(
      itemFromDocument('i1', { ...pending, cantidad: 2, unidad: 'kg', nota: 'Sin lactosa' }),
    ).toMatchObject({ quantity: 2, unit: 'kg', note: 'Sin lactosa' });
  });

  it('un ítem comprado trae quién lo tildó y cuándo', () => {
    expect(
      itemFromDocument('i1', { ...pending, comprado: true, tildadoPor: 'u2', tildadoEn: ts(50) }),
    ).toMatchObject({ done: true, doneBy: 'u2', doneAt: 50 });
  });

  it('si destildó, no queda rastro de quién tildó', () => {
    expect(
      itemFromDocument('i1', { ...pending, tildadoPor: 'u2', tildadoEn: ts(50) }),
    ).toMatchObject({ done: false, doneBy: undefined, doneAt: undefined });
  });

  it('un ítem recién agregado, sin la hora del servidor, toma "ahora" para quedar arriba', () => {
    expect(itemFromDocument('i1', { ...pending, agregadoEn: null }, 777)?.addedAt).toBe(777);
  });

  it('ignora documentos sin lista, nombre o autor', () => {
    expect(itemFromDocument('i1', { ...pending, listaId: undefined })).toBeUndefined();
    expect(itemFromDocument('i1', { ...pending, nombre: 3 })).toBeUndefined();
    expect(itemFromDocument('i1', { ...pending, agregadoPor: undefined })).toBeUndefined();
  });
});

describe('miembros', () => {
  it('toma nombre y color de cualquier estado, también de quien ya salió', () => {
    expect(
      anyMemberFromDocument('u3', { nombre: 'Diego', colorAvatar: 'blue', estado: 'salio' }),
    ).toEqual({ id: 'u3', name: 'Diego', role: 'member', tone: 'blue' });
  });

  it('un color que no existe usa el primero', () => {
    expect(anyMemberFromDocument('u3', { nombre: 'Diego', colorAvatar: 'violeta' }).tone).toBe(
      'green',
    );
  });

  it('si no se conoce a la persona, un nombre genérico', () => {
    const members = [anyMemberFromDocument('u1', { nombre: 'Maira' })];
    expect(memberOrFallback(members, 'u1').name).toBe('Maira');
    expect(memberOrFallback(members, 'otro').name).toBe('Alguien');
  });
});
