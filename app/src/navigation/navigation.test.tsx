import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import Hogar from '../app/(tabs)/hogar';
import Inicio from '../app/(tabs)/listas';
import Codigo from '../app/codigo';
import CrearHogar from '../app/crear-hogar';
import ErrorEnlace from '../app/error-enlace';
import ErrorLogin from '../app/error-login';
import ErrorSinConexion from '../app/error-sin-conexion';
import HogarCreado from '../app/hogar-creado';
import Bienvenida from '../app/index';
import SinHogar from '../app/sin-hogar';
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
  'sin-hogar': SinHogar,
  codigo: Codigo,
  'crear-hogar': CrearHogar,
  'hogar-creado': HogarCreado,
  'error-enlace': ErrorEnlace,
  'error-login': ErrorLogin,
  'error-sin-conexion': ErrorSinConexion,
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

  it('Salir del hogar confirma y lleva a Sin hogar, sin volver atrás', async () => {
    await renderRouter(routes, { initialUrl: '/hogar' });
    await fireEvent.press(screen.getByText('Salir del hogar'));
    expect(screen.getByText('¿Salir de Nuestra casa?')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Salir del hogar')[1]);
    expect(screen.getByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
    expect(router.canGoBack()).toBe(false);
  });

  it('crear un hogar: Sin hogar → Crear hogar → Hogar creado → Invitar', async () => {
    await renderRouter(routes, { initialUrl: '/sin-hogar' });
    await fireEvent.press(screen.getByText('Crear un hogar'));
    await fireEvent.changeText(screen.getByLabelText('Nombre del hogar'), 'Casa nueva');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear hogar' }));
    expect(screen.getByText('¡Listo, ya tenés hogar!')).toBeTruthy();
    expect(screen.getByText('Casa nueva')).toBeTruthy();
    expect(screen.getByText('1 miembro')).toBeTruthy();
    await fireEvent.press(screen.getByText('Invitar'));
    expect(screen.getByText('Sumá a alguien a Casa nueva')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Volver a Hogar'));
    expect(screen.getByRole('tab', { name: 'Hogar', selected: true })).toBeTruthy();
  });

  it('Hogar creado: "Más tarde" lleva a Listas', async () => {
    await renderRouter(routes, { initialUrl: '/sin-hogar' });
    await fireEvent.press(screen.getByText('Crear un hogar'));
    await fireEvent.changeText(screen.getByLabelText('Nombre del hogar'), 'Casa nueva');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear hogar' }));
    await fireEvent.press(screen.getByText('Más tarde'));
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
  });

  it('Sin hogar → código → Unirme lleva a Listas', async () => {
    await renderRouter(routes, { initialUrl: '/sin-hogar' });
    await fireEvent.press(screen.getByText('Tengo un código de invitación'));
    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(screen.getByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Tengo un código de invitación'));
    await fireEvent.changeText(screen.getByLabelText('Código de invitación'), 'K7P2-9XQ-4MN');
    await fireEvent.press(screen.getByText('Unirme'));
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
    expect(router.canGoBack()).toBe(false);
  });

  it('entrar con Google sin hogar lleva a Sin hogar', async () => {
    await renderRouter(routes);
    await fireEvent.press(screen.getByText('Entrar con Google'));
    await fireEvent.press(screen.getByRole('tab', { name: 'Hogar' }));
    await fireEvent.press(screen.getByText('Salir del hogar'));
    await fireEvent.press(screen.getAllByText('Salir del hogar')[1]);
    await act(async () => router.replace('/'));
    await fireEvent.press(screen.getByText('Entrar con Google'));
    expect(screen.getByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
  });

  it('Unirse con el enlace desactivado muestra el error y "Entendido" vuelve a Bienvenida', async () => {
    await renderRouter(routes, { initialUrl: '/invitar' });
    await fireEvent.press(screen.getByText('Desactivar enlace'));
    await fireEvent.press(screen.getByText('Desactivar'));
    await act(async () => router.push('/unirse'));
    await fireEvent.press(screen.getByText('Entrar y unirme'));
    expect(screen.getByText('Este enlace ya no sirve.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Entendido'));
    expect(screen.getByText('Entrar con Google')).toBeTruthy();
  });

  it('Unirse sin conexión muestra el error y "Reintentar" vuelve a Unirse', async () => {
    await renderRouter(routes, { initialUrl: '/lista/ferreteria' });
    await fireEvent.press(screen.getByText('Sincronizado'));
    await act(async () => router.push('/unirse'));
    await fireEvent.press(screen.getByText('Entrar y unirme'));
    expect(screen.getByText('Necesitás internet para unirte.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(screen.getByText('Te invitaron a unirte al hogar.')).toBeTruthy();
  });

  it('error de enlace: "Tengo un código" abre el campo del código', async () => {
    await renderRouter(routes, { initialUrl: '/error-enlace' });
    await fireEvent.press(screen.getByText('Tengo un código'));
    expect(screen.getByText('Escribí o pegá tu código')).toBeTruthy();
  });

  it('error de inicio de sesión: "Reintentar" lleva a Listas', async () => {
    await renderRouter(routes, { initialUrl: '/error-login' });
    expect(screen.getByText('Algo salió mal.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
  });

  it('"te sacaron" muestra el aviso encima de Sin hogar', async () => {
    await renderRouter(routes, { initialUrl: '/sin-hogar?sacaron=1' });
    expect(screen.getByText('Ya no sos parte de Nuestra casa')).toBeTruthy();
    await fireEvent.press(screen.getByText('Continuar'));
    await waitFor(() => expect(screen.queryByText('Ya no sos parte de Nuestra casa')).toBeNull());
  });
});
