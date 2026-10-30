# Etapa 4 · Listas e ítems en tiempo real

> Objetivo: que Changuito **sirva para lo que se hizo**: crear listas de verdad, agregar, tildar, editar y borrar ítems, y que todo aparezca al instante en el celular de los demás. Contexto general: `CLAUDE.md`, `diseno/ESQUEMA-DATOS.md` y `diseno/PLAN-CONSTRUCCION.md`. Diseño de referencia: pantallas `03`, `04`, `05`, `06`, `10`, `29`, `32`, `34` a `38` de `diseno/pantallas/`.

## Alcance

**Entra:**
- Inicio con las listas reales del hogar y sus contadores de pendientes; crear lista.
- Pantalla Lista real: agregar rápido, tildar y destildar, Pendientes y Comprados, avatar de cada ítem.
- Detalle del ítem: editar nombre, cantidad y nota; eliminar con deshacer.
- Menú de lista: renombrar y eliminar; aviso a quien la tiene abierta cuando otra persona la elimina (`38`).
- Error al guardar (`37`): reintentar o descartar.
- Reglas de seguridad de `listas` e `items`, con pruebas exhaustivas.

**No entra (queda para otras etapas):**
- Indicador **Sincronizado / Sin conexión**, aviso "N cambios sin sincronizar" y reloj en los ítems pendientes (Etapa 5). Firestore ya guarda los cambios sin conexión, pero verificarlo y mostrarlo es de la Etapa 5.
- Limpieza de comprados al salir de la lista (Etapa 6, porque depende de la presencia). **En esta etapa la flecha atrás vuelve directo a Inicio, sin el aviso `08`, y no borra nada.** Los comprados se acumulan hasta la Etapa 6; se pueden borrar de a uno desde el detalle. El aviso `08` sigue existiendo solo con los datos de ejemplo del menú DEV.
- Notificaciones, "Silenciar" en el menú de lista y ajustes (Etapa 7). El menú `34` solo tiene Renombrar y Eliminar: Silenciar se diseña cuando llegue su etapa.
- Purga automática de ítems y listas borrados hace más de 30 días (Etapa 6).
- Página puente de invitaciones (PR 7 de la Etapa 3, queda pendiente).

## Decisiones ya tomadas para esta etapa

- **Quién puede renombrar y eliminar una lista:** cualquier miembro activo (el diseño lo deja "por confirmar"). Eliminar no tiene deshacer y avisa cuántos ítems se pierden.
- **Eliminar una lista = una sola escritura** que la marca `eliminada: true` con `eliminadaPor` y `eliminadaEn`. **No se tocan sus ítems:** la app los ignora porque su lista está eliminada, y la purga de la Etapa 6 los limpia junto con la lista. Así funciona sin conexión, es atómico y no depende del límite de 500 escrituras por lote. Una lista eliminada no se puede "des-eliminar".
- **Datos opcionales del ítem:** `cantidad` ausente significa 1; `unidad` ("kg", "docena", "pack", como se ve en `05`) existe en el esquema, pero el detalle del ítem (`10`) solo tiene el número con − / +, así que **hoy no hay forma de cargar una unidad**. La lista muestra "×N" cuando la cantidad es mayor que 1, y "N unidad" si el ítem tiene unidad. Al cambiar la cantidad se conserva la unidad. Cargar unidades queda para una etapa posterior si hace falta. `icono` de la lista no está en el diseño: no se usa.
- **Deshacer al eliminar un ítem:** el diseño no trae el aviso de "deshacer". Está autorizado un aviso mínimo abajo ("Ítem eliminado · Deshacer", unos 5 segundos) con los colores y las formas del tema, y hay que mencionarlo en la PR como pieza no diseñada.
- **Errores no diseñados** (fallo al crear, renombrar o eliminar una lista): se muestran con el mismo estilo rojo de `31`/`37`, adentro del mismo panel o aviso, con "Reintentar". Mencionarlo en la PR.
- **Una sola suscripción por hogar** para todo, como dice el esquema: listas (incluidas las eliminadas, para poder detectar `38`), ítems no borrados y miembros de **todos** los estados (los que salieron siguen teniendo avatar y nombre en sus ítems viejos).

## Reglas específicas de esta etapa

- **Escrituras optimistas, nunca transacciones.** Agregar, tildar, editar, borrar, crear, renombrar y eliminar son escrituras simples que Firestore aplica al instante en el celular y envía cuando hay conexión. La promesa de una escritura **solo se resuelve cuando el servidor confirma**, o sea que sin conexión queda pendiente: **la pantalla no puede esperarla** para actualizarse. La promesa se usa solo para detectar el rechazo (ver `37`). Esto es lo contrario de la Etapa 3, donde se usaban transacciones justamente para fallar al instante sin conexión.
- **Actualizaciones por campo.** Tildar toca `comprado`, `tildadoPor` y `tildadoEn`; renombrar toca solo `nombre`; etc. Nunca se reescribe el documento entero (de eso depende "gana el último, por campo").
- **Ítem nuevo:** el id lo genera el celular; se escribe siempre con `borrado: false` y `comprado: false` (si el campo `borrado` no existiera, la consulta de ítems no borrados no lo encontraría), `agregadoPor` = su uid y `agregadoEn` con la hora del servidor.
- **Orden:** Pendientes por `agregadoEn` descendente (el nuevo arriba); Comprados por `tildadoEn` descendente. Un ítem recién agregado todavía no tiene la hora del servidor: hay que tratar esa marca pendiente como "ahora" para que aparezca arriba al instante. Verificar cómo lo entrega `@react-native-firebase/firestore` y dejar escrito qué se hizo.
- **Avatar de la fila:** el de `agregadoPor` mientras está pendiente y el de `tildadoPor` cuando está comprado, tomando nombre y `colorAvatar` de `miembros`.
- **Los permisos los decide el servidor**, como siempre: toda restricción de la app tiene su regla y su prueba, y se autoriza por membresía activa, nunca por `hogarActualId` ni por email.
- Textos, colores y medidas salen de `DISENO.md`. Datos de ejemplo del menú DEV siguen funcionando.

## Cambios al esquema (actualizar `ESQUEMA-DATOS.md` en el PR 1)

1. **`listas`** suma `eliminadaPor` (uid de quien la eliminó). `eliminada` solo puede pasar de `false` a `true`. `icono` queda sin uso por ahora.
2. **`items`**: documentar que `borrado` y `comprado` se escriben siempre (booleanos, `false` al crear), que `cantidad` ausente vale 1 y que `unidad` queda sin interfaz por ahora.
3. **Consulta de ítems del hogar:** `borrado == false`. Un ítem que pasa a borrado sale del resultado y los demás celulares lo ven desaparecer.
4. Aclarar que los ítems de una lista eliminada se ignoran y los purga la Etapa 6.

## Reglas de seguridad (qué tiene que permitir y prohibir el servidor)

**`listas`**
- Leen todos los miembros activos del hogar. Nadie más.
- Crea un miembro activo: `creadaPor` = su uid, `creadaEn` = hora del servidor, `eliminada` = `false`, `nombre` con largo razonable (máximo 80 caracteres, no vacío) y `color` uno de los cuatro del diseño.
- Edita un miembro activo: solo `nombre` y `color`, o pasar `eliminada` de `false` a `true` junto con `eliminadaPor` = su uid y `eliminadaEn`. `creadaPor` y `creadaEn` no cambian. Una lista ya eliminada no se modifica más.
- Solo se elimina de verdad (borrar el documento) una lista eliminada hace más de 30 días. Lo usa la purga de la Etapa 6.

**`items`**
- Leen todos los miembros activos del hogar. Nadie más.
- Crea un miembro activo: `agregadoPor` = su uid, `agregadoEn` = hora del servidor, `comprado` = `false`, `borrado` = `false`, `listaId` y `nombre` válidos (no vacío, máximo 120 caracteres), `cantidad` entera positiva si viene, `nota` de máximo 500 caracteres.
- Edita un miembro activo: `listaId`, `agregadoPor` y `agregadoEn` **no cambian**. Al pasar `comprado` a `true`, `tildadoPor` = su uid; al pasarlo a `false`, `tildadoPor` y `tildadoEn` se vacían. Al pasar `borrado` a `true`, `borradoPor` = su uid; al pasarlo a `false` (deshacer), se vacían. Los demás campos se validan por tipo y largo.
- Solo se elimina de verdad un ítem marcado como borrado hace más de 30 días.
- No es necesario comprobar que `listaId` exista (un ítem huérfano es inofensivo y evita una lectura por escritura); si Claude Code ve una razón fuerte para exigirlo, que lo diga en la PR.

## PR 1 · Esquema y reglas de seguridad de listas e ítems

Rama: `etapa-4/01-reglas-listas-items`

1. Actualizar `ESQUEMA-DATOS.md` con los cambios de arriba.
2. Escribir las reglas de `listas` e `items` en `firebase/firestore.rules`, manteniendo las de `usuarios`, `hogares`, `miembros` e `invitaciones` sin cambios, y todo lo demás bloqueado.
3. Pruebas con `@firebase/rules-unit-testing`, **exhaustivas**. Como mínimo: un miembro activo lee y crea listas e ítems de su hogar y uno de otro hogar no; un miembro `quitado` o que `salio` no lee ni escribe; sin sesión no accede a nada; crear con datos inválidos (nombre vacío o demasiado largo, color fuera de los cuatro, `agregadoPor` de otra persona, `agregadoEn` que no es la hora del servidor, `comprado` o `borrado` en `true` al crear) es rechazado; no se pueden cambiar `listaId`, `agregadoPor` ni `agregadoEn`; tildar con el uid de otra persona es rechazado; eliminar una lista exige `eliminadaPor` propio y no se puede deshacer; la eliminación real solo vale pasados 30 días; los datos de otras colecciones no se ven afectados.
4. No publicar. Dejar el comando para que Maira lo haga: `firebase deploy --only firestore:rules --project changuito-31ec1`.

**Se comprueba cuando:** las pruebas pasan en local y en GitHub, y Maira publicó las reglas. **Revisar con atención**, como el PR 1 de la Etapa 3.

## PR 2 · Inicio con listas reales y crear lista

Rama: `etapa-4/02-inicio-crear-lista`

1. **Inicio** (`03`) con las listas del hogar en tiempo real (sin las eliminadas): nombre, color y cantidad de pendientes, calculada con la suscripción de ítems; "Al día" cuando no quedan pendientes, como en el diseño. Un hogar sin listas muestra `29`.
2. **Nueva lista** (`04`): panel con nombre y uno de los cuatro colores, que crea la lista de verdad. El botón de `29` y el FAB hacen lo mismo. Sin conexión el panel se cierra igual, porque la lista queda creada en el celular.
3. Error de lectura: `32`, con "Reintentar".
4. Tocar una tarjeta abre la pantalla Lista. En este PR puede seguir mostrando el contenido de ejemplo si el PR 3 todavía no está; dejalo anotado.
5. Tests de la lógica de contadores y de creación.

**Se comprueba cuando:** crear una lista en el celular la muestra al instante en Inicio y aparece en Firebase; un segundo dispositivo con la misma cuenta la ve aparecer sin recargar.

## PR 3 · Pantalla Lista: agregar, tildar y comprados

Rama: `etapa-4/03-lista-items`

1. **Lista** (`05`) con ítems reales: Pendientes y Comprados con sus contadores, avatar de cada ítem, "×N" o "N unidad" según corresponda. Lista vacía: `06`.
2. **Agregar rápido:** el ítem aparece arriba de Pendientes al instante y no hace falta esperar al servidor. El campo se limpia y sigue listo para el siguiente. No se pueden agregar nombres vacíos.
3. **Tildar y destildar:** pasa a Comprados (tachado) y vuelve, con los campos por separado.
4. La flecha atrás vuelve directo a Inicio, sin el aviso `08` (ver "No entra").
5. El indicador de conexión de la pantalla todavía no se implementa (es de la Etapa 5): que no muestre un "Sincronizado" que podría ser falso. Se muestra solo "Sin guardar" cuando corresponde (PR 6). Dejá escrito qué se hizo.
6. Tests de orden, contadores, agregar y tildar.

**Se comprueba cuando:** con dos dispositivos abiertos en la misma lista, lo que uno agrega o tilda aparece en el otro al instante, con el avatar correcto.

## PR 4 · Detalle del ítem: editar y eliminar

Rama: `etapa-4/04-detalle-item`

1. **Detalle** (`10`) con el ítem tocado: nombre, cantidad (− / +, mínimo 1), nota y "Agregado por" con el nombre real de quien lo agregó, aunque ya haya salido del hogar.
2. **Guardar** envía solo los campos que cambiaron. Si no cambió nada, solo cierra. Con nombre vacío queda deshabilitado.
3. **Eliminar** marca el ítem como borrado y muestra el aviso "Ítem eliminado · Deshacer" (ver "Decisiones"). Deshacer lo restaura.
4. Tests de la lógica de "qué campos cambiaron" y del deshacer.

**Se comprueba cuando:** editar la cantidad en un dispositivo la muestra en el otro; si dos personas cambian campos distintos del mismo ítem, se conservan los dos cambios; eliminar y deshacer funciona.

## PR 5 · Menú de lista: renombrar, eliminar y "lista eliminada"

Rama: `etapa-4/05-menu-lista`

1. **Menú** (`34`) desde el ⋯ del encabezado: nombre de la lista, cantidad de ítems, Renombrar y Eliminar lista.
2. **Renombrar** (`35`): panel con el nombre actual; Guardar deshabilitado si queda vacío.
3. **Eliminar** (`36`): el aviso dice cuántos ítems se pierden (pendientes y comprados no borrados), que desaparece para todo el hogar y que no se puede deshacer. Al confirmar, vuelve a Inicio.
4. **Lista eliminada por otra persona** (`38`): quien la tiene abierta ve el aviso sin forma de cerrarlo, con "Volver a las listas" y el nombre de quien la eliminó. Los cambios sin sincronizar de esa lista se pierden (el texto del diseño lo avisa). Quien eliminó la lista no ve este aviso.
5. Errores de renombrar o eliminar con el estilo rojo acordado.
6. Tests.

**Se comprueba cuando:** con dos dispositivos, renombrar en uno se ve en el otro; eliminar en uno lleva al otro al aviso `38`, y la lista desaparece de Inicio en ambos.

## PR 6 · Error al guardar

Rama: `etapa-4/06-error-guardar`

1. **Qué pasa cuando el servidor rechaza una escritura** (con conexión). Firestore **deshace el cambio local** al ser rechazado; para que "el cambio no se pierda ni se oculte" (como pide `37`) la app tiene que **guardar ella misma la operación fallida** (qué era, sobre qué ítem y cuál era el valor anterior) y mostrarla marcada. Primero hay que **comprobar con una prueba real** cómo se comporta la librería (cuándo se rechaza la promesa y qué código trae el error) y dejarlo escrito en la PR. Un error de red sin conexión no cuenta como rechazo: la escritura queda pendiente y se envía sola.
2. **Pantalla `37`:** pill roja **Sin guardar** en el encabezado, aviso rojo "No pudimos guardar N cambios" con **Reintentar** y **Descartar**, y las filas afectadas con "!" y el motivo ("No se guardó: ítem nuevo", "No se guardó: cantidad (antes 1 kg)", etc.).
3. **Reintentar** vuelve a enviar los cambios fallidos; si salen bien, desaparece el aviso. **Descartar** los borra de la lista de fallidos (el cambio ya estaba revertido).
4. Los cambios fallidos viven en memoria: si se cierra la app, se pierden. Dejarlo documentado.
5. Tests de la lógica de fallos, reintento y descarte, con la escritura simulada.

**Se comprueba cuando:** se fuerza un rechazo (por ejemplo, una regla que lo rechace a propósito en el emulador de Firestore, o quitar al usuario del hogar desde la consola mientras tiene la lista abierta) y aparecen el aviso, el pill y las filas marcadas; Reintentar y Descartar se comportan como se describe.

## Secuencia de prueba con dos cuentas (A en el celular real, B en el emulador, las dos en el mismo hogar)

1. A crea la lista "Supermercado" y B la ve aparecer en Inicio.
2. A agrega tres ítems; B los ve aparecer arriba, con el avatar de A.
3. B tilda uno; A lo ve pasar a Comprados, con el avatar de B.
4. A edita la cantidad de un ítem y B edita la nota del mismo ítem al mismo tiempo: quedan los dos cambios.
5. A elimina un ítem y toca Deshacer: vuelve. Lo elimina otra vez: B lo ve desaparecer.
6. B renombra la lista; A ve el nombre nuevo.
7. A está dentro de la lista y B la elimina: A ve el aviso `38` y vuelve a Inicio. La lista no está en Inicio de ninguno.
8. Forzar el error (ver PR 6) y probar Reintentar y Descartar.
9. Probar los errores de crear, renombrar y eliminar una lista.

## Cierre de la etapa

La Etapa 4 termina cuando:
- La secuencia de prueba con dos cuentas funciona entera.
- Las pruebas de reglas pasan en local y en GitHub, y las reglas están publicadas.
- Los chequeos automáticos pasan.

Al terminar, actualizá esta sección y avisá que sigue la **Etapa 5 · Funcionamiento sin conexión**.

Recordatorios para más adelante:
- Antes de la Etapa 5 conviene revisar los textos del indicador de conexión y del aviso "N cambios sin sincronizar" con los datos reales (los de `07` ya están diseñados).
- Antes de la Etapa 7 hay que diseñar en Claude Design **Silenciar** dentro del menú de lista (`34`) y los ajustes de notificaciones.

## Estado

- [x] PR 1 · Esquema y reglas de seguridad de listas e ítems (rama `etapa-4/01-reglas-listas-items`)
- [ ] Maira publica las reglas (`firebase deploy --only firestore:rules --project changuito-31ec1`, desde `firebase/`)
- [ ] PR 2 · Inicio con listas reales y crear lista
- [ ] PR 3 · Pantalla Lista: agregar, tildar y comprados
- [ ] PR 4 · Detalle del ítem: editar y eliminar
- [ ] PR 5 · Menú de lista: renombrar, eliminar y "lista eliminada"
- [ ] PR 6 · Error al guardar
