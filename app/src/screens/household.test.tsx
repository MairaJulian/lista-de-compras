import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { resetMockStore } from '../mock/store';
import { HogarScreen } from './HogarScreen';
import { InviteScreen } from './InviteScreen';
import { JoinScreen } from './JoinScreen';
import { ProfileScreen } from './ProfileScreen';
import { WelcomeScreen } from './WelcomeScreen';

describe('HogarScreen: perfil, invitar, opciones de miembro y salir', () => {
  beforeEach(() => resetMockStore());

  it('avisa perfil e invitar', async () => {
    const onOpenProfile = jest.fn();
    const onInvite = jest.fn();
    await render(<HogarScreen onOpenProfile={onOpenProfile} onInvite={onInvite} />);
    await fireEvent.press(screen.getByLabelText('Tu perfil'));
    await fireEvent.press(screen.getByText('Invitar'));
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it('⋯ abre las opciones del miembro y Cancelar las cierra sin cambios', async () => {
    await render(<HogarScreen />);
    await fireEvent.press(screen.getByLabelText('Opciones de Lucía'));
    expect(screen.getByText('Quitar del hogar')).toBeTruthy();
    expect(screen.getByText(/Lucía dejará de ver las listas de Nuestra casa\./)).toBeTruthy();
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(screen.getByText('3 miembros')).toBeTruthy();
  });

  it('quitar a un miembro pide confirmación y actualiza los miembros', async () => {
    await render(<HogarScreen />);
    await fireEvent.press(screen.getByLabelText('Opciones de Lucía'));
    await fireEvent.press(screen.getByText('Quitar del hogar'));
    expect(screen.getByText('¿Quitar a Lucía del hogar?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Quitar'));
    expect(screen.getByText('2 miembros')).toBeTruthy();
    // El panel de opciones sale con animación: se espera a que se cierre.
    await waitFor(() => expect(screen.queryByLabelText('Opciones de Lucía')).toBeNull());
  });

  it('Cancelar en el aviso de quitar no quita a nadie', async () => {
    await render(<HogarScreen />);
    await fireEvent.press(screen.getByLabelText('Opciones de Diego'));
    await fireEvent.press(screen.getByText('Quitar del hogar'));
    await fireEvent.press(screen.getAllByText('Cancelar').at(-1)!);
    expect(screen.getByText('3 miembros')).toBeTruthy();
  });

  it('Salir del hogar pide confirmación y avisa solo al confirmar', async () => {
    const onLeft = jest.fn();
    await render(<HogarScreen onLeft={onLeft} />);
    await fireEvent.press(screen.getByText('Salir del hogar'));
    expect(screen.getByText('¿Salir de Nuestra casa?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(onLeft).not.toHaveBeenCalled();
    await fireEvent.press(screen.getAllByText('Salir del hogar')[0]);
    await fireEvent.press(screen.getAllByText('Salir del hogar')[1]);
    expect(onLeft).toHaveBeenCalledTimes(1);
  });
});

describe('WelcomeScreen y JoinScreen', () => {
  beforeEach(() => resetMockStore());

  it('Bienvenida muestra la presentación y avisa "Entrar con Google"', async () => {
    const onSignIn = jest.fn();
    await render(<WelcomeScreen onSignIn={onSignIn} />);
    expect(screen.getByText('Changuito')).toBeTruthy();
    expect(screen.getByText('Las compras de casa, entre todos.')).toBeTruthy();
    expect(screen.getByText('Pan lactal')).toBeTruthy();
    await fireEvent.press(screen.getByText('Entrar con Google'));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('Unirse muestra el hogar y avisa "Entrar y unirme" y "Ahora no"', async () => {
    const onJoin = jest.fn();
    const onDecline = jest.fn();
    await render(
      <JoinScreen
        householdName="Nuestra casa"
        detail="3 miembros · 4 listas"
        onJoin={onJoin}
        onDecline={onDecline}
      />,
    );
    expect(screen.getByText('Te invitaron a unirte al hogar.')).toBeTruthy();
    expect(screen.getByText('Nuestra casa')).toBeTruthy();
    expect(screen.getByText('3 miembros · 4 listas')).toBeTruthy();
    await fireEvent.press(screen.getByText('Entrar y unirme'));
    await fireEvent.press(screen.getByText('Ahora no'));
    expect(onJoin).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});

describe('JoinScreen con la sesión abierta', () => {
  it('muestra quién invitó y el botón es "Unirme", sin "Entrar con Google"', async () => {
    const onJoin = jest.fn();
    await render(
      <JoinScreen householdName="Nuestra casa" detail="Te invitó Maira" signedIn onJoin={onJoin} />,
    );
    expect(screen.getByText('Te invitó Maira')).toBeTruthy();
    expect(screen.queryByText('Entrar y unirme')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Unirme' }));
    expect(onJoin).toHaveBeenCalledTimes(1);
  });

  it('mientras se une queda en "Uniéndome…" y no se puede tocar de nuevo', async () => {
    const onJoin = jest.fn();
    await render(<JoinScreen householdName="Nuestra casa" signedIn joining onJoin={onJoin} />);
    const button = screen.getByRole('button', { name: 'Uniéndome…' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onJoin).not.toHaveBeenCalled();
  });
});

describe('ProfileScreen', () => {
  it('muestra la cuenta y el hogar, y avisa volver y cerrar sesión', async () => {
    const onBack = jest.fn();
    const onSignOut = jest.fn();
    await render(<ProfileScreen onBack={onBack} onSignOut={onSignOut} />);
    expect(screen.getByText('Perfil')).toBeTruthy();
    expect(screen.getByText('Vos')).toBeTruthy();
    expect(screen.getByText('[cuenta de Google]')).toBeTruthy();
    expect(screen.getByText('Nuestra casa')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Volver a Hogar'));
    await fireEvent.press(screen.getByText('Cerrar sesión'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});

describe('InviteScreen', () => {
  beforeEach(() => resetMockStore());

  it('muestra enlace, código y vencimiento', async () => {
    await render(<InviteScreen />);
    expect(screen.getByText('Sumá a alguien a Nuestra casa')).toBeTruthy();
    expect(screen.getByText('changuito://unirse/K7P2-9XQ-4MN')).toBeTruthy();
    expect(screen.getByText('K7P2-9XQ-4MN')).toBeTruthy();
    expect(screen.getByText('Vence en 47 h')).toBeTruthy();
  });

  it('Copiar cambia a Copiado solo en lo que se tocó y copia el código', async () => {
    const onCopyText = jest.fn(async () => {});
    await render(<InviteScreen onCopyText={onCopyText} />);
    await fireEvent.press(screen.getByLabelText('Copiar código'));
    expect(screen.getByLabelText('Copiado código')).toBeTruthy();
    expect(screen.getByLabelText('Copiar enlace')).toBeTruthy();
    expect(onCopyText).toHaveBeenCalledWith('K7P2-9XQ-4MN');
  });

  it('Copiar el enlace copia el enlace completo', async () => {
    const onCopyText = jest.fn(async () => {});
    await render(<InviteScreen onCopyText={onCopyText} />);
    await fireEvent.press(screen.getByLabelText('Copiar enlace'));
    expect(onCopyText).toHaveBeenCalledWith('changuito://unirse/K7P2-9XQ-4MN');
  });

  it('Compartir enlace pasa el código y el enlace al menú de compartir', async () => {
    const onShare = jest.fn();
    await render(<InviteScreen onShare={onShare} />);
    await fireEvent.press(screen.getByText('Compartir enlace'));
    expect(onShare).toHaveBeenCalledWith(expect.stringContaining('Código: K7P2-9XQ-4MN'));
    expect(onShare).toHaveBeenCalledWith(
      expect.stringContaining('Enlace: changuito://unirse/K7P2-9XQ-4MN'),
    );
  });

  it('Generar enlace nuevo cambia el código y el vencimiento', async () => {
    await render(<InviteScreen />);
    await fireEvent.press(screen.getByText('Generar enlace nuevo'));
    expect(screen.getByText('R4WD-3ZT-8HC')).toBeTruthy();
    expect(screen.getByText('Vence en 48 h')).toBeTruthy();
  });

  it('Desactivar pide confirmación; Cancelar lo deja activo', async () => {
    await render(<InviteScreen />);
    await fireEvent.press(screen.getByText('Desactivar enlace'));
    expect(screen.getByText('¿Desactivar el enlace?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(screen.getByText('K7P2-9XQ-4MN')).toBeTruthy();
  });

  it('Desactivar muestra "El enlace ya no está activo" y Generar lo reactiva', async () => {
    await render(<InviteScreen />);
    await fireEvent.press(screen.getByText('Desactivar enlace'));
    await fireEvent.press(screen.getByText('Desactivar'));
    expect(screen.getByText('El enlace ya no está activo')).toBeTruthy();
    expect(screen.queryByText('K7P2-9XQ-4MN')).toBeNull();
    await fireEvent.press(screen.getByText('Generar enlace nuevo'));
    expect(screen.getByText('Sumá a alguien a Nuestra casa')).toBeTruthy();
    expect(screen.getByText('R4WD-3ZT-8HC')).toBeTruthy();
  });
});
