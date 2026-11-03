# Changuito · Diseño de la app (lista de compras compartida)

> Nombre "Changuito" es provisorio. Todo lo de esta carpeta es el diseño de referencia para programar la app. Empezá leyendo este archivo.

## Qué es

App de lista de compras compartida para el hogar: 3 adultos de la misma casa, cada uno con su cuenta, editan las mismas listas y todos ven los cambios.

## Contenido de esta carpeta

- `DISENO.md`: este documento (decisiones, estilo, pantallas, flujos).
- `pantallas/`: una imagen PNG por pantalla (780 × 1688, el doble del tamaño de diseño) más el PDF original `Changuito-pantallas.pdf`. El número del archivo sigue el orden de la tabla de pantallas de abajo:
  `01-bienvenida`, `02-invitacion-recibida`, `03-inicio`, `04-nueva-lista`, `05-lista`, `06-lista-vacia`, `07-lista-sin-conexion`, `08-salir-de-la-lista`, `09-notificacion`, `10-detalle-item`, `11-hogar`, `12-invitar`, `13-opciones-miembro`, `14-confirmar-quitar`, `15-confirmar-salir`, `16-perfil`, `17-sin-hogar`, `18-sin-hogar-codigo`, `19-sin-hogar-te-sacaron`, `20-crear-hogar`, `21-hogar-creado`, `22-invitar-sin-enlace`, `23-desactivar-enlace`, `24-error-enlace-invalido`, `25-error-inicio-sesion`, `26-error-sin-conexion-unirse`, `27-salir-hogar-creador`, `28-salir-hogar-ultima-persona`, `29-inicio-sin-listas`, `30-error-codigo`, `31-error-crear-hogar`, `32-error-carga`, `33-editar-hogar`, `34-menu-lista`, `35-renombrar-lista`, `36-eliminar-lista`, `37-error-guardar`, `38-lista-eliminada`, `39-ajustes-notificaciones`, `40-permiso-notificaciones`, `41-ajustes-sin-permiso`, `42-inicio-silenciada`, `43-menu-lista-silenciada`, `44-icono-app`, `45-splash`, `46-cargando-entrada`.
  **Imágenes desactualizadas (2026-11-03):** `pantallas/12-invitar`, `22-invitar-sin-enlace` y `23-desactivar-enlace` todavía muestran "enlace" (y `12` también la tarjeta del enlace y "Compartir enlace"); la app ya usa "código" y solo el código. Valen las filas de esta tabla hasta que Claude Design vuelva a exportar esas tres imágenes. La `24` queda como está.
  Ojo: las barras de desplazamiento visibles en `05-lista` son un detalle de la exportación, no parte del diseño. En `12-invitar` la pill "Vence en 47 h" se ve partida en dos líneas porque la captura es anterior a un ajuste; en el diseño final va en una sola línea (ver `referencia-html/Invitar.dc.html`).
- `icono/`: el ícono de la app listo para usar (ver "Ícono y pantallas de carga" más abajo): capas SVG y PNG del ícono adaptable de Android, ícono de Play Store y la imagen del splash.
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
- **Sin hogar**: quien entra con Google y no pertenece a ningún hogar (primera vez, después de salir o de que la saquen) ve la pantalla "Sin hogar" con dos caminos: crear un hogar o entrar con un código de invitación. Si la sacaron, antes ve un aviso "Ya no sos parte de Nuestra casa".
- **Invitaciones**: se invita con un **enlace** o con un **código corto** (formato `K7P2-9XQ-4MN`). Ambos vencen (en el diseño "Vence en 47 h"; el total de **48 h** es una suposición). Se puede **generar un enlace nuevo** o **desactivar** el actual (con confirmación). Un enlace vencido, desactivado o inválido muestra un error que dice "Pedile otro enlace a quien te invitó".
- **Unirse requiere conexión**: sin internet se muestra un error con "Reintentar".
- **Quien crea el hogar y sale**: el rol de creador pasa a otro miembro (en el diseño: "Lucía será la nueva persona a cargo"). Falta decidir **a quién** pasa en la app real.
- **Última persona del hogar que sale**: el hogar se **archiva** y no queda nadie con acceso.
- **Menú de lista**: cualquier miembro puede renombrar o eliminar una lista (no se restringe al creador del hogar; falta confirmar). Al eliminar, se borran todos los ítems para todo el hogar y no hay deshacer; la confirmación dice cuántos ítems se pierden. El ⋯ aparece en el encabezado de la lista (3, 3b, 3c).
- **Error al guardar** (distinto de "Sin conexión"): sin conexión no es un error, se guarda en el celular y se sincroniza solo (3c). Si hay conexión pero el servidor rechaza el cambio, el cambio **no se pierde ni se oculta**: queda en la lista marcado en rojo, con un aviso para **Reintentar** o **Descartar** (descartar lo revierte). El indicador de estado pasa a **Sin guardar**.
- **Lista eliminada por otra persona**: quien la tiene abierta ve un aviso que no se puede cerrar con "Volver a las listas". Los cambios que no se habían sincronizado se pierden (se avisa en el texto). Las notificaciones (agregar/borrar ítems) no cubren este caso.
- **Notificaciones**: un solo interruptor general ("Avisarme cuando agreguen o borren ítems") y **silenciar por lista**, que es por persona: silenciar solo afecta a quien lo hace. Con el interruptor apagado no llega ningún aviso, aunque no haya listas silenciadas. Silenciar no oculta nada: la lista se ve igual en Inicio (con una campana tachada) y sus ítems se siguen actualizando.
- **Permiso de notificaciones (Android 13+)**: se pide una vez, con una pantalla previa que explica para qué (40) y luego el diálogo de Android. Si se rechaza (o se toca "Ahora no"), la app sigue funcionando sin avisos; el estado se ve solo en Notificaciones del perfil (41), con un acceso a los ajustes del celular. No se vuelve a pedir en otro momento.
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
| 3 | `Lista` | Campo de agregar rápido arriba, **Pendientes**, **Comprados** (tachados) al final, indicador **Sincronizado / Sin conexión** | 2 → tocar ítem → 4; flecha atrás → 3d; botón ⋯ (arriba a la derecha) → 34 |
| 3b | `ListaVacia` | Estado vacío ("Esta lista está vacía") | 2 (tarjeta Ferretería) |
| 3c | `ListaSinConexion` | Estado sin conexión: pill ámbar, aviso "2 cambios sin sincronizar", ítems con reloj | Variante de 3 (el indicador de 3 alterna entre ambos estados) |
| 3d | `SalirLista` | Aviso: "¿Salir de la lista? Se van a borrar los N ítems comprados" | 3 → "Salir y borrar" → 2 / "Quedarme" → 3 |
| 3e | `Notificacion` | Notificaciones de Android: "Lucía agregó 2 ítems", "Diego borró un ítem" | Tocar → 3 |
| 4 | `Detalle` | Panel que sube desde abajo: nombre, cantidad (− / +), nota, "Agregado por", Guardar / Eliminar | 3 → vuelve a 3 |
| 5 | `Hogar` | Tarjeta con el nombre del hogar (con lápiz, se toca para editarlo), miembros con rol, botón **Invitar**, "Salir del hogar", avatar de perfil arriba a la derecha | pestaña Hogar de 2; tarjeta del hogar → 33 |
| 5b | `Invitar` | **Solo el código** corto (`K7P2-9XQ-4MN`, siempre en una línea, con "Copiar"; sin tarjeta de enlace porque `changuito://` no se abre desde WhatsApp), pill "Vence en 47 h", y los botones "Compartir código", "Generar código nuevo" y "Desactivar código" (peligro). *Cambio respecto de la imagen `12` (2026-11-03, decisión de Maira).* | 5 → "Invitar"; "Desactivar código" → 23; también se llega desde 21 |
| 5c | `MiembroOpciones` | Panel inferior de un miembro con "Quitar del hogar" (solo lo ve quien creó el hogar) | 5 → botón ⋯ |
| 5d | `ConfirmarQuitar` | Aviso "¿Quitar a Lucía del hogar?" | 5c → "Quitar" / "Cancelar" → 5 |
| 5e | `ConfirmarSalir` | Aviso "¿Salir de Nuestra casa?" (caso común: miembro que no creó el hogar) | 5 → "Salir del hogar" → 17. Si quien sale es el creador se muestra 27; si es la última persona, 28 |
| 6 | `Perfil` | Avatar, nombre, cuenta de Google, hogar actual, fila **Notificaciones**, "Cerrar sesión" | 5 (avatar) → Notificaciones → 39; "Cerrar sesión" → 1 |
| 17 | `SinHogar` | Sin hogar: "Armá tu hogar o sumate a uno." con "Crear un hogar" y "Tengo un código de invitación" | Después de entrar con Google sin tener hogar; o al salir del hogar (5e, 27, 28); desde 19 → 20 / 18 |
| 18 | `SinHogarCodigo` | Campo para escribir o pegar el código; "Unirme" se habilita al haber texto | 17 → Inicio (2) |
| 19 | `SinHogarSacaron` | Aviso centrado "Ya no sos parte de Nuestra casa" con "Continuar" | Cuando sacan a la persona del hogar → 17 |
| 20 | `CrearHogar` | Campo "Nombre del hogar"; "Crear hogar" se habilita al haber texto | 17 → 21 |
| 21 | `HogarCreado` | "¡Listo, ya tenés hogar!" con "Invitar" y "Más tarde" | 20 → Invitar (5b) / "Más tarde" → 29 (hogar nuevo, sin listas) |
| 22 | `InvitarSinEnlace` | "El código ya no está activo" (venció o se desactivó) con "Generar código nuevo" | 23 "Desactivar" (o cuando venció) → 5b |
| 23 | `DesactivarEnlace` | Aviso "¿Desactivar el código?" con "Desactivar" (peligro) y "Cancelar" | 5b → 22 / 5b |
| 24 | `ErrorEnlace` | Error en la pantalla de unirse: "Este enlace ya no sirve. Pedile otro enlace a quien te invitó." | Al abrir un enlace vencido, desactivado o inválido → Bienvenida (1) / código (18) |
| 25 | `ErrorLogin` | Error: "No pudimos entrar / Algo salió mal" con "Reintentar" | Si falla el inicio de sesión con Google → Inicio (2) al reintentar |
| 26 | `ErrorSinConexion` | Error: "Necesitás internet para unirte" con "Reintentar" y "Ahora no" | Al intentar unirse sin conexión → 1b / 1 |
| 27 | `SalirCreador` | Variante del aviso de salir: avisa que el rol de creador pasa a otro miembro (muestra a Lucía) | Quien creó el hogar toca "Salir del hogar" en 5 → 17 / 5 |
| 28 | `SalirUltimo` | Variante del aviso de salir: "Sos la última persona del hogar"; el hogar se archiva | La última persona del hogar toca "Salir del hogar" → 17 / 5 |
| 29 | `InicioSinListas` | Inicio de un hogar recién creado: título "Listas", mensaje "Todavía no hay listas", botón extendido **Nueva lista** y barra inferior | 21 "Más tarde" → FAB → 2b; pestaña Hogar → 5. Se muestra siempre que el hogar no tenga listas |
| 30 | `ErrorCodigo` | Variante de 18 con el código mal escrito: campo con borde rojo y mensaje debajo "Este código no existe o ya venció. Revisalo o pedí uno nuevo." | 18 al tocar "Unirme" con un código inválido. Al editar el campo o tocar "Pegar" el error se borra |
| 31 | `ErrorCrearHogar` | Variante de 20 si falla la creación: "No pudimos crear el hogar", el nombre escrito se conserva, aviso rojo y botón **Reintentar** | 20 al tocar "Crear hogar" y fallar → "Reintentar" → 21 / "Ahora no" → 17 |
| 32 | `ErrorCarga` | Error general de lectura de datos: "No pudimos cargar tus datos" con **Reintentar**; conserva el título y la barra inferior | Cuando falla la lectura (Inicio, Hogar, etc.) → "Reintentar" → 2 |
| 33 | `EditarHogar` | Panel inferior "Nombre del hogar": nombre actual, campo editable, **Guardar** (se deshabilita si el campo queda vacío) y Cancelar | 5 (tarjeta del hogar) → Guardar / Cancelar → 5 |
| 34 | `MenuLista` | Panel inferior de la lista (se abre con el ⋯ del encabezado de 3): nombre, cantidad de ítems, **Renombrar**, **Silenciar** ("No te avisamos de esta lista") y **Eliminar lista** (peligro) | 3 → ⋯ → Renombrar → 35 / Silenciar → 43 (en el prototipo; en la app se cierra el panel y la lista queda silenciada) / Eliminar lista → 36 / Cancelar → 3 |
| 35 | `RenombrarLista` | Panel inferior como el de 33: "Nombre de la lista", nombre actual, campo editable, **Guardar** (se deshabilita si queda vacío) y Cancelar | 34 → Guardar / Cancelar → 3 |
| 36 | `EliminarLista` | Aviso centrado "¿Eliminar Supermercado?": dice cuántos ítems se pierden (10: 7 pendientes y 3 comprados), que desaparece para todo el hogar y que no se puede deshacer. Botones **Eliminar lista** (rojo) y Cancelar | 34 → Eliminar lista → 2 / Cancelar → 3 |
| 37 | `ErrorGuardar` | Lista con un cambio que no se pudo guardar (agregar, tildar o editar un ítem): pill roja **Sin guardar** en el encabezado, aviso rojo "No pudimos guardar 2 cambios" con **Reintentar** y **Descartar**, y las filas afectadas marcadas con "!" y el motivo ("No se guardó: ítem nuevo", "No se guardó: cantidad (antes 1 kg)") | Cuando falla una escritura con conexión: Reintentar → 3 (queda sincronizada) / Descartar → 3 (vuelve a como estaba) |
| 38 | `ListaEliminada` | Aviso centrado, sin forma de cerrarlo, "Esta lista ya no existe": "Lucía eliminó Supermercado…", botón **Volver a las listas** | Cuando otra persona elimina la lista que tenés abierta → 2 |
| 39 | `AjustesNotificaciones` | Interruptor **"Avisarme cuando agreguen o borren ítems"** ("Solo si no tenés la lista abierta") y **Listas silenciadas** (Verdulería, Farmacia) cada una con "Dejar de silenciar". Con el interruptor apagado la sección de listas se atenúa; sin listas silenciadas dice cómo silenciar | 6 Perfil → Notificaciones; flecha atrás → 6 |
| 40 | `PermisoNotificaciones` | Pedido inicial de permiso (pantalla previa al diálogo de Android): "¿Te avisamos cuando haya cambios?", ejemplo de notificación ("Lucía agregó 2 ítems"), **Activar avisos** y "Ahora no" | Una sola vez, al llegar a Inicio por primera vez (después de crear o unirse a un hogar) → Inicio (2) |
| 41 | `AjustesSinPermiso` | Variante de 39 cuando el permiso está rechazado: aviso ámbar "Las notificaciones están bloqueadas en tu celular" con **Abrir ajustes del celular**, interruptor deshabilitado y la lista de silenciadas atenuada | 6 → Notificaciones, cuando Android tiene las notificaciones de Changuito bloqueadas (rechazó el pedido o tocó "Ahora no" y no lo activó) → "Abrir ajustes" abre los ajustes de Android; al volver, 39 |
| 42 | `InicioSilenciada` | Inicio con la tarjeta Verdulería silenciada: ícono de campana tachada junto al contador de pendientes (el contador sigue visible) | Mismo Inicio (2) para quien silenció esa lista |
| 43 | `MenuListaSilenciada` | Menú de una lista silenciada: "Dejar de silenciar" ("Volvé a recibir avisos de esta lista") y el subtítulo "10 ítems · Silenciada" | 3 → ⋯ cuando la lista está silenciada → 34 |
| 44 | `IconoApp` | Hoja del ícono: combinado con máscara circular, las tres capas (primer plano, fondo, monocromático) con la zona segura de 66 dp, y el ícono con otras máscaras y con tema de color | Solo referencia (no es una pantalla de la app); los archivos están en `icono/` |
| 45 | `Splash` | Pantalla de carga inicial: logo (carrito sobre verde) centrado y "Changuito", sobre el fondo `#F7F8F3`; abajo "Lista de compras compartida" | Al abrir la app → 1 Bienvenida (si no hay sesión) o 46 (si ya hay sesión) |
| 46 | `CargandoEntrada` | Mismo logo y nombre en la misma posición que 45, más un indicador circular y "Entrando… Estamos buscando tu hogar y tus listas." | Después de iniciar sesión con Google, o al abrir la app con sesión iniciada → 2 Inicio (o 17 Sin hogar si no tiene hogar) |

## Ícono y pantallas de carga

**Concepto**: un carrito blanco con dos ítems de colores pastel (durazno `#F8DDAE` y verde claro `#CFE8D9`) sobre un fondo verde con degradé suave (`#3A8F65` → `#276B49`; el verde de marca es `#2E7D57`). El carrito de la marca es relleno; el carrito de línea de los encabezados de las pantallas es el ícono de interfaz y no cambia.

Archivos en `icono/` (todos salen de las mismas formas, en una grilla de 108 × 108):
- `icon-foreground.svg` / `ic_launcher_foreground.png` (432 × 432, transparente): capa de **primer plano** del ícono adaptable. El dibujo cabe dentro de los 66 dp centrales (zona segura), así que ninguna máscara lo corta.
- `icon-background.svg` / `ic_launcher_background.png` (432 × 432): capa de **fondo**, opaca, con el degradé verde.
- `icon-monochrome.svg` / `ic_launcher_monochrome.png` (432 × 432, transparente): capa **monocromática** para el ícono con tema de Android 13+ (una sola tinta; Android la pinta con el color del tema).
- `play-store-icon.svg` / `play-store-icon-512.png` (512 × 512): ícono de Play Store (fondo + primer plano, cuadrado completo; Play le pone la máscara).
- `splash-icon.svg` / `splash-icon.png` (1024 × 1024, transparente): el logo (cuadrado verde redondeado con el carrito) para la imagen del splash.

Uso previsto con Expo (`app.json`, sin inventar nada nuevo): `android.adaptiveIcon.foregroundImage` = `ic_launcher_foreground.png`, `backgroundImage` = `ic_launcher_background.png`, `monochromeImage` = `ic_launcher_monochrome.png`; `icon` = `play-store-icon-512.png`; el plugin `expo-splash-screen` con `image` = `splash-icon.png` y `backgroundColor` = `#F7F8F3`.

**Pantallas de carga**:
- **Splash (45)**: fondo `#F7F8F3`, logo de 132 px con esquinas de 38 px (la imagen `splash-icon.png`) y "Changuito" en Nunito 800 de 34 px. Android 12 y posteriores muestran **solo el ícono** sobre el color de fondo (no pueden mostrar texto): el nombre y el pie "Lista de compras compartida" se ven en Android 11 o anterior. En la app real, al terminar de arrancar se pasa a la pantalla que corresponda.
- **Cargando después de iniciar sesión (46)**: misma composición que 45 para que el cambio sea continuo (el logo no se mueve), con un indicador circular (anillo `#CFE8D9` con tramo `#2E7D57` girando) y el texto "Entrando…". Se muestra mientras se lee el hogar y las listas; si tarda o falla, se pasa a 32 (error de carga). Con "reducir animaciones" activado el indicador no gira.
- No hay modo oscuro todavía: ni el ícono ni las pantallas de carga tienen versión oscura.

## Letra grande del sistema

Las pantallas de diseño están dibujadas con la letra normal. Varias personas de la familia usan el tamaño de fuente de Android muy agrandado, así que la app **no limita el tamaño de letra** y se adapta (revisada con escalas 1,3 / 1,5 / 2,0). Reglas:

- Las alturas fijas de filas, botones y campos pasan a **alturas mínimas**: con letra normal miden lo mismo que en el diseño y con letra grande crecen.
- Un título que no entra pasa a más de una línea; un indicador que no entra baja **debajo del título**. En Lista, desde 1,15× el "Sincronizado" / "Sin conexión" va en su propia fila, debajo del título y del nombre del hogar (cambio respecto de `05`, `07` y `37`, que solo aplica con letra grande).
- Los nombres de ítems pueden ocupar dos líneas; las tarjetas de Inicio achican el nombre hasta el 70 %.
- Bienvenida, Sin hogar, Unirse, Crear hogar, Invitar y los paneles/avisos **se desplazan** si no entran; los botones principales de los formularios quedan fijos abajo.
- Áreas táctiles de al menos 44 dp en todo (también con letra grande).
- **Excepciones con tope de 1,3×:** los nombres de las pestañas de la barra inferior (alto fijo) y el campo del código de invitación (una sola línea). En los campos con un botón adentro ("Pegar") el botón baja debajo del texto con letra grande.

## Comportamientos que muestra el prototipo

- **Lista**: tildar un ítem lo pasa a Comprados (tachado, gris); destildar lo devuelve a Pendientes. Agregar escribe arriba de Pendientes. Cada fila tiene el avatar de quien lo agregó/tildó. El contador de Pendientes / Comprados se actualiza.
- **Indicador de conexión**: "Sincronizado" (verde) o "Sin conexión" (ámbar) arriba a la derecha; sin conexión muestra un aviso: "Los cambios se guardan en tu celular y se sincronizan cuando vuelva la conexión."
- **Detalle**: cantidad mínima 1; nombre y nota editables.
- **Nueva lista**: se elige 1 color de 4 (`#9ED3B3`, `#F2C26B`, `#9CC4E8`, `#C9D0C9`).

## Textos placeholder y cosas que son de ejemplo

- Nombre de app "Changuito", hogar "Nuestra casa", miembros "Vos / Lucía / Diego": ejemplos.
- `[enlace de invitación]` y `[cuenta de Google]` son marcadores: no hay enlace ni mail reales.
- En 39 "Dejar de silenciar" saca la lista del listado y el interruptor se enciende y apaga, pero no se refleja en 42 ni en 34 (el prototipo no comparte estado entre pantallas). En 40 "Activar avisos" y "Ahora no" van igual a Inicio: el diálogo de Android no está dibujado. Silenciar en 34 abre 43 para mostrar el estado. 41 solo se llega desde el lienzo.
- 45 y 46 se tocan en cualquier parte para pasar a la pantalla siguiente (el prototipo no tiene temporizador). 46 es la única con animación (indicador girando).
- Las tarjetas Verdulería y Farmacia (Inicio) y el ⋯ de Diego no tienen pantalla destino; en la app real se comportarían igual que sus equivalentes.
- La flecha atrás de una lista siempre muestra el aviso 3d en el prototipo; en la app real solo cuando haya ítems comprados.
- El detalle siempre muestra "Leche"; en la app real muestra el ítem tocado.
- En el prototipo "Salir del hogar" de Hogar siempre abre la variante común (5e); las variantes 27 y 28 se ven directamente en el lienzo. En la app real se elige la variante según el caso.
- El ⋯ de 3b y 3c abre el menú de Supermercado (el prototipo tiene un solo menú). En 36 "Eliminar lista" vuelve a 2 donde la tarjeta sigue; en la app real desaparece.
- El prototipo no conecta 19 (te sacaron), 24–26, 30–32, 37 ni 38 (errores y avisos) con un disparador real: se ven en el lienzo para diseñar el estado.
- En 33 el nombre nuevo no se refleja al volver a 5 (el prototipo no guarda datos). Quién puede editar el nombre no está decidido en el diseño: el panel no dice nada al respecto.
- Código de ejemplo `K7P2-9XQ-4MN`, "Vence en 47 h" y el nuevo "R4WD-3ZT-8HC / Vence en 48 h" son datos de ejemplo.

## No diseñado todavía

- Otros errores puntuales (por ejemplo, fallo al renombrar o eliminar una lista, o al crear una lista).
- Tema oscuro.
