import { fireEvent, render, screen } from '@testing-library/react-native';

import { HogarScreen } from './HogarScreen';
import { InicioScreen } from './InicioScreen';

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
