import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { resetMockStore } from '../mock/store';
import { HogarScreen } from '../screens/HogarScreen';
import { EditHouseholdSheet } from './EditHouseholdSheet';

const field = () => screen.getByLabelText('Nuevo nombre');
const save = () => screen.getByRole('button', { name: /Guardar/ });

describe('EditHouseholdSheet', () => {
  it('muestra el nombre actual y el campo arranca con él', async () => {
    await render(
      <EditHouseholdSheet visible name="Nuestra casa" onClose={jest.fn()} onSave={jest.fn()} />,
    );
    expect(screen.getByText('Nombre del hogar')).toBeTruthy();
    expect(screen.getByText('Nuestra casa')).toBeTruthy();
    expect(screen.getByDisplayValue('Nuestra casa')).toBeTruthy();
  });

  it('Guardar se deshabilita si el nombre queda vacío', async () => {
    const onSave = jest.fn();
    await render(
      <EditHouseholdSheet visible name="Nuestra casa" onClose={jest.fn()} onSave={onSave} />,
    );
    await fireEvent.changeText(field(), '   ');
    expect(save()).toBeDisabled();
    await fireEvent.press(save());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('guarda y cierra; mientras guarda no se puede tocar de nuevo', async () => {
    let finish: (ok: boolean) => void = () => {};
    const onSave = jest.fn(() => new Promise<boolean>((resolve) => (finish = resolve)));
    const onClose = jest.fn();
    await render(<EditHouseholdSheet visible name="Casa" onClose={onClose} onSave={onSave} />);
    await fireEvent.changeText(field(), 'Casa nueva');
    await fireEvent.press(save());
    expect(onSave).toHaveBeenCalledWith('Casa nueva');
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
    finish(true);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it.each([
    ['rechaza', () => Promise.reject(new Error('unavailable'))],
    ['devuelve false', () => Promise.resolve(false)],
  ])(
    'si no se pudo guardar (%s) avisa, conserva lo escrito y deja reintentar',
    async (_c, fail) => {
      const onSave = jest.fn().mockImplementationOnce(fail).mockResolvedValue(true);
      const onClose = jest.fn();
      await render(<EditHouseholdSheet visible name="Casa" onClose={onClose} onSave={onSave} />);
      await fireEvent.changeText(field(), 'Casa nueva');
      await fireEvent.press(save());
      expect(await screen.findByText(/No pudimos guardar el nombre/)).toBeTruthy();
      expect(screen.getByDisplayValue('Casa nueva')).toBeTruthy();
      expect(onClose).not.toHaveBeenCalled();
      await fireEvent.press(save());
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(onSave).toHaveBeenCalledTimes(2);
    },
  );

  it('Cancelar cierra sin guardar', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    await render(<EditHouseholdSheet visible name="Casa" onClose={onClose} onSave={onSave} />);
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('HogarScreen: editar el nombre (datos de ejemplo)', () => {
  beforeEach(() => resetMockStore());

  it('el lápiz abre el panel y el nombre nuevo se ve en Hogar', async () => {
    await render(<HogarScreen />);
    await fireEvent.press(screen.getByLabelText('Editar el nombre del hogar'));
    await fireEvent.changeText(field(), 'Casa del lago');
    await fireEvent.press(save());
    await waitFor(() => expect(screen.queryByText('Nombre del hogar')).toBeNull());
    expect(screen.getByText('Casa del lago')).toBeTruthy();
    expect(screen.queryByText('Nuestra casa')).toBeNull();
  });
});
