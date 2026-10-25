import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { HogarScreen } from './HogarScreen';
import { resetMockStore } from '../mock/store';
import { InicioScreen } from './InicioScreen';
import { ListaScreen } from './ListaScreen';

describe('InicioScreen', () => {
  beforeEach(() => resetMockStore());

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

  it('avisa qué lista se tocó', async () => {
    const onOpenList = jest.fn();
    await render(<InicioScreen onOpenList={onOpenList} />);
    await fireEvent.press(screen.getByText('Supermercado'));
    expect(onOpenList).toHaveBeenCalledWith(expect.objectContaining({ id: 'supermercado' }));
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

  it('la flecha avisa que se quiere volver (sin comprados no pide confirmación)', async () => {
    const onBack = jest.fn();
    await render(<ListaScreen listId="ferreteria" onBack={onBack} />);
    await fireEvent.press(screen.getByLabelText('Volver a las listas'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

// Los paneles y avisos se montan con animación: se espera a que termine antes de mirar.
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 600)));

describe('Detalle del ítem', () => {
  beforeEach(() => resetMockStore());

  it('abre con los datos del ítem tocado', async () => {
    await render(<ListaScreen listId="supermercado" />);
    await fireEvent.press(screen.getByText('Leche'));
    expect(screen.getByText('Detalle del ítem')).toBeTruthy();
    expect(screen.getByLabelText('Nombre').props.value).toBe('Leche');
    expect(screen.getByLabelText('Nota').props.value).toBe('La de caja, sin lactosa.');
    expect(screen.getByText('Agregado por')).toBeTruthy();
    expect(screen.getAllByText('Lucía').length).toBeGreaterThan(0);
  });

  it('la cantidad no baja de 1', async () => {
    await render(<ListaScreen listId="supermercado" />);
    await fireEvent.press(screen.getByText('Pan lactal'));
    await fireEvent.press(screen.getByLabelText('Una menos'));
    expect(screen.getByLabelText('Cantidad 1')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Una más'));
    expect(screen.getByLabelText('Cantidad 2')).toBeTruthy();
  });

  it('Guardar actualiza el ítem y cierra el panel', async () => {
    await render(<ListaScreen listId="supermercado" />);
    await fireEvent.press(screen.getByText('Leche'));
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Leche entera');
    await fireEvent.press(screen.getByLabelText('Una más'));
    await fireEvent.press(screen.getByLabelText('Una más'));
    await fireEvent.press(screen.getByText('Guardar'));
    await settle();
    expect(screen.queryByText('Detalle del ítem')).toBeNull();
    expect(screen.getByText('Leche entera')).toBeTruthy();
    expect(screen.getByText('×4')).toBeTruthy();
  });

  it('Eliminar saca el ítem y baja el contador', async () => {
    await render(<ListaScreen listId="supermercado" />);
    await fireEvent.press(screen.getByText('Leche'));
    await fireEvent.press(screen.getByText('Eliminar'));
    await settle();
    expect(screen.queryByText('Detalle del ítem')).toBeNull();
    expect(screen.queryByText('Leche')).toBeNull();
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('cerrar con la ✕ no cambia nada', async () => {
    await render(<ListaScreen listId="supermercado" />);
    await fireEvent.press(screen.getByText('Leche'));
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Otra cosa');
    await fireEvent.press(screen.getAllByLabelText('Cerrar')[1]);
    await settle();
    expect(screen.getByText('Leche')).toBeTruthy();
  });
});

describe('Nueva lista', () => {
  beforeEach(() => resetMockStore());

  it('Crear lista agrega la tarjeta', async () => {
    await render(<InicioScreen />);
    await fireEvent.press(screen.getByText('Nueva lista'));
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Panadería');
    await fireEvent.press(screen.getByLabelText('Ámbar'));
    await fireEvent.press(screen.getByText('Crear lista'));
    await settle();
    expect(screen.getByLabelText('Panadería, al día')).toBeTruthy();
  });

  it('sin nombre no se puede crear', async () => {
    await render(<InicioScreen />);
    await fireEvent.press(screen.getByText('Nueva lista'));
    expect(screen.getByRole('button', { name: 'Crear lista' })).toBeDisabled();
  });
});

describe('Salir de la lista', () => {
  beforeEach(() => resetMockStore());

  it('con comprados, la flecha pide confirmación y Quedarme no sale', async () => {
    const onBack = jest.fn();
    await render(<ListaScreen listId="supermercado" onBack={onBack} />);
    await fireEvent.press(screen.getByLabelText('Volver a las listas'));
    expect(screen.getByText('¿Salir de la lista?')).toBeTruthy();
    expect(
      screen.getByText(
        'Se van a borrar los 3 ítems comprados de Supermercado. Los pendientes se quedan.',
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('Quedarme'));
    await settle();
    expect(onBack).not.toHaveBeenCalled();
    expect(screen.queryByText('¿Salir de la lista?')).toBeNull();
    expect(screen.getByText('Comprados')).toBeTruthy();
  });

  it('Salir y borrar elimina los comprados y vuelve', async () => {
    const onBack = jest.fn();
    await render(<ListaScreen listId="supermercado" onBack={onBack} />);
    await fireEvent.press(screen.getByLabelText('Volver a las listas'));
    await fireEvent.press(screen.getByText('Salir y borrar'));
    expect(onBack).toHaveBeenCalledTimes(1);
    await settle();
    expect(screen.queryByText('Comprados')).toBeNull();
    expect(screen.getByText('7')).toBeTruthy();
  });
});
