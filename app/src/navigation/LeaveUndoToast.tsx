import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UndoToast } from '../components';
import { dismissLeaveUndo, LEAVE_UNDO_MS, undoLeave, useLeaveUndo } from '../data/leaveUndoStore';
import { heights } from '../theme';

/**
 * Aviso "Ítems borrados · Deshacer" que queda en Inicio después de salir de una lista y borrar sus
 * comprados. Es el aviso mínimo de la Etapa 4 (no hay diseño propio); se apoya sobre la barra de
 * pestañas.
 */
export function LeaveUndoToast() {
  const undo = useLeaveUndo();
  const { bottom } = useSafeAreaInsets();
  if (!undo) return null;
  return (
    <UndoToast
      key={undo.token}
      message="Ítems borrados"
      actionLabel="Deshacer"
      duration={LEAVE_UNDO_MS}
      bottomInset={heights.tabBar + bottom}
      onAction={undoLeave}
      onTimeout={dismissLeaveUndo}
    />
  );
}
