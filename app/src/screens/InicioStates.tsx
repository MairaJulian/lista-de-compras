import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Button, Icon, type IconName } from '../components';
import { colors, fontSizes, fonts } from '../theme';

type MessageProps = {
  hero: React.ReactNode;
  title: string;
  message: string;
  children?: React.ReactNode;
};

/** Parte central de Inicio cuando no hay tarjetas: ilustración, título, texto y, si hace falta, un botón. */
function CenteredMessage({ hero, title, message, children }: MessageProps) {
  return (
    <View style={styles.center}>
      {hero}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      {children}
    </View>
  );
}

type TileProps = {
  icon: IconName;
  size: number;
  radius: number;
  iconSize: number;
  background: string;
  color: string;
  style: StyleProp<ViewStyle>;
};

function Tile({ icon, size, radius, iconSize, background, color, style }: TileProps) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: radius, backgroundColor: background },
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={color} />
    </View>
  );
}

/** Inicio de un hogar sin listas (`29-inicio-sin-listas`). */
export function NoListsState() {
  return (
    <CenteredMessage
      hero={
        <View
          style={styles.tiles}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Tile
            icon="leaf"
            size={84}
            radius={26}
            iconSize={38}
            background={colors.amberSoft}
            color={colors.amberText}
            style={{ left: 0, top: 30, transform: [{ rotate: '-8deg' }] }}
          />
          <Tile
            icon="plusSquare"
            size={84}
            radius={26}
            iconSize={38}
            background={colors.blueSoft}
            color={colors.blueText}
            style={{ right: 0, top: 30, transform: [{ rotate: '8deg' }] }}
          />
          <Tile
            icon="cart"
            size={104}
            radius={32}
            iconSize={50}
            background={colors.primarySoft}
            color={colors.primary}
            style={[{ left: 36, top: 0 }, styles.centerTile]}
          />
        </View>
      }
      title="Todavía no hay listas"
      message="Creá la primera, por ejemplo el súper o la verdulería, y empiecen a sumar lo que falta en casa."
    />
  );
}

type LoadErrorProps = { onRetry?: () => void };

/** Falló la lectura de los datos (`32-error-carga`). */
export function LoadErrorState({ onRetry }: LoadErrorProps) {
  return (
    <CenteredMessage
      hero={
        <View style={styles.circle}>
          <Icon name="alertTriangle" size={48} color={colors.amberText} />
        </View>
      }
      title="No pudimos cargar tus datos"
      message="Puede ser la conexión o un problema nuestro. Probá de nuevo."
    >
      <View style={styles.retry}>
        <Button label="Reintentar" icon="refresh" large onPress={onRetry} />
      </View>
    </CenteredMessage>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    paddingHorizontal: 40,
    // Espacio abajo para que quede centrado por encima del botón flotante.
    paddingBottom: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  tiles: { width: 176, height: 128, marginBottom: 12 },
  tile: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerTile: {
    elevation: 6,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  circle: {
    width: 104,
    height: 104,
    marginBottom: 8,
    borderRadius: 52,
    backgroundColor: colors.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: 26,
    lineHeight: 31,
    color: colors.textPrimary,
  },
  message: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  retry: { marginTop: 16 },
});
