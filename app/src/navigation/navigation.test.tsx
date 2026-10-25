import { act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import Hogar from '../app/(tabs)/hogar';
import Inicio from '../app/(tabs)/index';

jest.mock('../dev/FirestorePing', () => ({ FirestorePing: () => null }));

jest.mock('expo-font', () => ({ useFonts: () => [true] }));

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': Inicio,
  '(tabs)/hogar': Hogar,
};

describe('navegación', () => {
  it('abre en Listas y cambia a Hogar con la barra inferior', async () => {
    await renderRouter(routes);
    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Hogar' }));
    expect(screen.getByText('Salir del hogar')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Hogar', selected: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Listas' }));
    expect(screen.getByText('Supermercado')).toBeTruthy();
  });

  it('atrás en Hogar vuelve a Listas', async () => {
    await renderRouter(routes, { initialUrl: '/hogar' });
    expect(screen.getByRole('tab', { name: 'Hogar', selected: true })).toBeTruthy();
    await act(async () => router.back());
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
  });
});
