import { render, screen } from '@testing-library/react-native';

import { LoadingScreen } from './LoadingScreen';

describe('LoadingScreen', () => {
  it('sin sesión confirmada muestra solo la marca (como el splash)', async () => {
    await render(<LoadingScreen />);
    expect(screen.getByText('Changuito')).toBeTruthy();
    expect(screen.getByLabelText('Cargando')).toBeTruthy();
    expect(screen.queryByText('Entrando…')).toBeNull();
  });

  it('al entrar (`46-cargando-entrada`) suma el indicador y el texto', async () => {
    await render(<LoadingScreen entering />);
    expect(screen.getByText('Changuito')).toBeTruthy();
    expect(screen.getByText('Entrando…')).toBeTruthy();
    expect(screen.getByText('Estamos buscando tu hogar y tus listas.')).toBeTruthy();
    expect(screen.getByLabelText('Entrando')).toBeTruthy();
  });
});
