import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { CreateHouseholdScreen } from './CreateHouseholdScreen';

async function typeName(name: string) {
  await fireEvent.changeText(screen.getByLabelText('Nombre del hogar'), name);
}

describe('Crear hogar: carga y error', () => {
  it('mientras se crea queda en "Creando…", sin poder tocar de nuevo', async () => {
    const onCreate = jest.fn(() => new Promise<boolean>(() => {}));
    await render(<CreateHouseholdScreen onCreate={onCreate} />);
    await typeName('Casa nueva');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear hogar' }));

    const creating = screen.getByRole('button', { name: 'Creando…' });
    expect(creating).toBeDisabled();
    await fireEvent.press(creating);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['rechaza', () => Promise.reject(new Error('unavailable'))],
    ['devuelve false', () => Promise.resolve(false)],
  ])('si no se pudo crear (%s) muestra el error y conserva el nombre', async (_case, failure) => {
    await render(<CreateHouseholdScreen onCreate={failure} />);
    await typeName('Casa nueva');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear hogar' }));

    expect(await screen.findByText('No pudimos crear el hogar')).toBeTruthy();
    expect(
      screen.getByText('Tu hogar no se creó. No se perdió nada de lo que escribiste.'),
    ).toBeTruthy();
    expect(screen.getByDisplayValue('Casa nueva')).toBeTruthy();
  });

  it('"Reintentar" vuelve a intentarlo con el mismo nombre', async () => {
    const onCreate = jest.fn().mockRejectedValueOnce(new Error('unavailable'));
    onCreate.mockResolvedValue(true);
    await render(<CreateHouseholdScreen onCreate={onCreate} />);
    await typeName('Casa nueva');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear hogar' }));
    await fireEvent.press(await screen.findByText('Reintentar'));

    expect(onCreate).toHaveBeenCalledTimes(2);
    expect(onCreate).toHaveBeenLastCalledWith('Casa nueva');
    await waitFor(() => expect(screen.queryByText('No pudimos crear el hogar')).toBeNull());
  });

  it('"Reintentar" se deshabilita si se borra el nombre, y "Ahora no" sale', async () => {
    const onDismiss = jest.fn();
    await render(
      <CreateHouseholdScreen onCreate={() => Promise.resolve(false)} onDismiss={onDismiss} />,
    );
    await typeName('Casa nueva');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear hogar' }));
    await screen.findByText('No pudimos crear el hogar');

    await typeName('  ');
    expect(screen.getByText('Reintentar')).toBeDisabled();
    await fireEvent.press(screen.getByText('Ahora no'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
