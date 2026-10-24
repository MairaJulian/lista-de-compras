# Changuito · Diseño de la app (lista de compras compartida)

> Nombre "Changuito" es provisorio. Todo lo de esta carpeta es el diseño de referencia para programar la app. Empezá leyendo este archivo.

## Qué es

App de lista de compras compartida para el hogar: 3 adultos de la misma casa, cada uno con su cuenta, editan las mismas listas y todos ven los cambios.

## Contenido de esta carpeta

- `DISENO.md`: este documento (decisiones, estilo, pantallas, flujos).
- `pantallas/`: una imagen PNG por pantalla (780 × 1688, el doble del tamaño de diseño) más el PDF original `Changuito-pantallas.pdf`. El número del archivo sigue el orden de la tabla de pantallas de abajo:
  `01-bienvenida`, `02-invitacion-recibida`, `03-inicio`, `04-nueva-lista`, `05-lista`, `06-lista-vacia`, `07-lista-sin-conexion`, `08-salir-de-la-lista`, `09-notificacion`, `10-detalle-item`, `11-hogar`, `12-invitar`, `13-opciones-miembro`, `14-confirmar-quitar`, `15-confirmar-salir`, `16-perfil`.
  Ojo: en `10-detalle-item` la cantidad se ve en 3 porque se tocó "+" antes de exportar; el valor de diseño inicial es 2. Las barras de desplazamiento visibles en `05-lista` son un detalle de la exportación, no parte del diseño.
- `referencia-html/`: el código fuente de cada pantalla (`*.dc.html`). Sirve **solo para copiar valores exactos** (colores, tamaños, textos, márgenes). No es código de la app y no se ejecuta suelto (depende de un `support.js` que no está acá).

## Decisiones de producto (ya tomadas)

- Solo **Android** por ahora; intención de publicarla en Play Store más adelante.
- Login **solo con Google**. Cada persona con su propia cuenta.
- Un **hogar** agrupa a los miembros; el hogar tiene **varias listas** (Supermercado, Verdulería, etc.).
- Actualización **en tiempo real** para todos los miembros.
- **Notificación** a los demás si no tienen la lista abierta, **solo cuando agregan o borran ítems**.
- **Funciona sin conexión** (importante): los cambios se guardan en el celular y se sincronizan al volver la conexión. Si hay conflicto, **gana el último cambio**.
- Se quiere saber **quién agregó / tildó** cada ítem (avatar con inicial en cada fila).
- Los ítems **tildados (comprados) se borran al salir de la lista** (con un aviso de confirmación).
- **Cualquiera puede salir del hogar**; **solo quien creó el hogar puede sacar a otros miembros**.
- Sin decidir todavía: tecnología/stack de la app y del backend.

## Estilo visual

Simple, limpio y amigable. Fondo claro verdoso, un verde fresco como color principal, tarjetas suaves de colores pastel, esquinas muy redondeadas.

### Formato
- Frame de celular: **390 × 844** px (dp equivalentes). No se dibujó barra de estado ni teclado: los pone el sistema.
- Áreas táctiles de **al menos 44 px**.

### Tipografías (Google Fonts)
- **Nunito** 700/800: títulos, nombres de lista, números, iniciales de avatar.
- **DM Sans** 400/500/700: texto general, botones, etiquetas.
- Tamaños usados: título de pantalla 34 (Inicio/Hogar) o 24 (pantallas internas); título de aviso 24; cuerpo 16–17; secundario 13–15.

### Colores
| Uso | Valor |
|---|---|
| Fondo de pantalla | `#F7F8F3` |
| Superficie (tarjetas, filas, paneles) | `#FFFFFF` |
| Texto principal | `#1C2621` |
| Texto secundario | `#5B675F` |
| Borde de campos / botones secundarios | `#D5DAD0` |
| Separador de filas (hairline) | `#EEF1EA` / `#E4E8DF` (borde de la barra inferior) |
| Borde de checkbox sin tildar | `#7C8A82` |
| **Verde principal** (botones, FAB, check) | `#2E7D57` (texto blanco encima) |
| Verde texto sobre fondo suave | `#1F5C3E` |
| Verde suave (pill "Sincronizado", fondos) | `#E3F1E8`, indicador de pestaña `#CFE8D9` |
| Ámbar suave (sin conexión, tarjeta) | fondo `#FCEBCB`, texto `#7A4300` (ícono de reloj `#8A4B00`) |
| Azul suave (tarjeta) | fondo `#DDEBF7`, texto `#1D4E75` |
| Neutro (tarjeta) | fondo `#ECEEE8`, texto `#3F4A44` |
| Peligro (quitar / salir / cerrar sesión) | texto o botón `#A12D2D`, fondo suave `#FBEAEA` |
| Velo detrás de paneles y avisos | `rgba(28,38,33,0.5)` |
| Fondo de la pantalla de notificaciones | `#16241D` |

### Avatares (inicial en círculo)
- Vos: fondo `#CFE8D9`, letra `#1F5C3E`
- Lucía: fondo `#F8DDAE`, letra `#7A4300`
- Diego: fondo `#CFE0F2`, letra `#1D4E75`
(Nombres de ejemplo. En la app real el color debería asignarse por miembro.)

### Formas
- Tarjetas de lista (Inicio): radio 24, alto 172.
- Grupos de filas: radio 20, filas de 56 (pendientes) / 52 (comprados) separadas por 1 px.
- Campo de agregar rápido: radio 26, alto 52, con botón circular verde de 52.
- Botones principales: alto 52–56, radio completo (pill), texto 16–17 en negrita.
- Paneles inferiores: radio superior 28, manija de 36×4, animación de subida ~0.35 s.
- Avisos (diálogos) centrados: radio 28, aparecen con leve escala + fade.
- Barra inferior: alto 80, 2 pestañas (Listas / Hogar), indicador pill 64×32.
- FAB extendido "Nueva lista": alto 56, radio 18.

## Pantallas y navegación

| # | Archivo | Pantalla | Se llega desde → lleva a |
|---|---|---|---|
| 1 | `Main` | Bienvenida con "Entrar con Google" | → 2 Inicio |
| 1b | `Unirse` | Lo que ve la persona invitada al abrir el enlace ("Te invitaron a unirte al hogar") | Se abre desde el enlace de invitación (no hay pantalla previa) → 2 Inicio / "Ahora no" → 1 |
| 2 | `Inicio` | Tarjetas de listas del hogar (nombre + cantidad de pendientes), FAB "Nueva lista", barra inferior | 1 → tarjeta Supermercado → 3; tarjeta Ferretería → 3b; FAB → 2b; pestaña Hogar → 5 |
| 2b | `NuevaLista` | Panel inferior: nombre + color (4 opciones) + "Crear lista" | 2 → vuelve a 2 |
| 3 | `Lista` | Campo de agregar rápido arriba, **Pendientes**, **Comprados** (tachados) al final, indicador **Sincronizado / Sin conexión** | 2 → tocar ítem → 4; flecha atrás → 3d |
| 3b | `ListaVacia` | Estado vacío ("Esta lista está vacía") | 2 (tarjeta Ferretería) |
| 3c | `ListaSinConexion` | Estado sin conexión: pill ámbar, aviso "2 cambios sin sincronizar", ítems con reloj | Variante de 3 (el indicador de 3 alterna entre ambos estados) |
| 3d | `SalirLista` | Aviso: "¿Salir de la lista? Se van a borrar los N ítems comprados" | 3 → "Salir y borrar" → 2 / "Quedarme" → 3 |
| 3e | `Notificacion` | Notificaciones de Android: "Lucía agregó 2 ítems", "Diego borró un ítem" | Tocar → 3 |
| 4 | `Detalle` | Panel que sube desde abajo: nombre, cantidad (− / +), nota, "Agregado por", Guardar / Eliminar | 3 → vuelve a 3 |
| 5 | `Hogar` | Nombre del hogar, miembros con rol, botón **Invitar**, "Salir del hogar", avatar de perfil arriba a la derecha | pestaña Hogar de 2 |
| 5b | `Invitar` | Explicación + enlace de invitación + "Copiar" + "Compartir enlace" | 5 → "Invitar" |
| 5c | `MiembroOpciones` | Panel inferior de un miembro con "Quitar del hogar" (solo lo ve quien creó el hogar) | 5 → botón ⋯ |
| 5d | `ConfirmarQuitar` | Aviso "¿Quitar a Lucía del hogar?" | 5c → "Quitar" / "Cancelar" → 5 |
| 5e | `ConfirmarSalir` | Aviso "¿Salir de Nuestra casa?" | 5 → "Salir del hogar" → 1 |
| 6 | `Perfil` | Avatar, nombre, cuenta de Google, hogar actual, "Cerrar sesión" | 5 (avatar) → "Cerrar sesión" → 1 |

## Comportamientos que muestra el prototipo

- **Lista**: tildar un ítem lo pasa a Comprados (tachado, gris); destildar lo devuelve a Pendientes. Agregar escribe arriba de Pendientes. Cada fila tiene el avatar de quien lo agregó/tildó. El contador de Pendientes / Comprados se actualiza.
- **Indicador de conexión**: "Sincronizado" (verde) o "Sin conexión" (ámbar) arriba a la derecha; sin conexión muestra un aviso: "Los cambios se guardan en tu celular y se sincronizan cuando vuelva la conexión."
- **Detalle**: cantidad mínima 1; nombre y nota editables.
- **Nueva lista**: se elige 1 color de 4 (`#9ED3B3`, `#F2C26B`, `#9CC4E8`, `#C9D0C9`).

## Textos placeholder y cosas que son de ejemplo

- Nombre de app "Changuito", hogar "Nuestra casa", miembros "Vos / Lucía / Diego": ejemplos.
- `[enlace de invitación]` y `[cuenta de Google]` son marcadores: no hay enlace ni mail reales.
- Las tarjetas Verdulería y Farmacia (Inicio) y el ⋯ de Diego no tienen pantalla destino; en la app real se comportarían igual que sus equivalentes.
- La flecha atrás de una lista siempre muestra el aviso 3d en el prototipo; en la app real solo cuando haya ítems comprados.
- El detalle siempre muestra "Leche"; en la app real muestra el ítem tocado.
- "Salir del hogar" lleva a Bienvenida en el prototipo; el estado "sin hogar" no está diseñado.

## No diseñado todavía

- Estado "sin hogar" (después de salir o antes de crear/unirse a uno).
- Errores (falló el login, enlace de invitación vencido, etc.).
- Edición del nombre del hogar o de una lista; borrar una lista.
- Tema oscuro.
