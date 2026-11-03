import { StyleSheet, View } from 'react-native';

type Props = { children: React.ReactNode };

/**
 * Botones en fila que, si los textos no entran juntos (letra grande del sistema), pasan a quedar
 * uno debajo del otro, cada uno a todo el ancho. Los `Button` van con `grow` (su proporción del
 * espacio sobrante): miden lo que mide su texto y no se achican, así que ningún texto se parte en
 * dos líneas para que entren en la fila.
 */
export function ButtonRow({ children }: Props) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
