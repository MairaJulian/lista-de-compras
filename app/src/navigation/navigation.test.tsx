import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { AppNavigator } from './AppNavigator';
import { NavigationProvider } from './NavigationProvider';

describe('navegación', () => {
  it('marca la pestaña activa', async () => {
    await render(
      <NavigationProvider>
        <AppNavigator />
      </NavigationProvider>,
    );
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Hogar' }));
    expect(screen.getByRole('tab', { name: 'Hogar', selected: true })).toBeTruthy();
  });

  it('atrás en Hogar vuelve a Listas y en Listas deja salir de la app', async () => {
    type Listener = Parameters<typeof BackHandler.addEventListener>[1];
    const listeners: Listener[] = [];
    const add = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, cb) => {
      listeners.push(cb);
      return { remove: () => listeners.splice(listeners.indexOf(cb), 1) };
    });
    const back = () => listeners[listeners.length - 1](undefined as never);

    await render(
      <NavigationProvider initialTab="hogar">
        <AppNavigator />
      </NavigationProvider>,
    );
    let handled: boolean | null | undefined = false;
    await act(async () => {
      handled = back();
    });
    expect(handled).toBe(true);
    expect(screen.getByRole('tab', { name: 'Listas', selected: true })).toBeTruthy();
    await act(async () => {
      handled = back();
    });
    expect(handled).toBe(false);
    add.mockRestore();
  });
});
