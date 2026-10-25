import { fireEvent, render, screen } from '@testing-library/react-native';

import { ComponentsScreen } from './ComponentsScreen';

describe('ComponentsScreen', () => {
  it('muestra todos los componentes juntos', async () => {
    await render(<ComponentsScreen />);
    expect(screen.getByText('Componentes')).toBeTruthy();
    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByText('Sincronizado')).toBeTruthy();
    expect(screen.getByText('Pilas AA')).toBeTruthy();
    expect(screen.getByText('Eliminar')).toBeTruthy();
  });

  it('alterna el indicador de conexión', async () => {
    await render(<ComponentsScreen />);
    await fireEvent.press(screen.getByText('Sincronizado'));
    expect(screen.getByText('Sin conexión')).toBeTruthy();
  });

  it('abre el panel y el aviso', async () => {
    await render(<ComponentsScreen />);
    await fireEvent.press(screen.getByText('Abrir panel'));
    expect(screen.getByLabelText('Nueva lista')).toBeTruthy();
    await fireEvent.press(screen.getByText('Abrir aviso'));
    expect(screen.getByText('¿Salir de la lista?')).toBeTruthy();
  });
});
