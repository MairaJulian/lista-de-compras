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
import { Alert } from 'react-native';
import { signOutEverywhere, watchSession } from '../auth/sessionSource';
import { signedInState, type AuthState } from '../auth/sessionState';
import { resetSession } from '../auth/sessionStore';
import { resetMockStore } from '../mock/store';

jest.mock('../dev/FirestorePing', () => ({ FirestorePing: () => null }));

jest.mock('expo-font', () => ({ useFonts: () => [true] }));

const mockSignIn = jest.fn();
jest.mock('../auth/googleSignIn', () => ({
  signInWithGoogle: () => mockSignIn(),
}));

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

const account = { displayName: 'Maira Julián', email: 'maira@example.com', photoURL: null };

/** Qué avisa Firebase al abrir la app, y cómo avisar que la sesión cambió (entrar, salir). */
let emitAuth: (state: AuthState) => unknown = () => {};
function firebaseSession(initial: AuthState) {
  (watchSession as jest.Mock).mockImplementation((onChange: (state: AuthState) => void) => {
    emitAuth = (state) => act(async () => onChange(state));
    onChange(initial);
    return () => {};
  });
  resetSession();
}

describe('navegación', () => {
  beforeEach(() => {
    resetMockStore();
    // Por defecto: sesión de ejemplo (con hogar), como en desarrollo.
    resetSession({ status: 'demo' });
    mockSignIn.mockReset();
    mockSignIn.mockResolvedValue({ status: 'success' });
  });

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

  it('la app abre en Bienvenida y "Entrar con Google" lleva a Sin hogar', async () => {
    firebaseSession({ status: 'signedOut' });
    mockSignIn.mockImplementation(async () => {
      await emitAuth(signedInState(account, { hogarActualId: null }));
      return { status: 'success' };
    });
    await renderRouter(routes);
    expect(screen.getByText('Las compras de casa, entre todos.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Entrar con Google'));
    expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
    expect(screen.queryByText('Entrar con Google')).toBeNull();
    expect(router.canGoBack()).toBe(false);
  });

  it('si la persona cancela el login se queda en Bienvenida, sin error', async () => {
    firebaseSession({ status: 'signedOut' });
    mockSignIn.mockResolvedValue({ status: 'cancelled' });
    await renderRouter(routes);
    await fireEvent.press(screen.getByText('Entrar con Google'));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Entrar con Google')).toBeTruthy();
    expect(screen.queryByText('Algo salió mal.')).toBeNull();
  });

  it('si falla el login abre el error y "Reintentar" entra cuando sale bien', async () => {
    firebaseSession({ status: 'signedOut' });
    mockSignIn.mockImplementation(async () => {
      await emitAuth(signedInState(account, { hogarActualId: null }));
      return { status: 'success' };
    });
    mockSignIn.mockResolvedValueOnce({ status: 'error' });
    await renderRouter(routes);
    await fireEvent.press(screen.getByText('Entrar con Google'));
    expect(await screen.findByText('Algo salió mal.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
  });

  it('si el reintento falla de nuevo se queda en el error, y si cancela vuelve a Bienvenida', async () => {
    firebaseSession({ status: 'signedOut' });
    mockSignIn.mockResolvedValue({ status: 'error' });
    await renderRouter(routes, { initialUrl: '/error-login' });
    await fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Algo salió mal.')).toBeTruthy();
    mockSignIn.mockResolvedValue({ status: 'cancelled' });
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Entrar con Google')).toBeTruthy();
  });

  it('Unirse: "Entrar y unirme" lleva a Listas, y "Ahora no" a donde arranca la sesión', async () => {
    await renderRouter(routes, { initialUrl: '/unirse' });
    expect(screen.getByText('Te invitaron a unirte al hogar.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Entrar y unirme'));
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
    await act(async () => router.push('/unirse'));
    await fireEvent.press(screen.getByText('Ahora no'));
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
    // Sin sesión, "Ahora no" lleva a Bienvenida.
    await act(async () => resetSession({ status: 'signedOut' }));
    await act(async () => router.push('/unirse'));
    await fireEvent.press(screen.getByText('Ahora no'));
    expect(screen.getByText('Entrar con Google')).toBeTruthy();
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

  it('salir del hogar y volver a entrar con Google lleva a Sin hogar', async () => {
    await renderRouter(routes, { initialUrl: '/hogar' });
    await fireEvent.press(screen.getByText('Salir del hogar'));
    await fireEvent.press(screen.getAllByText('Salir del hogar')[1]);
    // Termina la sesión de ejemplo y se vuelve a entrar con una cuenta sin hogar.
    await act(async () => resetSession({ status: 'signedOut' }));
    mockSignIn.mockImplementation(async () => {
      await emitAuth(signedInState(account, { hogarActualId: null }));
      return { status: 'success' };
    });
    await fireEvent.press(screen.getByText('Entrar con Google'));
    expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
  });

  it('Unirse con el enlace desactivado muestra el error y "Entendido" vuelve al inicio', async () => {
    await renderRouter(routes, { initialUrl: '/invitar' });
    await fireEvent.press(screen.getByText('Desactivar enlace'));
    await fireEvent.press(screen.getByText('Desactivar'));
    await act(async () => router.push('/unirse'));
    await fireEvent.press(screen.getByText('Entrar y unirme'));
    expect(screen.getByText('Este enlace ya no sirve.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Entendido'));
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
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

  it('error de inicio de sesión: "Reintentar" entra si el login sale bien', async () => {
    firebaseSession({ status: 'signedOut' });
    mockSignIn.mockImplementation(async () => {
      await emitAuth(signedInState(account, { hogarActualId: null }));
      return { status: 'success' };
    });
    await renderRouter(routes, { initialUrl: '/error-login' });
    expect(screen.getByText('Algo salió mal.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
  });

  it('"te sacaron" muestra el aviso encima de Sin hogar', async () => {
    await renderRouter(routes, { initialUrl: '/sin-hogar?sacaron=1' });
    expect(screen.getByText('Ya no sos parte de Nuestra casa')).toBeTruthy();
    await fireEvent.press(screen.getByText('Continuar'));
    await waitFor(() => expect(screen.queryByText('Ya no sos parte de Nuestra casa')).toBeNull());
  });

  describe('sesión y rutas protegidas', () => {
    it('mientras se averigua la sesión muestra la carga con la marca, sin Bienvenida', async () => {
      (watchSession as jest.Mock).mockImplementation(() => () => {});
      resetSession();
      await renderRouter(routes);
      expect(screen.getByLabelText('Cargando')).toBeTruthy();
      expect(screen.queryByText('Entrar con Google')).toBeNull();
    });

    it('sin sesión abre Bienvenida aunque se pida una pantalla de la app', async () => {
      firebaseSession({ status: 'signedOut' });
      await renderRouter(routes, { initialUrl: '/listas' });
      expect(screen.getByText('Entrar con Google')).toBeTruthy();
      expect(screen.queryByText('Nueva lista')).toBeNull();
    });

    it('con sesión y sin hogar abre Sin hogar', async () => {
      firebaseSession(signedInState(account, { hogarActualId: null }));
      await renderRouter(routes);
      expect(screen.getByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
    });

    it('con sesión y sin hogar, pedir Listas lleva a Sin hogar', async () => {
      firebaseSession(signedInState(account, { hogarActualId: null }));
      await renderRouter(routes, { initialUrl: '/listas' });
      expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
    });

    it('con sesión y hogar abre Listas, sin pasar por Bienvenida', async () => {
      firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
      await renderRouter(routes);
      expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
      expect(screen.queryByText('Entrar con Google')).toBeNull();
    });

    it('con sesión, la pantalla de error de inicio de sesión no se puede abrir', async () => {
      firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
      await renderRouter(routes);
      await act(async () => router.push('/error-login'));
      expect(screen.queryByText('Algo salió mal.')).toBeNull();
    });

    it('Perfil muestra el nombre y el mail reales, y sin hogar no muestra la tarjeta de hogar', async () => {
      firebaseSession(signedInState(account, { nombre: 'Maira J.', hogarActualId: null }));
      await renderRouter(routes, { initialUrl: '/perfil' });
      expect(screen.getByText('Maira J.')).toBeTruthy();
      expect(screen.getByText('maira@example.com')).toBeTruthy();
      expect(screen.queryByText('Nuestra casa')).toBeNull();
    });

    it('Cerrar sesión cierra Google y Firebase, vuelve a Bienvenida y se puede volver a entrar', async () => {
      firebaseSession(signedInState(account, { hogarActualId: null }));
      (signOutEverywhere as jest.Mock).mockImplementationOnce(async () => {
        await emitAuth({ status: 'signedOut' });
      });
      mockSignIn.mockImplementation(async () => {
        await emitAuth(signedInState(account, { hogarActualId: null }));
        return { status: 'success' };
      });
      await renderRouter(routes, { initialUrl: '/perfil' });
      await fireEvent.press(screen.getByText('Cerrar sesión'));
      expect(await screen.findByText('Entrar con Google')).toBeTruthy();
      expect(signOutEverywhere).toHaveBeenCalledTimes(1);
      expect(router.canGoBack()).toBe(false);
      await fireEvent.press(screen.getByText('Entrar con Google'));
      expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
    });

    it('si no se puede cerrar la sesión avisa y se queda en Perfil', async () => {
      firebaseSession(signedInState(account, { hogarActualId: null }));
      (signOutEverywhere as jest.Mock).mockRejectedValueOnce(new Error('sin conexión'));
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      await renderRouter(routes, { initialUrl: '/perfil' });
      await fireEvent.press(screen.getByText('Cerrar sesión'));
      await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
      expect(screen.getByText('maira@example.com')).toBeTruthy();
      alert.mockRestore();
    });

    it('el menú DEV entra con datos de ejemplo y se ve toda la app', async () => {
      firebaseSession({ status: 'signedOut' });
      await renderRouter(routes);
      await fireEvent.press(screen.getByLabelText('Menú de desarrollo'));
      await fireEvent.press(screen.getByText('Entrar con datos de ejemplo'));
      expect(await screen.findByText('Supermercado')).toBeTruthy();
    });
  });
});
