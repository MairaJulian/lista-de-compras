import type { Household, ListInfo, ListItem, Member } from '../data/types';

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

export const mockLists: ListInfo[] = [
  { id: 'supermercado', name: 'Supermercado', tone: 'green', icon: 'cart' },
  { id: 'verduleria', name: 'Verdulería', tone: 'amber', icon: 'leaf' },
  { id: 'farmacia', name: 'Farmacia', tone: 'blue', icon: 'plusSquare' },
  { id: 'ferreteria', name: 'Ferretería', tone: 'neutral', icon: 'wrench' },
];

const item = (
  listId: string,
  id: string,
  name: string,
  addedBy: string,
  rest: Partial<ListItem> = {},
): ListItem => ({ id: `${listId}-${id}`, listId, name, addedBy, done: false, ...rest });

// Supermercado es el de `05-lista`. Verdulería y Farmacia no tienen pantalla de diseño: solo
// completan los pendientes que muestran las tarjetas de Inicio (5 y 2). Ferretería está vacía (`06`).
export const mockItems: ListItem[] = [
  item('supermercado', '1', 'Leche', 'lucia', { quantity: 2 }),
  item('supermercado', '2', 'Pan lactal', 'vos'),
  item('supermercado', '3', 'Yerba mate', 'vos', { quantity: 1, unit: 'kg' }),
  item('supermercado', '4', 'Huevos', 'diego', { quantity: 1, unit: 'docena' }),
  item('supermercado', '5', 'Fideos', 'lucia', { quantity: 3 }),
  item('supermercado', '6', 'Aceite de girasol', 'diego'),
  item('supermercado', '7', 'Papel higiénico', 'vos', { quantity: 1, unit: 'pack' }),
  item('supermercado', '8', 'Arroz', 'diego', { done: true, doneBy: 'diego' }),
  item('supermercado', '9', 'Detergente', 'vos', { done: true, doneBy: 'vos' }),
  item('supermercado', '10', 'Café', 'lucia', { done: true, doneBy: 'lucia' }),
  item('verduleria', '1', 'Tomates', 'lucia', { quantity: 1, unit: 'kg' }),
  item('verduleria', '2', 'Lechuga', 'vos'),
  item('verduleria', '3', 'Zanahorias', 'diego', { quantity: 2 }),
  item('verduleria', '4', 'Cebollas', 'vos'),
  item('verduleria', '5', 'Limones', 'lucia', { quantity: 4 }),
  item('farmacia', '1', 'Ibuprofeno', 'diego'),
  item('farmacia', '2', 'Curitas', 'lucia', { quantity: 1, unit: 'caja' }),
];

export function getMockCurrentMember(): Member {
  return (
    mockHousehold.members.find((m) => m.id === mockCurrentMemberId) ?? mockHousehold.members[0]
  );
}
