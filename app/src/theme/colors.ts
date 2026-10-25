export const colors = {
  background: '#F7F8F3',
  surface: '#FFFFFF',
  textPrimary: '#1C2621',
  textSecondary: '#5B675F',
  border: '#D5DAD0',
  separator: '#EEF1EA',
  tabBarBorder: '#E4E8DF',
  checkboxBorder: '#7C8A82',
  handle: '#C9D0C9',
  primary: '#2E7D57',
  primaryText: '#1F5C3E',
  primarySoft: '#E3F1E8',
  primarySoftStrong: '#CFE8D9',
  amberSoft: '#FCEBCB',
  amberText: '#7A4300',
  amberIcon: '#8A4B00',
  blueSoft: '#DDEBF7',
  blueText: '#1D4E75',
  neutralSoft: '#ECEEE8',
  neutralText: '#3F4A44',
  danger: '#A12D2D',
  dangerSoft: '#FBEAEA',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(28,38,33,0.5)',
  overlayLight: 'rgba(255,255,255,0.7)',
  notificationBackground: '#16241D',
} as const;

export type ColorName = keyof typeof colors;

/** Fondo y texto de cada color de tarjeta de lista (Inicio). */
export const listTones = {
  green: { background: colors.primarySoft, text: colors.primaryText, swatch: '#9ED3B3' },
  amber: { background: colors.amberSoft, text: colors.amberText, swatch: '#F2C26B' },
  blue: { background: colors.blueSoft, text: colors.blueText, swatch: '#9CC4E8' },
  neutral: { background: colors.neutralSoft, text: colors.neutralText, swatch: '#C9D0C9' },
} as const;

export type ListTone = keyof typeof listTones;

/** Colores de avatar (inicial en círculo). */
export const avatarTones = {
  green: { background: colors.primarySoftStrong, text: colors.primaryText },
  amber: { background: '#F8DDAE', text: colors.amberText },
  blue: { background: '#CFE0F2', text: colors.blueText },
} as const;

export type AvatarTone = keyof typeof avatarTones;
