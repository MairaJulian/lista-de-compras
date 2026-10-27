import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { resetMockStore } from '../mock/store';
import { CreateHouseholdScreen } from './CreateHouseholdScreen';
import { LinkErrorScreen, LoginErrorScreen, OfflineJoinErrorScreen } from './ErrorScreens';
import { HogarScreen } from './HogarScreen';
import { HouseholdCreatedScreen } from './HouseholdCreatedScreen';
import { JoinWithCodeScreen } from './JoinWithCodeScreen';
import { NoHouseholdScreen } from './NoHouseholdScreen';

describe('Salir del hogar: variantes del aviso', () => {
  beforeEach(() => resetMockStore());

  it('quien creó el hogar ve que el rol pasa a otro miembro', async () => {
    await render(<HogarScreen />);
    await fireEvent.press(screen.getByText('Salir del hogar'));
    expect(
      screen.getByText('Vos creaste el hogar. Si salís, el rol de creador pasa a otro miembro.'),
    ).toBeTruthy();
    expect(screen.getByText('Será la nueva persona a cargo')).toBeTruthy();
  });

  it('la última persona ve que el hogar se archiva y confirma con "Salir y archivar"', async () => {
    const onLeft = jest.fn();
    await render(<HogarScreen onLeft={onLeft} />);
    await fireEvent.press(screen.getByLabelText('Opciones de Lucía'));
    await fireEvent.press(screen.getByText('Quitar del hogar'));
    await fireEvent.press(screen.getByText('Quitar'));
    await fireEvent.press(screen.getByLabelText('Opciones de Diego'));
    await fireEvent.press(screen.getByText('Quitar del hogar'));
    await fireEvent.press(screen.getByText('Quitar'));
    await fireEvent.press(screen.getByText('Salir del hogar'));
    expect(screen.getByText('Sos la última persona del hogar')).toBeTruthy();
    expect(
      screen.getByText(
        'Si salís, Nuestra casa se archiva y no queda nadie con acceso a sus listas.',
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('Salir y archivar'));
    expect(onLeft).toHaveBeenCalledTimes(1);
  });
});

describe('Sin hogar y sus flujos', () => {
  beforeEach(() => resetMockStore());

  it('Sin hogar avisa crear hogar y escribir un código', async () => {
    const onCreate = jest.fn();
    const onEnterCode = jest.fn();
    await render(<NoHouseholdScreen onCreate={onCreate} onEnterCode={onEnterCode} />);
    expect(screen.getByText('Armá tu hogar o sumate a uno.')).toBeTruthy();
    expect(screen.queryByText(/Ya no sos parte/)).toBeNull();
    await fireEvent.press(screen.getByText('Crear un hogar'));
    await fireEvent.press(screen.getByText('Tengo un código de invitación'));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onEnterCode).toHaveBeenCalledTimes(1);
  });

  it('"Te sacaron" muestra el aviso y Continuar lo cierra', async () => {
    await render(<NoHouseholdScreen removedFrom="Nuestra casa" />);
    expect(screen.getByText('Ya no sos parte de Nuestra casa')).toBeTruthy();
    await fireEvent.press(screen.getByText('Continuar'));
    await waitFor(() => expect(screen.queryByText('Ya no sos parte de Nuestra casa')).toBeNull());
  });

  it('Crear hogar se habilita al escribir un nombre y lo entrega sin espacios sobrantes', async () => {
    const onCreate = jest.fn();
    await render(<CreateHouseholdScreen onCreate={onCreate} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Crear hogar' }));
    expect(onCreate).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('Nombre del hogar'), '  Casa nueva ');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear hogar' }));
    expect(onCreate).toHaveBeenCalledWith('Casa nueva');
  });

  it('Unirme con un código se habilita al haber texto; Pegar completa el campo', async () => {
    const onJoin = jest.fn();
    await render(
      <JoinWithCodeScreen onJoin={onJoin} readClipboard={async () => ' K7P2-9XQ-4MN '} />,
    );
    await fireEvent.press(screen.getByText('Unirme'));
    expect(onJoin).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Pegar'));
    expect(screen.getByDisplayValue('K7P2-9XQ-4MN')).toBeTruthy();
    await fireEvent.press(screen.getByText('Unirme'));
    expect(onJoin).toHaveBeenCalledWith('K7P2-9XQ-4MN');
  });

  it('Unirme con un código: pegar un mensaje completo deja solo el código', async () => {
    const message =
      'Sumate a Nuestra casa en Changuito.\nCódigo: K7P2-9XQ-4MN\nEnlace: changuito://unirse/K7P2-9XQ-4MN';
    await render(<JoinWithCodeScreen readClipboard={async () => message} />);
    await fireEvent.press(screen.getByText('Pegar'));
    expect(screen.getByDisplayValue('K7P2-9XQ-4MN')).toBeTruthy();
  });

  it('Unirme con un código: une con el código normalizado y, mientras tanto, queda en "Uniéndome…"', async () => {
    let finish: (result: 'joined') => void = () => {};
    const onJoin = jest.fn(() => new Promise<'joined'>((resolve) => (finish = resolve)));
    await render(<JoinWithCodeScreen onJoin={onJoin} />);
    await fireEvent.changeText(screen.getByLabelText('Código de invitación'), ' k7p2-9xq-4mn ');
    await fireEvent.press(screen.getByText('Unirme'));
    expect(onJoin).toHaveBeenCalledWith('K7P2-9XQ-4MN');
    const joining = screen.getByRole('button', { name: 'Uniéndome…' });
    expect(joining).toBeDisabled();
    await fireEvent.press(joining);
    expect(onJoin).toHaveBeenCalledTimes(1);
    await act(async () => finish('joined'));
    expect(screen.getByRole('button', { name: 'Unirme' })).toBeEnabled();
    expect(screen.queryByText(/Este código no existe/)).toBeNull();
  });

  it('Unirme con un código inválido muestra el error 30 y desaparece al editar', async () => {
    await render(<JoinWithCodeScreen onJoin={async () => 'invalid' as const} />);
    await fireEvent.changeText(screen.getByLabelText('Código de invitación'), 'K7P2-9XQ-4MM');
    await fireEvent.press(screen.getByText('Unirme'));
    expect(
      await screen.findByText('Este código no existe o ya venció. Revisalo o pedí uno nuevo.'),
    ).toBeTruthy();
    expect(screen.getByDisplayValue('K7P2-9XQ-4MM')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Código de invitación'), 'K7P2-9XQ-4M');
    expect(screen.queryByText(/Este código no existe/)).toBeNull();
  });

  it('Hogar creado muestra el hogar y avisa Invitar y Más tarde', async () => {
    const onInvite = jest.fn();
    const onLater = jest.fn();
    await render(<HouseholdCreatedScreen onInvite={onInvite} onLater={onLater} />);
    expect(screen.getByText('¡Listo, ya tenés hogar!')).toBeTruthy();
    await fireEvent.press(screen.getByText('Invitar'));
    await fireEvent.press(screen.getByText('Más tarde'));
    expect(onInvite).toHaveBeenCalledTimes(1);
    expect(onLater).toHaveBeenCalledTimes(1);
  });
});

describe('pantallas de error', () => {
  it('enlace inválido', async () => {
    const onDismiss = jest.fn();
    const onEnterCode = jest.fn();
    await render(<LinkErrorScreen onDismiss={onDismiss} onEnterCode={onEnterCode} />);
    expect(screen.getByText('Este enlace ya no sirve.')).toBeTruthy();
    expect(screen.getByText('Pedile otro enlace a quien te invitó.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Entendido'));
    await fireEvent.press(screen.getByText('Tengo un código'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onEnterCode).toHaveBeenCalledTimes(1);
  });

  it('inicio de sesión', async () => {
    const onRetry = jest.fn();
    await render(<LoginErrorScreen onRetry={onRetry} />);
    expect(screen.getByText('No pudimos entrar')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('sin conexión al unirse', async () => {
    const onRetry = jest.fn();
    const onDismiss = jest.fn();
    await render(<OfflineJoinErrorScreen onRetry={onRetry} onDismiss={onDismiss} />);
    expect(screen.getByText('Necesitás internet para unirte.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    await fireEvent.press(screen.getByText('Ahora no'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
