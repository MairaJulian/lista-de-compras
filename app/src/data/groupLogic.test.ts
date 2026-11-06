import {
  MAX_ACTIVE_GROUPS,
  archivedCount,
  pickNextGroup,
  archivedLabel,
  groupAppearance,
  groupCountsLabel,
  groupRoleLabel,
  membersLabel,
  pendingLabel,
  reachedGroupLimit,
  sortGroups,
  splitGroups,
  withLiveCounts,
  type GroupSummary,
} from './groupLogic';

const group = (id: string, rest: Partial<GroupSummary> = {}): GroupSummary => ({
  id,
  name: id,
  type: 'familia',
  archived: false,
  role: 'member',
  ...rest,
});

describe('groupAppearance', () => {
  it('cada tipo tiene su ícono y color; archivado se ve neutro', () => {
    expect(groupAppearance('familia')).toEqual({ icon: 'home', tone: 'green' });
    expect(groupAppearance('amigos')).toEqual({ icon: 'users', tone: 'blue' });
    expect(groupAppearance('evento')).toEqual({ icon: 'gift', tone: 'amber' });
    expect(groupAppearance('evento', true)).toEqual({ icon: 'archive', tone: 'neutral' });
  });
});

describe('orden y separación', () => {
  it('ordena por quién lleva más tiempo en el grupo; sin fecha al final, por nombre', () => {
    const sorted = sortGroups([
      group('c', { name: 'Zeta' }),
      group('b', { since: 20 }),
      group('a', { since: 10 }),
      group('d', { name: 'Alfa' }),
    ]);
    expect(sorted.map((g) => g.id)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('no modifica la lista recibida', () => {
    const original = [group('b', { since: 2 }), group('a', { since: 1 })];
    sortGroups(original);
    expect(original.map((g) => g.id)).toEqual(['b', 'a']);
  });

  it('separa activos y archivados', () => {
    const { active, archived } = splitGroups([
      group('a', { since: 1 }),
      group('b', { since: 2, archived: true }),
      group('c', { since: 3 }),
    ]);
    expect(active.map((g) => g.id)).toEqual(['a', 'c']);
    expect(archived.map((g) => g.id)).toEqual(['b']);
  });
});

describe('límite de grupos activos', () => {
  const many = (active: number, archived = 0) => [
    ...Array.from({ length: active }, (_, i) => group(`a${i}`)),
    ...Array.from({ length: archived }, (_, i) => group(`x${i}`, { archived: true })),
  ];

  it('el máximo es 10 grupos activos', () => {
    expect(MAX_ACTIVE_GROUPS).toBe(10);
  });

  it('con 9 activos todavía se puede sumar otro, con 10 no', () => {
    expect(reachedGroupLimit(many(9))).toBe(false);
    expect(reachedGroupLimit(many(10))).toBe(true);
    expect(reachedGroupLimit(many(11))).toBe(true);
  });

  it('los archivados no cuentan', () => {
    expect(reachedGroupLimit(many(9, 5))).toBe(false);
    expect(reachedGroupLimit(many(0, 20))).toBe(false);
  });
});

describe('textos de los renglones', () => {
  it('miembros y pendientes, en singular y plural', () => {
    expect(membersLabel(1)).toBe('1 miembro');
    expect(membersLabel(3)).toBe('3 miembros');
    expect(pendingLabel(0)).toBe('sin pendientes');
    expect(pendingLabel(1)).toBe('1 pendiente');
    expect(pendingLabel(12)).toBe('12 pendientes');
  });

  it('"N miembros · N pendientes", sin lo que no se pudo leer', () => {
    expect(groupCountsLabel(group('a', { memberCount: 3, pendingCount: 7 }))).toBe(
      '3 miembros · 7 pendientes',
    );
    expect(groupCountsLabel(group('a', { memberCount: 3 }))).toBe('3 miembros');
    expect(groupCountsLabel(group('a', { pendingCount: 1 }))).toBe('1 pendiente');
    expect(groupCountsLabel(group('a'))).toBe('');
  });

  it('el rol de Mis grupos', () => {
    expect(groupRoleLabel(group('a', { role: 'creator', memberCount: 3 }))).toBe(
      'Creaste el grupo · 3 miembros',
    );
    expect(groupRoleLabel(group('a', { role: 'member', memberCount: 1 }))).toBe(
      'Miembro · 1 miembro',
    );
    expect(groupRoleLabel(group('a', { role: 'member' }))).toBe('Miembro');
  });

  it('la fecha de archivado', () => {
    expect(archivedLabel(new Date(2026, 7, 12).getTime())).toBe(
      'Archivado el 12 de agosto · solo lectura',
    );
    expect(archivedLabel(new Date(2026, 0, 1).getTime())).toBe(
      'Archivado el 1 de enero · solo lectura',
    );
    expect(archivedLabel(undefined)).toBe('Archivado · solo lectura');
  });
});

describe('withLiveCounts', () => {
  const groups = [
    group('a', { memberCount: 9, pendingCount: 9 }),
    group('b', { memberCount: 5, pendingCount: 12 }),
  ];

  it('reemplaza solo los conteos del grupo actual', () => {
    const result = withLiveCounts(groups, 'a', { memberCount: 3, pendingCount: 7 });
    expect(result[0]).toEqual(expect.objectContaining({ memberCount: 3, pendingCount: 7 }));
    expect(result[1]).toBe(groups[1]);
  });

  it('sin datos en vivo o sin grupo actual deja todo igual', () => {
    expect(withLiveCounts(groups, 'a', undefined)).toBe(groups);
    expect(withLiveCounts(groups, null, { memberCount: 1, pendingCount: 1 })).toBe(groups);
  });
});

describe('pickNextGroup', () => {
  it('elige el grupo usado más recientemente, sin contar el que se deja', () => {
    const groups = [
      group('a', { lastUsed: 100 }),
      group('b', { lastUsed: 300 }),
      group('c', { lastUsed: 200 }),
    ];
    expect(pickNextGroup(groups, 'b')?.id).toBe('c');
    expect(pickNextGroup(groups, 'a')?.id).toBe('b');
  });

  it('sin ultimoUso queda el que lleva más tiempo; los que tienen ultimoUso van primero', () => {
    const groups = [
      group('a', { since: 5 }),
      group('b', { since: 2 }),
      group('c', { lastUsed: 1 }),
    ];
    expect(pickNextGroup(groups.slice(0, 2), null)?.id).toBe('b');
    expect(pickNextGroup(groups, null)?.id).toBe('c');
  });

  it('ignora los archivados y devuelve undefined si no queda ninguno', () => {
    expect(pickNextGroup([group('a'), group('x', { archived: true, lastUsed: 9 })], 'a')).toBe(
      undefined,
    );
    expect(pickNextGroup([], null)).toBeUndefined();
  });
});

describe('archivedCount', () => {
  it('cuenta solo los archivados', () => {
    expect(archivedCount([group('a'), group('b', { archived: true })])).toBe(1);
  });
});
