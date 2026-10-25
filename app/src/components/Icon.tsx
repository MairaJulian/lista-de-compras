import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ComponentProps } from 'react';

import { colors } from '../theme';

// Una sola librería de íconos para toda la app: MaterialCommunityIcons.
// (react-native-svg no compila en Windows con la ruta actual del repo; ver la PR.)
const glyphs = {
  back: 'chevron-left',
  close: 'close',
  plus: 'plus',
  minus: 'minus',
  check: 'check',
  cart: 'cart-outline',
  leaf: 'leaf',
  plusSquare: 'plus-box-outline',
  wrench: 'wrench-outline',
  cloudCheck: 'cloud-check-outline',
  cloudOff: 'cloud-off-outline',
  clock: 'clock-outline',
  trash: 'trash-can-outline',
  list: 'format-list-bulleted',
  users: 'account-group-outline',
  home: 'home-outline',
  userPlus: 'account-plus-outline',
  dots: 'dots-vertical',
  copy: 'content-copy',
  share: 'share-variant-outline',
  refresh: 'refresh',
  linkOff: 'link-off',
  logout: 'logout',
  userMinus: 'account-minus-outline',
} as const satisfies Record<string, ComponentProps<typeof MaterialCommunityIcons>['name']>;

export type IconName = keyof typeof glyphs;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 24, color = colors.textPrimary }: Props) {
  return <MaterialCommunityIcons name={glyphs[name]} size={size} color={color} />;
}
