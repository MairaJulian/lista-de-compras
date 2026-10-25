# Etapa 1 · Base visual y navegación

> Objetivo: que Changuito **se vea y se mueva como el diseño**, con datos de ejemplo y sin Firebase todavía. Contexto general: `CLAUDE.md` y `diseno/PLAN-CONSTRUCCION.md`. El diseño de referencia es `diseno/DISENO.md` más las imágenes de `diseno/pantallas/`.

## Alcance

**Entra:**
- Tema completo (colores, tipografías, medidas) tomado de `DISENO.md`.
- Componentes reutilizables.
- Navegación entre pantallas (pestañas Listas y Hogar, pantallas internas, paneles inferiores y avisos).
- Las pantallas del diseño con **datos de ejemplo guardados en memoria** (sin Firebase), con los comportamientos que muestra el prototipo: tildar y destildar, agregar ítems, cambiar el indicador de conexión, cantidad con − / +, elegir color de lista, etc.

**No entra (queda para otras etapas):**
- Login real, hogares e invitaciones reales, datos en Firestore, modo sin conexión real, notificaciones.
- La pantalla `09-notificacion` es una notificación del sistema Android, no una pantalla de la app: se hace en la Etapa 7.
- Lo que `DISENO.md` marca como "No diseñado todavía" (otros errores, edición del nombre del hogar o de una lista, borrar una lista, menú de lista, ajustes de notificaciones, tema oscuro). Si algo de eso hace falta para que una pantalla funcione, **preguntá o dejalo anotado en la PR**; no lo inventes.

## Reglas específicas de esta etapa

- Los datos de ejemplo viven en un solo lugar (por ejemplo `src/mock/`) y son los del diseño: hogar "Nuestra casa", miembros Vos / Lucía / Diego, y las listas e ítems de las imágenes. Cuando llegue Firebase se reemplazan sin tocar las pantallas, así que las pantallas deben recibir los datos por props o por un hook, no leerlos directo del archivo de ejemplo.
- Tema centralizado en `app/src/theme`: colores, tipografías (Nunito 700/800 y DM Sans 400/500/700), radios, alturas y espacios de `DISENO.md`. Ningún valor suelto en las pantallas.
- Áreas táctiles de al menos 44 px. Márgenes seguros del sistema (barra de estado y de navegación de Android) y teclado que no tape el campo de agregar ítems.
- Textos de la interfaz exactos a los del diseño (español rioplatense).
- Navegación: elegir entre **Expo Router** y **React Navigation**. Recomendación: Expo Router, porque en la Etapa 3 el enlace de invitación (`changuito://...`, el esquema ya está en `app.json`) se resuelve más fácil. Decidirlo en el PR 2 y dejar escrito el motivo. Si hay conflicto con la estructura actual del proyecto, usar React Navigation.
- Íconos: una sola librería para toda la app. Si el diseño usa íconos propios que ninguna librería cubre, sacar los SVG de `diseno/referencia-html/`.
- Paneles inferiores (radio superior 28, manija, subida ~0,35 s) y avisos centrados (radio 28, leve escala + fade) como componentes reutilizables.

## Cómo verificar el parecido con el diseño

Las imágenes de `diseno/pantallas/` miden 780 × 1688 (el doble de 390 × 844). Para comparar sin depender de Maira en cada paso:

1. Abrir la pantalla en el celular conectado.
2. Tomar una captura: `adb shell screencap -p /sdcard/captura.png` y después `adb pull /sdcard/captura.png`. (Evitar redirigir con `>` en PowerShell: corrompe el archivo.) La ruta de `adb` es `$env:ANDROID_HOME\platform-tools\adb.exe`.
3. Leer la captura y la imagen de referencia, y corregir diferencias de colores, tamaños, espacios y textos.
4. En la PR, dejar la lista de pantallas que se compararon y las diferencias que quedan.

Notas del diseño: las barras de desplazamiento que se ven en `05-lista` son un detalle de la exportación y no van. En `12-invitar` el código aparece partido en dos líneas porque la captura es anterior a un ajuste; el diseño final lo muestra en una sola línea (ver `referencia-html/Invitar.dc.html`). Si una imagen de `pantallas/` contradice `DISENO.md` o su HTML de referencia, manda el HTML; dejalo anotado en la PR.

## PR 1 · Tema y componentes base

Rama: `etapa-1/01-tema-componentes`

1. Completar el tema con todo `DISENO.md` (colores, radios, alturas, tipografías) y cargar las fuentes que falten.
2. Componentes: avatar con inicial, botones (principal, secundario, peligro), tarjeta de lista, fila de ítem con checkbox, pill de estado (Sincronizado / Sin conexión), campo de texto, panel inferior, aviso centrado.
3. Una pantalla de desarrollo (solo `__DEV__`) que muestre todos los componentes juntos, para revisarlos de un vistazo.
4. Tests de renderizado de los componentes.

**Se comprueba cuando:** la pantalla de componentes en el celular muestra cada pieza con los colores y formas del diseño.

## PR 2 · Navegación, Inicio y Hogar

Rama: `etapa-1/02-navegacion-inicio-hogar`

1. Navegación con la barra inferior (pestañas Listas y Hogar, indicador pill) y decisión de librería documentada.
2. Pantalla **Inicio** (`03-inicio`): tarjetas de listas con cantidad de pendientes, estado "Al día", botón **Nueva lista**.
3. Pantalla **Hogar** (`11-hogar`): nombre del hogar, miembros con rol, botón Invitar, Salir del hogar, avatar de perfil arriba a la derecha.
4. Los datos salen del archivo de ejemplo a través de props o un hook.

**Se comprueba cuando:** Inicio y Hogar se ven como `03-inicio` y `11-hogar`, y la barra inferior cambia entre ambas.

## PR 2b · Navegación estándar

Rama: `etapa-1/02b-navegacion-estandar`

Prerrequisito: el problema de rutas largas está resuelto (CMake 3.31.6 fijado por el config plugin; ver README, "Rutas largas en Windows").

1. Reemplazar la navegación propia de `app/src/navigation` por **Expo Router** (recomendado por el enlace `changuito://...` de la Etapa 3) o **React Navigation**. Dejar escrito el motivo.
2. Reemplazar el módulo local `app/modules/system-insets` por `react-native-safe-area-context` y borrar el módulo.
3. Mantener lo que ya anda: pestañas Listas y Hogar con indicador pill, atrás en Hogar vuelve a Listas, y el aspecto de Inicio y Hogar.
4. Confirmar que compila con las librerías nuevas (`react-native-screens` y `react-native-safe-area-context`, más lo que pida Expo Router).

**Se comprueba cuando:** Inicio y Hogar se ven igual que antes de la PR, los márgenes seguros siguen bien en el celular y la app compila desde la ruta real del repo.

## PR 3 · Pantalla Lista

Rama: `etapa-1/03-lista`

1. Pantalla **Lista** (`05-lista`): campo de agregar rápido, **Pendientes** y **Comprados** (tachados) con sus contadores, avatar de cada ítem.
2. Comportamientos con estado local: tildar pasa el ítem a Comprados y destildar lo devuelve; agregar escribe arriba de Pendientes; los contadores se actualizan.
3. Indicador **Sincronizado / Sin conexión** que alterna entre ambos estados (`07-lista-sin-conexion`, con el aviso "N cambios sin sincronizar" y el reloj en los ítems).
4. Estado **lista vacía** (`06-lista-vacia`).
5. Tests de la lógica de tildar, agregar y contar.

**Se comprueba cuando:** desde Inicio abrís Supermercado y Ferretería y se ven como `05`, `06` y `07`, y todo lo anterior funciona al tocar.

## PR 4 · Paneles y avisos de la lista

Rama: `etapa-1/04-paneles-lista`

1. **Detalle del ítem** (`10-detalle-item`): panel inferior con nombre, cantidad (− / +, mínimo 1), nota, "Agregado por", Guardar y Eliminar.
2. **Nueva lista** (`04-nueva-lista`): panel con nombre y 4 colores.
3. **Salir de la lista** (`08-salir-de-la-lista`): aviso "¿Salir de la lista?" con la cantidad de comprados.

**Se comprueba cuando:** cada panel y aviso se abre y cierra con la animación del diseño, y guardar, eliminar, crear y salir actualizan la lista de ejemplo.

## PR 5 · Flujos del hogar y de la cuenta

Rama: `etapa-1/05-hogar-cuenta`

1. **Bienvenida** (`01-bienvenida`) y **Unirse** (`02-invitacion-recibida`).
2. **Invitar** (`12-invitar`), **Opciones de miembro** (`13-opciones-miembro`), **Confirmar quitar** (`14-confirmar-quitar`) y **Confirmar salir** (`15-confirmar-salir`).
3. **Perfil** (`16-perfil`).
4. Las navegaciones de la tabla de `DISENO.md` (por ejemplo, "Salir del hogar" lleva a Bienvenida en el prototipo).

**Se comprueba cuando:** se puede recorrer toda la app con datos de ejemplo siguiendo la tabla "Pantallas y navegación" de `DISENO.md`, sin que haya ningún botón sin destino.

## Cierre de la etapa

La Etapa 1 termina cuando las 15 pantallas de la app (todas menos `09-notificacion`) se ven como el diseño, la navegación funciona y los chequeos automáticos pasan. Al terminar, actualizá esta sección y avisá que sigue la **Etapa 2 · Login y perfil**.

Antes de empezar la Etapa 3 hay que diseñar, en Claude Design, el estado "sin hogar", los errores de invitación y las pantallas de vencimiento, regenerar y revocar de Invitar. Dejalo anotado como recordatorio.

## Estado

- [x] PR 1 · Tema y componentes base (íconos: `@expo/vector-icons` MaterialCommunityIcons; pendiente: márgenes seguros inferiores, ver PR)
- [x] PR 2 · Navegación, Inicio y Hogar (navegación propia sin librerías nativas; ver sección "Decisión de navegación")
- [x] Infra · Rutas largas resueltas con CMake 3.31.6 fijado por config plugin (rama `etapa-1/infra-rutas-largas`)
- [x] PR 2b · Navegación estándar (Expo Router; ver sección "Decisión de navegación (PR 2b)")
- [ ] PR 3 · Pantalla Lista
- [ ] PR 4 · Paneles y avisos de la lista
- [ ] PR 5 · Flujos del hogar y de la cuenta

## Decisión de navegación (PR 2b)

- **Expo Router** (`expo-router` ~58, rutas en `app/src/app`, entrada `expo-router/entry`). Motivo: en la Etapa 3 el enlace de invitación (`changuito://...`, el esquema ya está en `app.json`) se resuelve como una ruta más, sin código propio de `Linking`. No hubo conflicto con la estructura del proyecto.
- Rutas: `_layout` (raíz: fuentes, `SafeAreaProvider`, `Stack`, menú DEV), `(tabs)/_layout` (pestañas con la `TabBar` propia como `tabBar`, `backBehavior="initialRoute"`), `(tabs)/index` (Inicio) y `(tabs)/hogar`. Las pantallas siguen en `src/screens`; las rutas solo las re-exportan. Las pantallas internas de las PR 3 a 5 se agregan como rutas del `Stack` raíz.
- Márgenes seguros: `react-native-safe-area-context` (`useSafeAreaInsets`). Se borró el módulo local `system-insets` y el contexto propio.
- Nuevas dependencias: `expo-router`, `react-native-screens`, `react-native-safe-area-context`, `expo-linking`, `expo-constants`.

## Decisión de navegación (PR 2, reemplazada por la PR 2b)

- **Ni Expo Router ni React Navigation**: las dos necesitan `react-native-screens` y `react-native-safe-area-context` (más `gesture-handler` y `reanimated` en el caso de Expo Router), librerías nativas con código C++ generado que **no compilaban en Android desde la ruta del repo en Windows** (ninja supera los 260 caracteres). Probé acortar el directorio de build de CMake y `CMAKE_OBJECT_PATH_MAX` sin éxito. Mover el repo no es una opción. **Resuelto después** (rama `etapa-1/infra-rutas-largas`): fijando CMake 3.31.6, cuyo ninja sí soporta rutas largas, compilan con rutas de hasta 367 caracteres. La navegación estándar se retoma en la PR 2b.
- Se hizo una navegación propia en `app/src/navigation` (por ahora, las pestañas Listas y Hogar; atrás en Hogar vuelve a Listas). Las pantallas internas se agregan como una pila en las PR 3 a 5.
- Márgenes seguros: módulo nativo local `app/modules/system-insets` (solo Kotlin, sin C++), que se usa con `useInsets()`.
- **Pendiente para la Etapa 3**: el enlace de invitación (`changuito://...`). Se puede resolver con `Linking` de React Native (no necesita librerías nativas nuevas) y con la pila propia; si para entonces se resuelve el problema de rutas, reevaluar Expo Router.
