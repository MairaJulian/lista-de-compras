# Etapa 9 · Varios grupos

> Objetivo: que una persona pueda estar en **varios grupos** (la familia, una juntada con amigos, un cumpleaños), cambiar entre ellos, crear o unirse a otros sin salir de los que ya tiene, y **archivar** los que ya cumplieron su función. Contexto general: `CLAUDE.md`, `diseno/ESQUEMA-DATOS.md` y `diseno/DISENO.md` (decisiones de producto de grupos y pantallas). Diseño de referencia: `47` a `54` de `diseno/pantallas/`, más todas las pantallas que cambiaron "hogar" por "grupo" en el texto.

## Qué cambió respecto del plan original

- El plan original pensaba **un solo hogar por persona** (la primera versión). La familia lo usó en casa y apareció la necesidad de grupos puntuales (una juntada, un cumpleaños con otra familia). El modelo de datos **ya lo permitía** (permisos por membresía, `hogarActualId` como puntero); lo que falta es sobre todo interfaz y unas pocas reglas nuevas.
- La palabra visible pasa de **"hogar" a "grupo"** en toda la app.
- La Etapa 7 (notificaciones) sigue pospuesta. Las decisiones de Play Store y otras quedan para la `ETAPA-10.md`.

## Cómo se trabaja esta etapa

Sigue la sección "Proceso por etapa" de `CLAUDE.md`. Resumen:

1. **PR 1** (reglas) va aparte, con pruebas, y las reglas no se publican hasta que Maira lo pida. El resto va en **una PR** salvo que supere lo revisable (más de ~1.500 líneas de código sin contar tests): en ese caso frená y proponé cómo dividirla.
2. Verificá en el emulador todo lo que se pueda (dos cuentas: la del emulador y la de Maira en el celular, si hace falta crear datos de prueba, con nombres evidentes tipo "PRUEBA GRUPO" y borralos al terminar).
3. En la PR, "Cómo probarlo" corto: solo lo que necesita dos cuentas reales o el celular.
4. En `CLAUDE.md` cambiá la línea "Etapa actual" a `Etapa actual: 9 → diseno/ETAPA-9.md`, en el primer commit de la PR 1.
5. Al terminar, no hace falta escribir otro borrador: la etapa que sigue es la `ETAPA-10.md`, que ya existe.

## Alcance

**Entra:**
- **Texto visible "grupo"** en toda la app, los tests y los mensajes (en el código y en Firestore los nombres siguen siendo `hogar`/`hogares`/`hogarActualId`: **no se renombran colecciones ni campos**, porque rompería los datos de la familia).
- **Tipo de grupo** (`Familia`, `Amigos`, `Evento`): solo cambia el aspecto (color e ícono) y un aviso al crear un Evento (`49`).
- **Cambiar de grupo** (`47`), **Mis grupos** (`48`), **crear otro grupo** (`49`), **unirse a otro con un código** (`50`).
- **Salir de un grupo teniendo otros** (`53`) y **Sin grupo** (`54`), con la pestaña "Grupo" y el flujo de "te sacaron" (`19`) adaptados.
- **Archivar y desarchivar** (`51`, `52`): solo lo hace quien creó el grupo; un grupo archivado queda en **solo lectura** para todos.
- La app abre el **último grupo usado**.
- **Reglas de seguridad** nuevas, con pruebas.

**No entra:**
- Notificaciones (Etapa 7), tema oscuro, y todo lo de `ETAPA-10.md`.
- Mover listas o ítems de un grupo a otro, ni plantillas de listas.
- Borrar un grupo definitivamente (solo se archiva).

## Decisiones tomadas

Las primeras cuatro son las que dejó abiertas `DISENO.md`; las tomó Maira o se asumen salvo que diga lo contrario.

- **Máximo de grupos por persona:** **10 grupos activos** como límite blando en la app (no en las reglas, que no pueden contar). Los archivados no cuentan. Si se llega al límite, "Crear grupo" y "Unirme con un código" muestran un aviso corto (usar el estilo de los errores existentes y avisarlo en la PR).
- **Grupos archivados:** **no se borran solos**. Quedan en solo lectura hasta que quien los creó los desarchive. Borrar datos de un grupo exigiría borrar sus subcolecciones desde el celular y no hace falta mientras el volumen sea chico.
- **Quién renombra y elimina:** como ya está implementado, **cualquier miembro activo** renombra el grupo y renombra o elimina listas. **Nadie elimina un grupo**: solo se archiva, y solo quien lo creó.
- **Quién hereda el rol de creador** cuando el creador sale: **quien lleva más tiempo en el grupo** (menor `desde`), como ya hace la app. Se mantiene.
- **Tipo de grupo:** al crear (`49`) se elige entre Familia, Amigos y Evento. Los grupos existentes (sin el campo) se tratan como **Familia**, sin migración.
- **Cambiar de grupo** se hace tocando el nombre del grupo (con ⌄) arriba de "Listas" en Inicio, que abre el panel "Tus grupos" (`47`).
- **Salir de un grupo teniendo otros:** se pasa a **otro grupo activo**. Elegí el criterio más simple que cumpla "el que se usó antes" (por ejemplo, guardar un `ultimoUso` por grupo en el documento propio de `miembros`, o el último grupo usado en este celular) y dejá escrito qué elegiste y por qué.

## Reglas específicas de esta etapa

- **Un solo grupo suscripto a la vez** (el actual), como hasta ahora; al cambiar, se cancela la suscripción y se abre la del grupo nuevo. La suscripción de Etapa 4 no debe mezclar datos entre grupos: probalo expresamente (por ejemplo, que al cambiar de grupo no queden listas del anterior un instante).
- **Los otros grupos en el panel `47` y en `48`:** muestran "N miembros · N pendientes". Eso exige leer datos de grupos que no están abiertos. **Cuidá las lecturas** (el plan gratuito tiene un tope diario): preferí consultas de conteo o lecturas puntuales al abrir el panel, y si el costo es alto, mostrá solo lo barato (por ejemplo, miembros) y decilo en la PR. No dejes listeners permanentes sobre grupos que no están abiertos.
- **Cómo se listan "mis grupos":** hace falta una forma de encontrar todos los grupos de una persona. Opciones a evaluar (elegí una y justificá):
  1. Consulta de grupo de colecciones sobre `miembros` filtrando por el `uid` de la persona y `estado == activo`. Requiere guardar el campo `uid` en cada documento de miembro (hoy el id del documento es el uid pero no hay campo), una regla para la consulta y un **índice de grupo de colecciones** (`firestore.indexes.json`, que Maira publica). Los miembros que ya existen no tienen el campo `uid`: tienen que completarlo solos al abrir la app (su propio documento del grupo actual).
  2. Una lista de grupos guardada en `usuarios/{uid}`, mantenida por la app.
  Mi inclinación es la 1, pero la 2 puede ser más simple; decidí con datos y dejalo escrito.
- **Solo lectura de un grupo archivado, hecha en el servidor:** las reglas rechazan cualquier escritura de listas, ítems, invitaciones, nombre del grupo y presencia mientras `archivado == true`. Cada escritura pasa a consultar el documento del grupo (una lectura más por escritura; es aceptable para este volumen). Se permite en un grupo archivado: **leer**, **salir** y que **quien lo creó lo desarchive**. En la app, todo lo que escribe se deshabilita o se oculta (según `52`).
- **Invitaciones:** un grupo archivado no genera invitaciones nuevas ni se puede usar una invitación vieja para unirse (las reglas lo verifican).
- **Archivar a mano ≠ "última persona sale":** el segundo caso (ya existente) deja el grupo sin miembros activos y sin acceso; el primero deja a todos con acceso de lectura. Documentalo en `ESQUEMA-DATOS.md`.
- **El "te sacaron" y el "sin grupo"** (`19`, `54`) ahora tienen que decidir adónde ir: a **otro grupo activo** si queda alguno, y a **Sin grupo** solo si no queda ninguno. Quien se queda sin grupos activos pero tiene archivados los puede abrir desde `54`.
- Textos, colores y medidas salen de `DISENO.md`. Cada archivo de `pantallas/` conserva su nombre viejo ("hogar"); el texto de las imágenes dice "grupo".
- La presencia, la purga y la limpieza de comprados siguen funcionando **por grupo** (revisalo en el grupo actual y después de cambiar de grupo).

## Cambios al esquema (actualizar `ESQUEMA-DATOS.md` en el PR 1)

1. **`hogares/{id}`** suma `tipo` (`familia`, `amigos` o `evento`; ausente = `familia`), `archivado` (booleano; ausente = `false`), `archivadoPor` y `archivadoEn`.
2. **`miembros/{uid}`** suma `uid` (para la consulta de grupo de colecciones, si se elige esa opción) y, si hace falta, `ultimoUso`.
3. **`usuarios/{uid}.hogarActualId`** pasa a significar "el último grupo usado". Sigue vacío cuando no hay ninguno.
4. Documentar la diferencia entre **archivado a mano** y **sin miembros activos**.
5. Aclarar que el nombre visible de todo esto es "grupo" aunque la colección se llame `hogares`.

## Operaciones y reglas (qué tiene que permitir y prohibir el servidor)

| Operación | Quién | Cómo |
|---|---|---|
| Crear otro grupo | Cualquier persona con sesión | Igual que crear el primero (transacción: grupo + miembro creador), con `tipo`. Pone `hogarActualId` en el grupo nuevo |
| Unirse a otro grupo | La propia persona | Igual que hoy, con una invitación válida, **solo si el grupo no está archivado**. No toca los otros grupos |
| Cambiar de grupo | La propia persona | Actualiza solo su `hogarActualId` (permitido para su documento de `usuarios`) |
| Archivar | Solo el creador actual | Pone `archivado = true`, `archivadoPor` propio y `archivadoEn`. Una sola escritura |
| Desarchivar | Solo el creador actual | Pone `archivado = false` y vacía `archivadoPor`/`archivadoEn` |
| Escribir en un grupo archivado | Nadie | Listas, ítems, invitaciones, nombre y presencia se rechazan |
| Salir de un grupo archivado | La propia persona | Permitido, como en cualquier grupo (el traspaso de rol no se hace si está archivado salvo que sea necesario para el desarchivado; decidí el caso límite y documentalo) |
| Leer un grupo archivado | Miembros activos | Igual que hoy |

## PR 1 · Esquema y reglas de seguridad

Rama: `etapa-9/01-reglas-grupos`

1. Actualizar `ESQUEMA-DATOS.md` con los cambios de arriba, y `CLAUDE.md` ("Etapa actual: 9").
2. Escribir las reglas nuevas en `firebase/firestore.rules` (tipo, archivado, solo lectura, consulta de "mis grupos" según la opción elegida) manteniendo todo lo demás.
3. Si hace falta el índice de grupo de colecciones, agregarlo en `firebase/firestore.indexes.json` y dejar escrito el comando para publicarlo.
4. Pruebas con `@firebase/rules-unit-testing`, **exhaustivas**. Como mínimo: solo el creador actual archiva y desarchiva; nadie más; un miembro no puede archivar; en un grupo archivado se rechazan todas las escrituras (listas, ítems, invitaciones, nombre, presencia) y se permiten lecturas, salir y desarchivar; nadie se une a un grupo archivado, ni con una invitación vigente; un grupo sin el campo `archivado` se comporta como no archivado; `tipo` solo admite los tres valores y no cambia después de crear (o decidí si se puede cambiar y documentalo); cada persona solo lee sus propios grupos con la consulta de "mis grupos"; una persona no lee los grupos de otra; las reglas de la Etapa 3 a 6 siguen pasando.
5. No publicar. Dejar los comandos para que Maira los publique (`npx firebase deploy --only firestore:rules,firestore:indexes --project changuito-31ec1`, o los que correspondan).

**Se comprueba cuando:** las pruebas pasan en local y en GitHub, y Maira publicó las reglas (y el índice si hizo falta). **Revisar con atención**: es el PR donde se decide quién puede escribir en un grupo archivado.

## PR 2 · Varios grupos y archivar (con los textos nuevos)

Rama: `etapa-9/02-varios-grupos`

1. **Textos "grupo"** en toda la app (pestañas, títulos, botones, avisos, errores, el mensaje de compartir y los tests). Revisá con una búsqueda de "hogar" y "Hogar" en los textos visibles. Los identificadores de código y de Firestore quedan como están.
2. **Cambiar de grupo** (`47`) y **Mis grupos** (`48`) con datos reales; la app abre el último grupo usado; Inicio con el nombre del grupo y ⌄.
3. **Crear otro grupo** (`49`, con el tipo) y **unirse a otro** (`50`), sin sacar a la persona de los otros. Avisar el límite de 10 grupos activos.
4. **Salir de un grupo teniendo otros** (`53`) y **Sin grupo** (`54`). Adaptar `27`, `28` y `19` a adónde se va después.
5. **Archivar** (`51`), **grupo archivado** (`52`) y **desarchivar**, con la app en solo lectura para ese grupo (sin botón "Nueva lista", sin campo de agregar, listas en gris con candado, sin contadores).
6. **Pestaña "Grupo"** (antes "Hogar") con la fila **Mis grupos** y **Archivar grupo** (solo para quien lo creó).
7. Errores de lectura con `32` donde corresponda. Estados sin diseño (límite de grupos, fallo al archivar o desarchivar): estilo rojo existente, avisado en la PR.
8. Tests de la lógica de selección de grupo, de salir y pasar a otro, de archivado y de los textos.

**Se comprueba cuando:** ver la secuencia de prueba.

## Secuencia de prueba con dos cuentas (A en el celular real, B en el emulador)

1. A crea el grupo "Cumple de los chicos" de tipo Evento, y B se une con el código. Cada uno ve el grupo nuevo y **sigue viendo el otro grupo** (la familia).
2. A y B cambian de grupo desde el nombre de Inicio: las listas de un grupo no aparecen en el otro, ni un instante.
3. A agrega listas e ítems en el grupo nuevo; B los ve en tiempo real.
4. A archiva el grupo: A y B lo ven pasar a "Archivados" y en solo lectura (nada se puede agregar ni editar); A puede desarchivarlo y vuelve a funcionar.
5. B sale del grupo estando en el de la familia también: pasa a la familia. A sale del último grupo que tiene: ve `54`.
6. A quita a B de un grupo: B ve el aviso `19` y pasa a su otro grupo, no a Sin grupo.
7. Probar el límite de grupos con datos de prueba si se puede.

## Cierre de la etapa

La Etapa 9 termina cuando la secuencia anterior funciona completa, las reglas están publicadas, los chequeos automáticos pasan y no queda ningún texto visible que diga "hogar". Después sigue la **Etapa 10** (decisiones: notificaciones y Play Store).

## Estado

- [x] PR 1 · Esquema y reglas (rama `etapa-9/01-reglas-grupos`; decisiones en `ESQUEMA-DATOS.md`, "Varios grupos")
- [ ] Maira publica las reglas y el índice (`npx firebase deploy --only firestore:rules,firestore:indexes --project changuito-31ec1`, desde `firebase/`)
- [ ] PR 2 · Varios grupos y archivar, **dividida en cuatro PRs** (la original pasaba de ~1.750 líneas):
  - [x] PR 2a · Textos "grupo" + datos base (rama `etapa-9/02a-textos-y-datos-base`): textos visibles y tests en "grupo"; la app lee `tipo` y `archivado`; completa su `uid` en el grupo actual
  - [x] PR 2b · Cambiar de grupo (47), Mis grupos (48), crear otro (49), unirse a otro (50), Inicio con ⌄, `ultimoUso`, límite de 10 (rama `etapa-9/02b-cambiar-de-grupo`). Quedó para 2c/2d: salir pasando a otro grupo y "te sacaron" (siguen yendo a Sin grupo aunque queden otros grupos: **mergear 2c antes de usar varios grupos en serio**); los archivados se listan en 48 pero todavía no se pueden abrir (2d)
  - [x] PR 2c · Salir con otros grupos (53), Sin grupo (54), "te sacaron" (19), 27 y 28 (rama `etapa-9/02c-salir-y-sin-grupo`). Al salir o que te saquen se pasa al grupo activo usado más recientemente (`ultimoUso`, si no hay, el más antiguo); sin ninguno va a Sin grupo (54, con "Ver mis grupos archivados (N)"). 27 y 28 ganan la línea "Vas a pasar a X". Pendiente para 2d: que la última persona al salir realmente archive el grupo (hoy el aviso lo dice pero solo sale)
  - [ ] PR 2d · Archivar y desarchivar (51, 52), solo lectura en la app, fila "Archivar grupo"
- [ ] Prueba de Maira con dos cuentas
