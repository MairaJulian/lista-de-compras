/** Radios, alturas y espacios de DISENO.md (en dp). */
export const radii = {
  card: 24,
  group: 20,
  quickAdd: 26,
  pill: 999,
  panel: 28,
  dialog: 28,
  fab: 18,
  field: 14,
  notice: 14,
  handle: 2,
} as const;

export const heights = {
  touchTarget: 44,
  button: 52,
  buttonLarge: 56,
  field: 52,
  card: 172,
  rowPending: 56,
  rowDone: 52,
  /** Fila con un cambio que no se guardó: lleva una segunda línea con el motivo. */
  rowError: 72,
  tabBar: 80,
  fab: 56,
  statusPill: 44,
  panelHeader: 48,
} as const;

export const sizes = {
  avatar: 28,
  avatarLarge: 36,
  avatarMember: 44,
  checkbox: 24,
  handleWidth: 36,
  handleHeight: 4,
  tabIndicatorWidth: 64,
  tabIndicatorHeight: 32,
  swatch: 48,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

export const motion = {
  panelDuration: 350,
  overlayDuration: 250,
  dialogDuration: 250,
  dialogStartScale: 0.94,
} as const;
