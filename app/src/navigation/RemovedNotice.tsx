import { Button, CenteredDialog } from '../components';
import { dismissRemovedNotice, useRemovedNotice } from '../data/removedNoticeStore';

/**
 * `19-sin-hogar-te-sacaron` para quien conserva otros grupos: el mismo aviso, sobre Inicio del grupo
 * al que pasó. Se muestra una sola vez, hasta tocar "Continuar".
 */
export function RemovedNotice() {
  const notice = useRemovedNotice();
  return (
    <CenteredDialog
      visible={notice.visible}
      icon="homeOff"
      title={`Ya no sos parte de ${notice.groupName}`}
      message="Ya no ves sus listas. Seguís en tus otros grupos: te pasamos a uno de ellos."
      onClose={dismissRemovedNotice}
    >
      <Button label="Continuar" onPress={dismissRemovedNotice} />
    </CenteredDialog>
  );
}
