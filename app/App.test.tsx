import { fireEvent, render, screen } from '@testing-library/react-native';

import App from './App';

jest.mock('./src/dev/FirestorePing', () => ({ FirestorePing: () => null }));
jest.mock('expo-font', () => ({ useFonts: () => [true] }));

describe('App', () => {
  it('abre en Listas y cambia a Hogar con la barra inferior', async () => {
    await render(<App />);
    expect(screen.getByText('Supermercado')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Hogar' }));
    expect(screen.getByText('Nuestra casa', { exact: true })).toBeTruthy();
    expect(screen.getByText('Salir del hogar')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Listas' }));
    expect(screen.getByText('Supermercado')).toBeTruthy();
  });
});
