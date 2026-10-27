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
import Unirse from '../app/unirse/index';
import UnirseConEnlace from '../app/unirse/[codigo]';
import { Alert } from 'react-native';
import { signOutEverywhere, watchSession } from '../auth/sessionSource';
import { signedInState, type AuthState } from '../auth/sessionState';
import { resetSession } from '../auth/sessionStore';
import {
  createHousehold,
  forgetHousehold,
  leaveCurrentHousehold,
  removeMemberFromHousehold,
  renameHousehold,
  watchHousehold,
} from '../data/householdSource';
import { InviteInvalidError } from '../data/joinLogic';
import { joinHousehold, readInvitePreview } from '../data/joinSource';
import { clearPendingInvite } from '../data/pendingInvite';
import { resetHouseholdStore } from '../data/householdStore';
import type { Member } from '../data/types';
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
  'unirse/index': Unirse,
  'unirse/[codigo]': UnirseConEnlace,
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
    resetHouseholdStore();
    (createHousehold as jest.Mock).mockReset();
    (watchHousehold as jest.Mock).mockReset().mockImplementation(() => () => {});
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

    describe('hogar real', () => {
      const me = { id: 'u1', name: 'Maira', role: 'creator' as const, tone: 'green' as const };
      const readsHousehold = (name: string) =>
        (watchHousehold as jest.Mock).mockImplementation((id, onData) => {
          onData({ id, name, me, members: [me] });
          return () => {};
        });

      it('con hogar y sin listas abre Inicio sin listas, y "Nueva lista" avisa que todavía no crea', async () => {
        readsHousehold('Casa real');
        firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        await renderRouter(routes);
        expect(screen.getByText('Casa real')).toBeTruthy();
        expect(screen.getByText('Todavía no hay listas')).toBeTruthy();
        expect(screen.queryByText('Supermercado')).toBeNull();
        await fireEvent.press(screen.getByText('Nueva lista'));
        expect(alert).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Crear lista')).toBeNull();
        alert.mockRestore();
      });

      it('si falla la lectura del hogar muestra el error y "Reintentar" vuelve a leer', async () => {
        (watchHousehold as jest.Mock).mockImplementationOnce((_id, _onData, onError) => {
          onError();
          return () => {};
        });
        readsHousehold('Casa real');
        firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
        await renderRouter(routes);
        expect(screen.getByText('No pudimos cargar tus datos')).toBeTruthy();
        expect(screen.queryByText('Nueva lista')).toBeNull();
        await fireEvent.press(screen.getByText('Reintentar'));
        expect(await screen.findByText('Todavía no hay listas')).toBeTruthy();
        expect(screen.getByText('Casa real')).toBeTruthy();
      });

      it('Hogar muestra a los miembros reales, y uno nuevo aparece en tiempo real', async () => {
        const lucia = { id: 'u2', name: 'Lucía', role: 'member' as const, tone: 'amber' as const };
        let push: (members: Member[]) => void = () => {};
        (watchHousehold as jest.Mock).mockImplementation((id, onData) => {
          push = (members) => onData({ id, name: 'Casa real', me, members });
          push([me]);
          return () => {};
        });
        firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
        await renderRouter(routes);
        await fireEvent.press(screen.getByRole('tab', { name: 'Hogar' }));
        expect(screen.getByText('1 miembro')).toBeTruthy();
        expect(screen.getByText('Creaste el hogar')).toBeTruthy();
        expect(screen.queryByText('Lucía')).toBeNull();
        await act(async () => push([me, lucia]));
        expect(screen.getByText('2 miembros')).toBeTruthy();
        expect(screen.getByText('Lucía')).toBeTruthy();
        expect(screen.getByLabelText('Opciones de Lucía')).toBeTruthy();
      });

      it('Hogar: editar el nombre lo guarda en el hogar real y lo cambia al llegar la lectura', async () => {
        let push: (name: string) => void = () => {};
        (watchHousehold as jest.Mock).mockImplementation((id, onData) => {
          push = (name) => onData({ id, name, me, members: [me] });
          push('Casa real');
          return () => {};
        });
        (renameHousehold as jest.Mock).mockImplementation(async () => push('Casa nueva'));
        firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
        await renderRouter(routes);
        await fireEvent.press(screen.getByRole('tab', { name: 'Hogar' }));
        await fireEvent.press(screen.getByLabelText('Editar el nombre del hogar'));
        await fireEvent.changeText(screen.getByLabelText('Nuevo nombre'), '  Casa nueva ');
        await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
        await waitFor(() => expect(renameHousehold).toHaveBeenCalledWith('h1', 'Casa nueva'));
        await waitFor(() => expect(screen.queryByText('Nombre del hogar')).toBeNull());
        expect(screen.getByText('Casa nueva')).toBeTruthy();
      });

      it('Hogar: si falla la lectura muestra el error 32 y "Reintentar" vuelve a leer', async () => {
        (watchHousehold as jest.Mock).mockImplementationOnce((_id, _onData, onError) => {
          onError();
          return () => {};
        });
        readsHousehold('Casa real');
        firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
        await renderRouter(routes);
        await fireEvent.press(screen.getByRole('tab', { name: 'Hogar' }));
        expect(screen.getByText('No pudimos cargar tus datos')).toBeTruthy();
        expect(screen.queryByText('Salir del hogar')).toBeNull();
        expect(screen.getByLabelText('Tu perfil')).toBeTruthy();
        await fireEvent.press(screen.getByText('Reintentar'));
        expect(await screen.findByText('Salir del hogar')).toBeTruthy();
        expect(screen.getByText('Casa real')).toBeTruthy();
      });

      describe('quitar, salir y "te sacaron"', () => {
        const lucia = { id: 'u2', name: 'Lucía', role: 'member' as const, tone: 'amber' as const };
        const luciaMe = { ...lucia, id: 'u1' };
        const creatorMe = { ...me, id: 'u1' };
        let removed: (reason: 'quitado' | 'salio', name: string) => void = () => {};

        /** El hogar de `Casa real` con estos miembros, vistos por `self`. */
        const readsMembers = (self: Member, members: Member[]) =>
          (watchHousehold as jest.Mock).mockImplementation((id, onData, _onError, onRemoved) => {
            removed = onRemoved;
            onData({ id, name: 'Casa real', me: self, members });
            return () => {};
          });

        beforeEach(() => {
          (removeMemberFromHousehold as jest.Mock).mockReset();
          (leaveCurrentHousehold as jest.Mock).mockReset();
          (forgetHousehold as jest.Mock).mockReset().mockResolvedValue(undefined);
        });

        async function openHogar() {
          firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
          await renderRouter(routes);
          await fireEvent.press(screen.getByRole('tab', { name: 'Hogar' }));
        }

        it('quien creó el hogar quita a un miembro: se confirma y se pide al servidor', async () => {
          readsMembers(creatorMe, [creatorMe, lucia]);
          await openHogar();
          await fireEvent.press(screen.getByLabelText('Opciones de Lucía'));
          await fireEvent.press(screen.getByText('Quitar del hogar'));
          await fireEvent.press(screen.getByText('Quitar'));
          await waitFor(() => expect(removeMemberFromHousehold).toHaveBeenCalledWith('h1', 'u2'));
          await waitFor(() => expect(screen.queryByText('¿Quitar a Lucía del hogar?')).toBeNull());
        });

        it('quien no creó el hogar no ve las opciones de los demás', async () => {
          readsMembers(luciaMe, [{ ...creatorMe, id: 'u3' }, luciaMe]);
          await openHogar();
          expect(screen.queryByLabelText(/Opciones de/)).toBeNull();
        });

        it('si no se pudo quitar (sin conexión) el aviso sigue con el error y se puede reintentar', async () => {
          readsMembers(creatorMe, [creatorMe, lucia]);
          (removeMemberFromHousehold as jest.Mock).mockRejectedValueOnce(new Error('unavailable'));
          await openHogar();
          await fireEvent.press(screen.getByLabelText('Opciones de Lucía'));
          await fireEvent.press(screen.getByText('Quitar del hogar'));
          await fireEvent.press(screen.getByText('Quitar'));
          expect(
            await screen.findByText(/No pudimos quitar a Lucía\. Revisá tu conexión/),
          ).toBeTruthy();
          expect(screen.getByText('¿Quitar a Lucía del hogar?')).toBeTruthy();
          await fireEvent.press(screen.getByText('Quitar'));
          await waitFor(() => expect(removeMemberFromHousehold).toHaveBeenCalledTimes(2));
          await waitFor(() => expect(screen.queryByText('¿Quitar a Lucía del hogar?')).toBeNull());
        });

        it('un miembro común sale sin traspaso y va a Sin hogar', async () => {
          readsMembers(luciaMe, [{ ...creatorMe, id: 'u3' }, luciaMe]);
          (leaveCurrentHousehold as jest.Mock).mockImplementation(async () => {
            await emitAuth(signedInState(account, { hogarActualId: null }));
          });
          await openHogar();
          await fireEvent.press(screen.getByText('Salir del hogar'));
          await fireEvent.press(screen.getAllByText('Salir del hogar')[1]);
          expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
          expect(leaveCurrentHousehold).toHaveBeenCalledWith('h1', undefined);
          expect(screen.queryByText(/Ya no sos parte/)).toBeNull();
        });

        it('quien creó el hogar pasa el rol a quien lleva más tiempo y se muestra a quién', async () => {
          const diego = { id: 'u3', name: 'Diego', role: 'member' as const, tone: 'blue' as const };
          readsMembers(creatorMe, [creatorMe, lucia, diego]);
          (leaveCurrentHousehold as jest.Mock).mockImplementation(async () => {
            await emitAuth(signedInState(account, { hogarActualId: null }));
          });
          await openHogar();
          await fireEvent.press(screen.getByText('Salir del hogar'));
          expect(screen.getByText('Será la nueva persona a cargo')).toBeTruthy();
          await fireEvent.press(screen.getAllByText('Salir del hogar')[1]);
          expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
          expect(leaveCurrentHousehold).toHaveBeenCalledWith('h1', 'u2');
        });

        it('la última persona sale sin traspaso ("Salir y archivar")', async () => {
          readsMembers(creatorMe, [creatorMe]);
          (leaveCurrentHousehold as jest.Mock).mockImplementation(async () => {
            await emitAuth(signedInState(account, { hogarActualId: null }));
          });
          await openHogar();
          await fireEvent.press(screen.getByText('Salir del hogar'));
          expect(screen.getByText('Sos la última persona del hogar')).toBeTruthy();
          await fireEvent.press(screen.getByText('Salir y archivar'));
          expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
          expect(leaveCurrentHousehold).toHaveBeenCalledWith('h1', undefined);
        });

        it('si no se pudo salir (sin conexión) sigue en Hogar con el error y se puede reintentar', async () => {
          readsMembers(luciaMe, [{ ...creatorMe, id: 'u3' }, luciaMe]);
          (leaveCurrentHousehold as jest.Mock).mockRejectedValueOnce(new Error('unavailable'));
          await openHogar();
          await fireEvent.press(screen.getByText('Salir del hogar'));
          await fireEvent.press(screen.getAllByText('Salir del hogar')[1]);
          expect(
            await screen.findByText(/No pudimos sacarte del hogar\. Revisá tu conexión/),
          ).toBeTruthy();
          expect(screen.queryByText('Armá tu hogar o sumate a uno.')).toBeNull();
          (leaveCurrentHousehold as jest.Mock).mockImplementation(async () => {
            await emitAuth(signedInState(account, { hogarActualId: null }));
          });
          await fireEvent.press(screen.getAllByText('Salir del hogar')[1]);
          expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
          expect(leaveCurrentHousehold).toHaveBeenCalledTimes(2);
        });

        it('si te quitan mientras la app está abierta: aviso, Sin hogar y hogarActualId vaciado', async () => {
          readsMembers(luciaMe, [{ ...creatorMe, id: 'u3' }, luciaMe]);
          (forgetHousehold as jest.Mock).mockImplementation(async () => {
            await emitAuth(signedInState(account, { hogarActualId: null }));
          });
          await openHogar();
          await act(async () => removed('quitado', 'Casa real'));
          expect(await screen.findByText('Ya no sos parte de Casa real')).toBeTruthy();
          expect(screen.getByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
          expect(forgetHousehold).toHaveBeenCalledWith('h1');
          await fireEvent.press(screen.getByText('Continuar'));
          await waitFor(() =>
            expect(screen.queryByText('Ya no sos parte de Casa real')).toBeNull(),
          );
          expect(router.canGoBack()).toBe(false);
        });

        it('si te quitaron con la app cerrada, al abrirla se muestra el aviso en vez de Inicio', async () => {
          (watchHousehold as jest.Mock).mockImplementation((_id, _onData, _onError, onRemoved) => {
            onRemoved('quitado', 'Casa real');
            return () => {};
          });
          firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
          await renderRouter(routes);
          expect(await screen.findByText('Ya no sos parte de Casa real')).toBeTruthy();
          expect(forgetHousehold).toHaveBeenCalledWith('h1');
        });

        it('sin el nombre del hogar el aviso dice "tu hogar"', async () => {
          (watchHousehold as jest.Mock).mockImplementation((_id, _onData, _onError, onRemoved) => {
            onRemoved('quitado', '');
            return () => {};
          });
          firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
          await renderRouter(routes);
          expect(await screen.findByText('Ya no sos parte de tu hogar')).toBeTruthy();
        });

        it('si saliste desde otro celular va a Sin hogar sin el aviso de "te sacaron"', async () => {
          (watchHousehold as jest.Mock).mockImplementation((_id, _onData, _onError, onRemoved) => {
            onRemoved('salio', 'Casa real');
            return () => {};
          });
          firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
          await renderRouter(routes);
          expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
          expect(screen.queryByText(/Ya no sos parte/)).toBeNull();
          expect(forgetHousehold).toHaveBeenCalledWith('h1');
        });

        it('si no se puede vaciar hogarActualId (sin conexión) igual se muestra el aviso', async () => {
          (forgetHousehold as jest.Mock).mockRejectedValue(new Error('unavailable'));
          (watchHousehold as jest.Mock).mockImplementation((_id, _onData, _onError, onRemoved) => {
            onRemoved('quitado', 'Casa real');
            return () => {};
          });
          firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
          await renderRouter(routes);
          expect(await screen.findByText('Ya no sos parte de Casa real')).toBeTruthy();
        });
      });

      it('Sin hogar: el avatar abre Perfil y la flecha vuelve', async () => {
        firebaseSession(signedInState(account, { hogarActualId: null }));
        await renderRouter(routes);
        await fireEvent.press(screen.getByLabelText('Tu perfil'));
        expect(screen.getByText('maira@example.com')).toBeTruthy();
        expect(screen.getByText('Cerrar sesión')).toBeTruthy();
        await fireEvent.press(screen.getByLabelText('Volver'));
        expect(screen.getByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
      });

      it('crear el hogar: Hogar creado y "Más tarde" lleva a Inicio sin listas', async () => {
        readsHousehold('Casa nueva');
        (createHousehold as jest.Mock).mockImplementation(async (name: string) => {
          await emitAuth(signedInState(account, { hogarActualId: 'h-nuevo' }));
          return { id: 'h-nuevo', name, me, members: [me] };
        });
        firebaseSession(signedInState(account, { hogarActualId: null }));
        await renderRouter(routes);
        await fireEvent.press(screen.getByText('Crear un hogar'));
        await fireEvent.changeText(screen.getByLabelText('Nombre del hogar'), 'Casa nueva');
        await fireEvent.press(screen.getByRole('button', { name: 'Crear hogar' }));
        expect(await screen.findByText('¡Listo, ya tenés hogar!')).toBeTruthy();
        expect(createHousehold).toHaveBeenCalledWith('Casa nueva', {
          name: 'Maira Julián',
          photo: null,
        });
        await fireEvent.press(screen.getByText('Más tarde'));
        expect(await screen.findByText('Todavía no hay listas')).toBeTruthy();
        expect(screen.getByText('Casa nueva')).toBeTruthy();
      });

      it('si falla crear el hogar muestra el error con el nombre escrito; "Reintentar" lo crea', async () => {
        readsHousehold('Casa nueva');
        (createHousehold as jest.Mock)
          .mockRejectedValueOnce(new Error('unavailable'))
          .mockImplementation(async (name: string) => {
            await emitAuth(signedInState(account, { hogarActualId: 'h-nuevo' }));
            return { id: 'h-nuevo', name, me, members: [me] };
          });
        firebaseSession(signedInState(account, { hogarActualId: null }));
        await renderRouter(routes);
        await fireEvent.press(screen.getByText('Crear un hogar'));
        await fireEvent.changeText(screen.getByLabelText('Nombre del hogar'), 'Casa nueva');
        await fireEvent.press(screen.getByRole('button', { name: 'Crear hogar' }));
        expect(await screen.findByText('No pudimos crear el hogar')).toBeTruthy();
        expect(screen.getByDisplayValue('Casa nueva')).toBeTruthy();
        await fireEvent.press(screen.getByText('Reintentar'));
        expect(await screen.findByText('¡Listo, ya tenés hogar!')).toBeTruthy();
      });

      it('"Ahora no" del error de crear hogar vuelve a Sin hogar', async () => {
        (createHousehold as jest.Mock).mockRejectedValue(new Error('unavailable'));
        firebaseSession(signedInState(account, { hogarActualId: null }));
        await renderRouter(routes);
        await fireEvent.press(screen.getByText('Crear un hogar'));
        await fireEvent.changeText(screen.getByLabelText('Nombre del hogar'), 'Casa nueva');
        await fireEvent.press(screen.getByRole('button', { name: 'Crear hogar' }));
        await fireEvent.press(await screen.findByText('Ahora no'));
        expect(screen.getByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
      });
    });

    describe('unirse con una invitación real', () => {
      const CODE = 'K7P2-9XQ-4MN';
      const me = { id: 'u1', name: 'Maira', role: 'member' as const, tone: 'green' as const };
      const preview = { code: CODE, householdName: 'Nuestra casa', invitedByName: 'Lucía' };

      beforeEach(() => {
        (readInvitePreview as jest.Mock).mockReset().mockResolvedValue(preview);
        (joinHousehold as jest.Mock).mockReset();
        clearPendingInvite();
        (watchHousehold as jest.Mock).mockImplementation((id, onData) => {
          onData({ id, name: 'Nuestra casa', me, members: [me] });
          return () => {};
        });
      });

      it('con el enlace muestra el hogar y quién invitó, y "Unirme" lleva a Inicio', async () => {
        firebaseSession(signedInState(account, { hogarActualId: null }));
        (joinHousehold as jest.Mock).mockImplementation(async () => {
          await emitAuth(signedInState(account, { hogarActualId: 'h1' }));
        });
        await renderRouter(routes, { initialUrl: `/unirse/${CODE}` });
        expect(await screen.findByText('Nuestra casa')).toBeTruthy();
        expect(screen.getByText('Te invitó Lucía')).toBeTruthy();
        expect(readInvitePreview).toHaveBeenCalledWith(CODE);
        await fireEvent.press(screen.getByRole('button', { name: 'Unirme' }));
        expect(joinHousehold).toHaveBeenCalledWith(CODE, { name: 'Maira Julián', photo: null });
        expect(await screen.findByText('Todavía no hay listas')).toBeTruthy();
        expect(router.canGoBack()).toBe(false);
      });

      it('mientras la sesión no sabe del hogar nuevo no navega: queda en "Uniéndome…"', async () => {
        firebaseSession(signedInState(account, { hogarActualId: null }));
        (joinHousehold as jest.Mock).mockResolvedValue(undefined);
        await renderRouter(routes, { initialUrl: `/unirse/${CODE}` });
        await fireEvent.press(await screen.findByRole('button', { name: 'Unirme' }));
        expect(await screen.findByRole('button', { name: 'Uniéndome…' })).toBeDisabled();
        expect(screen.queryByText('Armá tu hogar o sumate a uno.')).toBeNull();
      });

      it('un enlace cuya invitación no existe, venció o está revocada muestra el error de enlace', async () => {
        (readInvitePreview as jest.Mock).mockRejectedValue(new InviteInvalidError());
        firebaseSession(signedInState(account, { hogarActualId: null }));
        await renderRouter(routes, { initialUrl: `/unirse/${CODE}` });
        expect(await screen.findByText('Este enlace ya no sirve.')).toBeTruthy();
        await fireEvent.press(screen.getByText('Entendido'));
        expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
      });

      it('si la invitación se revoca antes de confirmar, "Unirme" muestra el error de enlace', async () => {
        firebaseSession(signedInState(account, { hogarActualId: null }));
        (joinHousehold as jest.Mock).mockRejectedValue(new InviteInvalidError());
        await renderRouter(routes, { initialUrl: `/unirse/${CODE}` });
        await fireEvent.press(await screen.findByRole('button', { name: 'Unirme' }));
        expect(await screen.findByText('Este enlace ya no sirve.')).toBeTruthy();
      });

      it('sin conexión muestra el error 26 y "Reintentar" vuelve a leer con el mismo código', async () => {
        firebaseSession(signedInState(account, { hogarActualId: null }));
        (readInvitePreview as jest.Mock).mockRejectedValueOnce(new Error('unavailable'));
        await renderRouter(routes, { initialUrl: `/unirse/${CODE}` });
        expect(await screen.findByText('Necesitás internet para unirte.')).toBeTruthy();
        await fireEvent.press(screen.getByText('Reintentar'));
        expect(await screen.findByText('Te invitó Lucía')).toBeTruthy();
        expect(readInvitePreview).toHaveBeenCalledTimes(2);
        expect(readInvitePreview).toHaveBeenLastCalledWith(CODE);
      });

      it('sin conexión al confirmar muestra el error 26 y no se une', async () => {
        firebaseSession(signedInState(account, { hogarActualId: null }));
        (joinHousehold as jest.Mock).mockRejectedValue(new Error('unavailable'));
        await renderRouter(routes, { initialUrl: `/unirse/${CODE}` });
        await fireEvent.press(await screen.findByRole('button', { name: 'Unirme' }));
        expect(await screen.findByText('Necesitás internet para unirte.')).toBeTruthy();
        await fireEvent.press(screen.getByText('Ahora no'));
        expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
      });

      it('sin sesión conserva el código: entra con Google y sigue en la invitación', async () => {
        firebaseSession({ status: 'signedOut' });
        mockSignIn.mockImplementation(async () => {
          await emitAuth(signedInState(account, { hogarActualId: null }));
          return { status: 'success' };
        });
        await renderRouter(routes, { initialUrl: `/unirse/${CODE}` });
        expect(await screen.findByText('Las compras de casa, entre todos.')).toBeTruthy();
        expect(readInvitePreview).not.toHaveBeenCalled();
        await fireEvent.press(screen.getByText('Entrar con Google'));
        expect(await screen.findByText('Te invitó Lucía')).toBeTruthy();
        expect(readInvitePreview).toHaveBeenCalledWith(CODE);
        await fireEvent.press(screen.getByText('Ahora no'));
        expect(await screen.findByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
      });

      it('si ya tiene un hogar, el enlace no lo cambia de hogar: va a Inicio', async () => {
        firebaseSession(signedInState(account, { hogarActualId: 'h1' }));
        await renderRouter(routes, { initialUrl: `/unirse/${CODE}` });
        expect(await screen.findByText('Todavía no hay listas')).toBeTruthy();
        expect(joinHousehold).not.toHaveBeenCalled();
      });

      it('con el código: se une y va a Inicio', async () => {
        firebaseSession(signedInState(account, { hogarActualId: null }));
        (joinHousehold as jest.Mock).mockImplementation(async () => {
          await emitAuth(signedInState(account, { hogarActualId: 'h1' }));
        });
        await renderRouter(routes);
        await fireEvent.press(screen.getByText('Tengo un código de invitación'));
        await fireEvent.changeText(screen.getByLabelText('Código de invitación'), ' k7p2-9xq-4mn ');
        await fireEvent.press(screen.getByText('Unirme'));
        expect(await screen.findByText('Todavía no hay listas')).toBeTruthy();
        expect(joinHousehold).toHaveBeenCalledWith(CODE, { name: 'Maira Julián', photo: null });
      });

      it('con un código que no sirve muestra el error 30 en el campo y se corrige escribiendo', async () => {
        firebaseSession(signedInState(account, { hogarActualId: null }));
        (joinHousehold as jest.Mock).mockRejectedValue(new InviteInvalidError());
        await renderRouter(routes);
        await fireEvent.press(screen.getByText('Tengo un código de invitación'));
        await fireEvent.changeText(screen.getByLabelText('Código de invitación'), CODE);
        await fireEvent.press(screen.getByText('Unirme'));
        expect(
          await screen.findByText('Este código no existe o ya venció. Revisalo o pedí uno nuevo.'),
        ).toBeTruthy();
        expect(screen.getByDisplayValue(CODE)).toBeTruthy();
        await fireEvent.changeText(screen.getByLabelText('Código de invitación'), 'K7P2-9XQ-4M');
        expect(screen.queryByText(/Este código no existe/)).toBeNull();
      });

      it('con el código y sin conexión muestra el error 26; "Reintentar" abre la invitación', async () => {
        firebaseSession(signedInState(account, { hogarActualId: null }));
        (joinHousehold as jest.Mock).mockRejectedValue(new Error('unavailable'));
        await renderRouter(routes);
        await fireEvent.press(screen.getByText('Tengo un código de invitación'));
        await fireEvent.changeText(screen.getByLabelText('Código de invitación'), CODE);
        await fireEvent.press(screen.getByText('Unirme'));
        expect(await screen.findByText('Necesitás internet para unirte.')).toBeTruthy();
        await fireEvent.press(screen.getByText('Reintentar'));
        expect(await screen.findByText('Te invitó Lucía')).toBeTruthy();
        expect(readInvitePreview).toHaveBeenCalledWith(CODE);
      });
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
