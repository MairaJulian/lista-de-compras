import { render, screen } from '@testing-library/react-native';

import App from './App';

jest.mock('expo-font', () => ({ useFonts: () => [true] }));

describe('App', () => {
  it('muestra el nombre de la app', async () => {
    await render(<App />);
    expect(screen.getByText('Changuito')).toBeTruthy();
  });
});
