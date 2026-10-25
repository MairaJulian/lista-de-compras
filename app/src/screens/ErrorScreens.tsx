import { Button, IntroLayout, StatusCard } from '../components';

type LinkErrorProps = {
  onDismiss?: () => void;
  onEnterCode?: () => void;
};

/** Enlace de invitación vencido, desactivado o inválido (`24-error-enlace-invalido`). */
export function LinkErrorScreen({ onDismiss, onEnterCode }: LinkErrorProps) {
  return (
    <IntroLayout
      heroHeight={430}
      hero={
        <StatusCard
          icon="linkOff"
          tone="amber"
          title="Enlace inválido"
          subtitle="Venció, lo desactivaron o no existe"
        />
      }
      title="Este enlace ya no sirve."
      message="Pedile otro enlace a quien te invitó."
    >
      <Button label="Entendido" large onPress={onDismiss} />
      <Button label="Tengo un código" variant="text" onPress={onEnterCode} />
    </IntroLayout>
  );
}

type RetryProps = {
  onRetry?: () => void;
};

/** Falló el inicio de sesión con Google (`25-error-inicio-sesion`). */
export function LoginErrorScreen({ onRetry }: RetryProps) {
  return (
    <IntroLayout
      heroHeight={430}
      hero={
        <StatusCard
          icon="alertCircle"
          tone="danger"
          title="No pudimos entrar"
          subtitle="Falló el inicio de sesión con Google"
        />
      }
      title="Algo salió mal."
      message="Revisá tu conexión y probá de nuevo."
    >
      <Button label="Reintentar" icon="refresh" large onPress={onRetry} />
    </IntroLayout>
  );
}

type OfflineProps = RetryProps & {
  onDismiss?: () => void;
};

/** Unirse sin internet (`26-error-sin-conexion-unirse`). */
export function OfflineJoinErrorScreen({ onRetry, onDismiss }: OfflineProps) {
  return (
    <IntroLayout
      heroHeight={430}
      hero={
        <StatusCard
          icon="cloudOff"
          tone="amber"
          title="Sin conexión"
          subtitle="No pudimos llegar al hogar"
        />
      }
      title="Necesitás internet para unirte."
      message="Conectate a una red y probá de nuevo."
    >
      <Button label="Reintentar" icon="refresh" large onPress={onRetry} />
      <Button label="Ahora no" variant="text" onPress={onDismiss} />
    </IntroLayout>
  );
}
