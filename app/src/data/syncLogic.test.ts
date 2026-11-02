import {
  countPending,
  itemKey,
  listKey,
  offlineNotice,
  shownKind,
  syncKind,
  type SyncInput,
} from './syncLogic';

const online: SyncInput = {
  unsaved: false,
  fromCache: false,
  connectedOnce: true,
  graceOver: true,
  pendingCount: 0,
};

describe('syncKind', () => {
  it('con conexión y nada pendiente: sincronizado', () => {
    expect(syncKind(online)).toBe('synced');
  });

  it('sin conexión (lecturas de la copia local): sin conexión, con o sin pendientes', () => {
    expect(syncKind({ ...online, fromCache: true })).toBe('offline');
    expect(syncKind({ ...online, fromCache: true, pendingCount: 3 })).toBe('offline');
  });

  it('nunca dice sincronizado si hay cambios sin confirmar', () => {
    expect(syncKind({ ...online, pendingCount: 1 })).toBe('syncing');
  });

  it('sin guardar gana sobre sin conexión y sobre sincronizado', () => {
    expect(syncKind({ ...online, unsaved: true })).toBe('unsaved');
    expect(syncKind({ ...online, unsaved: true, fromCache: true, pendingCount: 2 })).toBe(
      'unsaved',
    );
  });

  it('al arrancar, antes de que responda el servidor, no se muestra nada', () => {
    const starting = { ...online, fromCache: true, connectedOnce: false, graceOver: false };
    expect(syncKind(starting)).toBe('connecting');
  });

  it('pasado el tiempo de espera inicial sin respuesta, es sin conexión', () => {
    const late = { ...online, fromCache: true, connectedOnce: false, graceOver: true };
    expect(syncKind(late)).toBe('offline');
  });

  it('al arrancar con cambios pendientes ya se avisa sin conexión', () => {
    const starting = { ...online, fromCache: true, connectedOnce: false, graceOver: false };
    expect(syncKind({ ...starting, pendingCount: 2 })).toBe('offline');
  });

  it('si la conexión se pierde después de haberla tenido, es sin conexión de inmediato', () => {
    expect(syncKind({ ...online, fromCache: true, graceOver: false })).toBe('offline');
  });
});

describe('shownKind', () => {
  it('lo que no es "en camino" se muestra tal cual', () => {
    expect(shownKind('offline', 'synced', false)).toBe('offline');
    expect(shownKind('synced', 'offline', false)).toBe('synced');
    expect(shownKind('unsaved', 'synced', false)).toBe('unsaved');
  });

  it('un cambio en camino con conexión no hace parpadear a sin conexión', () => {
    expect(shownKind('syncing', 'synced', false)).toBe('synced');
  });

  it('si tarda demasiado en confirmarse, pasa a sin conexión', () => {
    expect(shownKind('syncing', 'synced', true)).toBe('offline');
  });

  it('al volver la conexión sigue en sin conexión hasta que se confirme todo', () => {
    expect(shownKind('syncing', 'offline', false)).toBe('offline');
  });

  it('si venía de sin guardar y hay cambios en camino, no queda en rojo', () => {
    expect(shownKind('syncing', 'unsaved', false)).toBe('synced');
  });
});

describe('countPending', () => {
  it('cuenta documentos, no cambios: un ítem con varios campos cuenta una vez', () => {
    expect(countPending([itemKey('a')], [itemKey('a'), itemKey('b')])).toBe(2);
  });

  it('suma la lista misma y los ítems sin confundirlos', () => {
    expect(countPending([itemKey('x')], [listKey('x')])).toBe(2);
  });

  it('sin nada pendiente es cero', () => {
    expect(countPending([], [])).toBe(0);
  });
});

describe('offlineNotice', () => {
  it('sin pendientes explica que se guarda en el celular', () => {
    expect(offlineNotice(0)).toBe(
      'Los cambios se guardan en tu celular y se sincronizan cuando vuelva la conexión.',
    );
  });

  it('usa el singular y el plural correctos', () => {
    expect(offlineNotice(1)).toMatch(/^1 cambio sin sincronizar\./);
    expect(offlineNotice(3)).toMatch(/^3 cambios sin sincronizar\./);
  });
});
