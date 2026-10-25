import { useState } from 'react';

import { Button, CenteredDialog, IntroLayout, StatusCard } from '../components';

type Props = {
  onCreate?: () => void;
  onEnterCode?: () => void;
  /** Nombre del hogar del que sacaron a la persona; muestra el aviso `19-sin-hogar-te-sacaron`. */
  removedFrom?: string;
};

/** Sin hogar (`17-sin-hogar`), con el aviso de "te sacaron" encima (`19-sin-hogar-te-sacaron`). */
export function NoHouseholdScreen({ onCreate, onEnterCode, removedFrom }: Props) {
  const [noticeOpen, setNoticeOpen] = useState(!!removedFrom);

  return (
    <>
      <IntroLayout
        heroHeight={430}
        hero={
          <StatusCard
            icon="home"
            tone="dashed"
            title="Todavía sin hogar"
            subtitle="Acá van a aparecer sus listas"
          />
        }
        title="Armá tu hogar o sumate a uno."
        message="Un hogar es el grupo que comparte las listas de compras."
      >
        <Button label="Crear un hogar" icon="plus" large onPress={onCreate} />
        <Button
          label="Tengo un código de invitación"
          variant="secondary"
          large
          onPress={onEnterCode}
        />
      </IntroLayout>

      <CenteredDialog
        visible={noticeOpen}
        icon="homeOff"
        title={`Ya no sos parte de ${removedFrom ?? ''}`}
        message="Ya no ves sus listas. Podés crear un hogar propio o unirte a otro con un código."
        onClose={() => setNoticeOpen(false)}
      >
        <Button label="Continuar" onPress={() => setNoticeOpen(false)} />
      </CenteredDialog>
    </>
  );
}
