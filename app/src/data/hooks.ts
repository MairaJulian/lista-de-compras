import { getMockCurrentMember, mockHousehold, mockLists } from '../mock/data';
import type { Household, ListSummary, Member } from './types';

// Único punto de acceso a los datos para las pantallas. Hoy devuelve los datos de ejemplo;
// con Firebase se reemplaza la implementación sin tocar las pantallas.

export function useHousehold(): Household {
  return mockHousehold;
}

export function useLists(): ListSummary[] {
  return mockLists;
}

export function useCurrentMember(): Member {
  return getMockCurrentMember();
}
