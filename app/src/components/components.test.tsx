import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  Avatar,
  BottomSheet,
  Button,
  CenteredDialog,
  ItemGroup,
  ItemRow,
  ListCard,
  QuickAddField,
  StatusPill,
  TextField,
} from '.';

describe('Avatar', () => {
  it('muestra la inicial en mayúscula', async () => {
    await render(<Avatar name="lucía" tone="amber" />);
    expect(screen.getByText('L')).toBeTruthy();
    expect(screen.getByLabelText('lucía')).toBeTruthy();
  });
});

describe('Button', () => {
  it('llama a onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Guardar" onPress={onPress} />);
    await fireEvent.press(screen.getByText('Guardar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no llama a onPress si está deshabilitado', async () => {
    const onPress = jest.fn();
    await render(<Button label="Guardar" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByText('Guardar'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it.each(['primary', 'secondary', 'danger'] as const)(
    'renderiza la variante %s',
    async (variant) => {
      await render(<Button label="Botón" variant={variant} />);
      expect(screen.getByText('Botón')).toBeTruthy();
    },
  );
});

describe('StatusPill', () => {
  it('muestra Sincronizado y Sin conexión', async () => {
    const { rerender } = await render(<StatusPill online />);
    expect(screen.getByText('Sincronizado')).toBeTruthy();
    await rerender(<StatusPill online={false} />);
    expect(screen.getByText('Sin conexión')).toBeTruthy();
  });

  it('llama a onPress', async () => {
    const onPress = jest.fn();
    await render(<StatusPill online onPress={onPress} />);
    await fireEvent.press(screen.getByText('Sincronizado'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ListCard', () => {
  it('muestra nombre y cantidad de pendientes', async () => {
    await render(<ListCard name="Supermercado" pendingCount={7} tone="green" icon="cart" />);
    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('pendientes')).toBeTruthy();
  });

  it('muestra "Al día" sin pendientes', async () => {
    await render(<ListCard name="Ferretería" pendingCount={0} tone="neutral" icon="wrench" />);
    expect(screen.getByText('Al día')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });
});

describe('ItemRow', () => {
  const addedBy = { name: 'Vos', tone: 'green' } as const;

  it('tilda desde el checkbox y abre el detalle desde el nombre', async () => {
    const onToggle = jest.fn();
    const onPress = jest.fn();
    await render(
      <ItemGroup>
        <ItemRow
          name="Leche"
          quantity="×2"
          addedBy={addedBy}
          onToggle={onToggle}
          onPress={onPress}
        />
      </ItemGroup>,
    );
    expect(screen.getByText('×2')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Marcar como comprado'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText('Leche'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('un ítem comprado ofrece volver a pendientes', async () => {
    await render(<ItemRow name="Arroz" done addedBy={addedBy} />);
    expect(screen.getByLabelText('Volver a pendientes')).toBeTruthy();
  });

  it('muestra el reloj solo si hay cambios sin sincronizar', async () => {
    const { rerender } = await render(<ItemRow name="Pilas AA" pendingSync addedBy={addedBy} />);
    expect(screen.getByLabelText('Sin sincronizar')).toBeTruthy();
    await rerender(<ItemRow name="Pilas AA" addedBy={addedBy} />);
    expect(screen.queryByLabelText('Sin sincronizar')).toBeNull();
  });
});

describe('TextField', () => {
  it('muestra la etiqueta y avisa los cambios', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Nombre" onChangeText={onChangeText} />);
    expect(screen.getByText('Nombre')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Panadería');
    expect(onChangeText).toHaveBeenCalledWith('Panadería');
  });
});

describe('QuickAddField', () => {
  it('envía con el botón y con el teclado', async () => {
    const onSubmit = jest.fn();
    const onChangeText = jest.fn();
    await render(<QuickAddField value="Pan" onChangeText={onChangeText} onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByPlaceholderText('Agregar ítem…'), 'Pan dulce');
    expect(onChangeText).toHaveBeenCalledWith('Pan dulce');
    await fireEvent.press(screen.getByLabelText('Agregar a la lista'));
    await fireEvent(screen.getByPlaceholderText('Agregar ítem…'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});

describe('BottomSheet', () => {
  it('muestra título y contenido, y se cierra con la ✕', async () => {
    const onClose = jest.fn();
    await render(
      <BottomSheet visible title="Nueva lista" onClose={onClose}>
        <Button label="Crear lista" />
      </BottomSheet>,
    );
    expect(screen.getByText('Nueva lista')).toBeTruthy();
    expect(screen.getByText('Crear lista')).toBeTruthy();
    await fireEvent.press(screen.getAllByLabelText('Cerrar')[1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no renderiza nada si está oculto', async () => {
    await render(
      <BottomSheet visible={false} title="Nueva lista" onClose={jest.fn()}>
        <Button label="Crear lista" />
      </BottomSheet>,
    );
    expect(screen.queryByText('Nueva lista')).toBeNull();
  });
});

describe('CenteredDialog', () => {
  it('muestra título, texto y botones', async () => {
    await render(
      <CenteredDialog
        visible
        icon="trash"
        title="¿Salir de la lista?"
        message="Se van a borrar los 3 ítems comprados."
        onClose={jest.fn()}
      >
        <Button label="Salir y borrar" />
        <Button label="Quedarme" variant="secondary" />
      </CenteredDialog>,
    );
    expect(screen.getByText('¿Salir de la lista?')).toBeTruthy();
    expect(screen.getByText('Se van a borrar los 3 ítems comprados.')).toBeTruthy();
    expect(screen.getByText('Salir y borrar')).toBeTruthy();
    expect(screen.getByText('Quedarme')).toBeTruthy();
  });

  it('se cierra tocando el velo', async () => {
    const onClose = jest.fn();
    await render(
      <CenteredDialog visible icon="trash" title="Aviso" message="Texto" onClose={onClose}>
        <Button label="Ok" />
      </CenteredDialog>,
    );
    await fireEvent.press(screen.getByLabelText('Cerrar aviso'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
