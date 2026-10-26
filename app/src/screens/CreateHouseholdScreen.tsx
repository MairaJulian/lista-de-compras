import { useState } from 'react';

import { Button, FormLayout, LargeField } from '../components';

type Props = {
  onBack?: () => void;
  /** Crea el hogar. Si devuelve `false` o falla se muestra `31-error-crear-hogar`. */
  onCreate?: (name: string) => Promise<boolean | void> | boolean | void;
  /** "Ahora no" del error: vuelve a Sin hogar. */
  onDismiss?: () => void;
};

type Status = 'editing' | 'creating' | 'failed';

/**
 * Crear hogar (`20-crear-hogar`): "Crear hogar" se habilita al haber texto y, mientras se crea,
 * queda en "Creando…". Si falla, la variante `31-error-crear-hogar` conserva lo escrito.
 */
export function CreateHouseholdScreen({ onBack, onCreate, onDismiss }: Props) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status>('editing');
  const hasName = name.trim().length > 0;
  const failed = status === 'failed';
  const creating = status === 'creating';

  const create = async () => {
    setStatus('creating');
    try {
      const created = await onCreate?.(name.trim());
      // Al crearse, la ruta cambia de pantalla: se deja en "Creando…" hasta entonces.
      if (created === false) setStatus('failed');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <FormLayout
      headerTitle="Crear hogar"
      onBack={onBack}
      icon={failed ? 'homeAlert' : 'home'}
      tone={failed ? 'amber' : 'primary'}
      title={failed ? 'No pudimos crear el hogar' : '¿Cómo le ponemos a tu hogar?'}
      message={
        failed
          ? 'Algo salió mal de nuestro lado. Probá de nuevo en un momento.'
          : 'Lo van a ver todas las personas que invites.'
      }
      notice={failed ? 'Tu hogar no se creó. No se perdió nada de lo que escribiste.' : undefined}
      footer={
        failed ? (
          <>
            <Button
              label="Reintentar"
              icon="refresh"
              large
              disabled={!hasName}
              onPress={() => void create()}
            />
            <Button label="Ahora no" variant="text" onPress={onDismiss} />
          </>
        ) : (
          <Button
            label={creating ? 'Creando…' : 'Crear hogar'}
            large
            disabled={!hasName || creating}
            onPress={() => void create()}
          />
        )
      }
    >
      <LargeField
        label="Nombre del hogar"
        value={name}
        onChangeText={setName}
        editable={!creating}
        placeholder="Por ejemplo: Nuestra casa"
      />
    </FormLayout>
  );
}
