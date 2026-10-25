import { act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import Hogar from '../app/(tabs)/hogar';
import Inicio from '../app/(tabs)/listas';
import Bienvenida from '../app/index';
import Invitar from '../app/invitar';
import Lista from '../app/lista/[id]';
import Perfil from '../app/perfil';
import Unirse from '../app/unirse';
import { resetMockStore } from '../mock/store';

jest.mock('../dev/FirestorePing', () => ({ FirestorePing: () => null }));

jest.mock('expo-font', () => ({ useFonts: () => [true] }));

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  index: Bienvenida,
  unirse: Unirse,
  perfil: Perfil,
  invitar: Invitar,
  '(tabs)/listas': Inicio,
  '(tabs)/hogar': Hogar,
  'lista/[id]': Lista,
};

describe('navegación', () => {
  beforeEach(() => resetMockStore());

  it('abre en Listas y cambia a Hogar con la barra inferior', async () => {
    await renderRouter(routes, { initialUrl: '/listas' });
    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Hogar' }));
    expect(screen.getByText('Salir del hogar')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Hogar', selected: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Listas' }));
    expect(screen.getByText('Supermercado')).toBeTruthy();
  });

  it('abre una lista desde Inicio y la flecha vuelve a Inicio', async () => {
    await renderRouter(routes, { initialUrl: '/listas' });
    await fireEvent.press(screen.getByText('Ferretería'));
    expect(screen.getByText('Esta lista está vacía')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Volver a las listas'));
    expect(screen.getByText('Nueva lista')).toBeTruthy();
  });

  it('atrás en Hogar vuelve a Listas', async () => {
    await renderRouter(routes, { initialUrl: '/hogar' });
    expect(screen.getByRole('tab', { name: 'Hogar', selected: true })).toBeTruthy();
    await act(async () => router.back());
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
  });

  it('la app abre en Bienvenida y "Entrar con Google" lleva a Listas', async () => {
    await renderRouter(routes);
    expect(screen.getByText('Las compras de casa, entre todos.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Entrar con Google'));
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
    expect(screen.queryByText('Entrar con Google')).toBeNull();
  });

  it('Unirse: "Entrar y unirme" lleva a Listas y "Ahora no" a Bienvenida', async () => {
    await renderRouter(routes, { initialUrl: '/unirse' });
    expect(screen.getByText('Te invitaron a unirte al hogar.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ahora no'));
    expect(screen.getByText('Entrar con Google')).toBeTruthy();
    await act(async () => router.push('/unirse'));
    await fireEvent.press(screen.getByText('Entrar y unirme'));
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
  });

  it('Hogar abre Perfil y la flecha vuelve; Cerrar sesión lleva a Bienvenida', async () => {
    await renderRouter(routes, { initialUrl: '/hogar' });
    await fireEvent.press(screen.getByLabelText('Tu perfil'));
    expect(screen.getByText('[cuenta de Google]')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Volver a Hogar'));
    expect(screen.getByText('Salir del hogar')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Tu perfil'));
    await fireEvent.press(screen.getByText('Cerrar sesión'));
    expect(screen.getByText('Entrar con Google')).toBeTruthy();
    // Atrás ya no vuelve a una pantalla de la sesión anterior.
    expect(router.canGoBack()).toBe(false);
  });

  it('Hogar abre Invitar y la flecha vuelve', async () => {
    await renderRouter(routes, { initialUrl: '/hogar' });
    await fireEvent.press(screen.getByText('Invitar'));
    expect(screen.getByText('Sumá a alguien a Nuestra casa')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Volver a Hogar'));
    expect(screen.getByText('Salir del hogar')).toBeTruthy();
  });

  it('Salir del hogar confirma y lleva a Bienvenida', async () => {
    await renderRouter(routes, { initialUrl: '/hogar' });
    await fireEvent.press(screen.getByText('Salir del hogar'));
    expect(screen.getByText('¿Salir de Nuestra casa?')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Salir del hogar')[1]);
    expect(screen.getByText('Entrar con Google')).toBeTruthy();
  });
});
