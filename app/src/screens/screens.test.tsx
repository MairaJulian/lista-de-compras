import { fireEvent, render, screen } from '@testing-library/react-native';

import { HogarScreen } from './HogarScreen';
import { resetMockStore } from '../mock/store';
import { InicioScreen } from './InicioScreen';
import { ListaScreen } from './ListaScreen';

describe('InicioScreen', () => {
  it('muestra el hogar, las tarjetas con pendientes y "Al día"', async () => {
    await render(<InicioScreen />);
    expect(screen.getByText('Nuestra casa')).toBeTruthy();
    expect(screen.getByText('Listas')).toBeTruthy();
    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('Ferretería')).toBeTruthy();
    expect(screen.getByText('Al día')).toBeTruthy();
    expect(screen.getByText('Nueva lista')).toBeTruthy();
  });

  it('avisa qué lista se tocó y el botón Nueva lista', async () => {
    const onOpenList = jest.fn();
    const onNewList = jest.fn();
    await render(<InicioScreen onOpenList={onOpenList} onNewList={onNewList} />);
    await fireEvent.press(screen.getByText('Supermercado'));
    expect(onOpenList).toHaveBeenCalledWith(expect.objectContaining({ id: 'supermercado' }));
    await fireEvent.press(screen.getByText('Nueva lista'));
    expect(onNewList).toHaveBeenCalledTimes(1);
  });
});

describe('HogarScreen', () => {
  it('muestra el hogar, los miembros con su rol y los botones', async () => {
    await render(<HogarScreen />);
    expect(screen.getByText('Nuestra casa')).toBeTruthy();
    expect(screen.getByText('3 miembros')).toBeTruthy();
    expect(screen.getByText('Creaste el hogar')).toBeTruthy();
    expect(screen.getAllByText('Miembro')).toHaveLength(2);
    expect(screen.getByText('Lucía')).toBeTruthy();
    expect(screen.getByText('Diego')).toBeTruthy();
    expect(screen.getByText('Invitar')).toBeTruthy();
    expect(screen.getByText('Salir del hogar')).toBeTruthy();
    expect(screen.getByLabelText('Tu perfil')).toBeTruthy();
  });

  it('quien creó el hogar ve ⋯ en los demás miembros y no en sí mismo', async () => {
    await render(<HogarScreen />);
    expect(screen.getByLabelText('Opciones de Lucía')).toBeTruthy();
    expect(screen.getByLabelText('Opciones de Diego')).toBeTruthy();
    expect(screen.queryByLabelText('Opciones de Vos')).toBeNull();
  });

  it('avisa perfil, invitar, opciones de miembro y salir', async () => {
    const onOpenProfile = jest.fn();
    const onInvite = jest.fn();
    const onMemberOptions = jest.fn();
    const onLeave = jest.fn();
    await render(
      <HogarScreen
        onOpenProfile={onOpenProfile}
        onInvite={onInvite}
        onMemberOptions={onMemberOptions}
        onLeave={onLeave}
      />,
    );
    await fireEvent.press(screen.getByLabelText('Tu perfil'));
    await fireEvent.press(screen.getByText('Invitar'));
    await fireEvent.press(screen.getByLabelText('Opciones de Lucía'));
    await fireEvent.press(screen.getByText('Salir del hogar'));
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
    expect(onInvite).toHaveBeenCalledTimes(1);
    expect(onMemberOptions).toHaveBeenCalledWith(expect.objectContaining({ id: 'lucia' }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});

describe('ListaScreen', () => {
  beforeEach(() => resetMockStore());

  it('Supermercado: pendientes y comprados con sus contadores', async () => {
    await render(<ListaScreen listId="supermercado" />);
    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByText('Pendientes')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('Comprados')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('×2')).toBeTruthy();
    expect(screen.getByText('1 docena')).toBeTruthy();
    expect(screen.getByText('Sincronizado')).toBeTruthy();
  });

  it('tildar pasa el ítem a Comprados y destildar lo devuelve', async () => {
    await render(<ListaScreen listId="supermercado" />);
    await fireEvent.press(screen.getAllByLabelText('Marcar como comprado')[0]);
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    await fireEvent.press(screen.getAllByLabelText('Volver a pendientes')[0]);
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('agregar escribe arriba de Pendientes y vacía el campo', async () => {
    await render(<ListaScreen listId="supermercado" />);
    await fireEvent.changeText(screen.getByLabelText('Agregar ítem'), 'Sal');
    await fireEvent.press(screen.getByLabelText('Agregar a la lista'));
    expect(screen.getByText('Sal')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByLabelText('Agregar ítem').props.value).toBe('');
  });

  it('sin conexión avisa los cambios sin sincronizar y vuelve a sincronizar', async () => {
    await render(<ListaScreen listId="supermercado" />);
    await fireEvent.press(screen.getByText('Sincronizado'));
    expect(screen.getByText('Sin conexión')).toBeTruthy();
    expect(
      screen.getByText(
        'Los cambios se guardan en tu celular y se sincronizan cuando vuelva la conexión.',
      ),
    ).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Agregar ítem'), 'Pilas AA');
    await fireEvent.press(screen.getByLabelText('Agregar a la lista'));
    await fireEvent.press(screen.getAllByLabelText('Marcar como comprado')[1]);
    expect(
      screen.getByText('2 cambios sin sincronizar. Se enviarán solos cuando vuelva la conexión.'),
    ).toBeTruthy();
    expect(screen.getAllByLabelText('Sin sincronizar')).toHaveLength(2);
    await fireEvent.press(screen.getByText('Sin conexión'));
    expect(screen.getByText('Sincronizado')).toBeTruthy();
    expect(screen.queryByLabelText('Sin sincronizar')).toBeNull();
  });

  it('Ferretería muestra el estado de lista vacía', async () => {
    await render(<ListaScreen listId="ferreteria" />);
    expect(screen.getByText('Esta lista está vacía')).toBeTruthy();
    expect(
      screen.getByText('Escribí arriba lo que falta comprar y se suma para todos en casa.'),
    ).toBeTruthy();
    expect(screen.queryByText('Pendientes')).toBeNull();
  });

  it('Inicio refleja los pendientes después de tildar', async () => {
    await render(<ListaScreen listId="farmacia" />);
    await fireEvent.press(screen.getAllByLabelText('Marcar como comprado')[0]);
    await render(<InicioScreen />);
    expect(screen.getByLabelText('Farmacia, 1 pendientes')).toBeTruthy();
  });

  it('la flecha avisa que se quiere volver', async () => {
    const onBack = jest.fn();
    await render(<ListaScreen listId="supermercado" onBack={onBack} />);
    await fireEvent.press(screen.getByLabelText('Volver a las listas'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
