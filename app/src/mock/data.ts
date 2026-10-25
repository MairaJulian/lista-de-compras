import type { Household, ListSummary, Member } from '../data/types';

// Datos de ejemplo del diseño. Cuando llegue Firebase se reemplazan sin tocar las pantallas:
// las pantallas leen todo a través de los hooks de `src/data`.

export const mockCurrentMemberId = 'vos';

export const mockHousehold: Household = {
  id: 'nuestra-casa',
  name: 'Nuestra casa',
  members: [
    { id: 'vos', name: 'Vos', role: 'creator', tone: 'green' },
    { id: 'lucia', name: 'Lucía', role: 'member', tone: 'amber' },
    { id: 'diego', name: 'Diego', role: 'member', tone: 'blue' },
  ],
};

export const mockLists: ListSummary[] = [
  { id: 'supermercado', name: 'Supermercado', tone: 'green', icon: 'cart', pendingCount: 7 },
  { id: 'verduleria', name: 'Verdulería', tone: 'amber', icon: 'leaf', pendingCount: 5 },
  { id: 'farmacia', name: 'Farmacia', tone: 'blue', icon: 'plusSquare', pendingCount: 2 },
  { id: 'ferreteria', name: 'Ferretería', tone: 'neutral', icon: 'wrench', pendingCount: 0 },
];

export function getMockCurrentMember(): Member {
  return (
    mockHousehold.members.find((m) => m.id === mockCurrentMemberId) ?? mockHousehold.members[0]
  );
}
