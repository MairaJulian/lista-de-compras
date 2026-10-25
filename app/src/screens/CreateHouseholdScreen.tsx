import { useState } from 'react';

import { Button, FormLayout, LargeField } from '../components';

type Props = {
  onBack?: () => void;
  onCreate?: (name: string) => void;
};

/** Crear hogar (`20-crear-hogar`): "Crear hogar" se habilita al haber texto. */
export function CreateHouseholdScreen({ onBack, onCreate }: Props) {
  const [name, setName] = useState('');
  const hasName = name.trim().length > 0;

  return (
    <FormLayout
      headerTitle="Crear hogar"
      onBack={onBack}
      icon="home"
      title="¿Cómo le ponemos a tu hogar?"
      message="Lo van a ver todas las personas que invites."
      footer={
        <Button
          label="Crear hogar"
          large
          disabled={!hasName}
          onPress={() => onCreate?.(name.trim())}
        />
      }
    >
      <LargeField
        label="Nombre del hogar"
        value={name}
        onChangeText={setName}
        placeholder="Por ejemplo: Nuestra casa"
      />
    </FormLayout>
  );
}
