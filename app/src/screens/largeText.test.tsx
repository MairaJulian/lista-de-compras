import { render, screen, within } from '@testing-library/react-native';

import { resetMockStore } from '../mock/store';
import { ListaScreen } from './ListaScreen';

// Con la letra del sistema muy agrandada la cabecera de Lista pasa el indicador de conexión a su
// propia fila, debajo del título, y deja que el título ocupe más de una línea.
jest.mock('../theme/largeText', () => ({
  ...jest.requireActual('../theme/largeText'),
  useLargeText: () => true,
}));

describe('ListaScreen con letra grande', () => {
  beforeEach(() => resetMockStore());

  it('muestra el indicador de conexión y el título completo', async () => {
    await render(<ListaScreen listId="supermercado" />);
    const title = screen.getByRole('header', { name: 'Supermercado' });
    expect(title.props.numberOfLines).toBeGreaterThan(1);
    // El indicador ya no comparte fila con el título: va en una fila aparte.
    expect(within(screen.getByTestId('status-row')).getByText('Sincronizado')).toBeTruthy();
  });
});
