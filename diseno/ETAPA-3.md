# Etapa 3 · Hogar e invitaciones

> Objetivo: que se pueda **crear un hogar de verdad, invitar gente, unirse, quitar miembros y salir**, con las reglas de seguridad que lo protegen. Es la etapa más delicada hasta ahora: toca permisos entre personas. Contexto general: `CLAUDE.md`, `diseno/ESQUEMA-DATOS.md` y `diseno/PLAN-CONSTRUCCION.md`. Diseño de referencia: pantallas `02`, `11` a `15`, `17` a `24`, `26` a `33` de `diseno/pantallas/`.

## Alcance

**Entra:**
- Crear hogar, ver miembros en tiempo real, editar el nombre del hogar.
- Invitaciones: crear, regenerar y desactivar el código y el enlace; vencimiento a 48 horas.
- Unirse con un código o con un enlace.
- Quitar a un miembro (solo quien creó el hogar), salir del hogar, traspaso del rol de creador y aviso de "te sacaron".
- Reglas de seguridad de `hogares`, `miembros` e `invitaciones`, con pruebas exhaustivas.
- Inicio de un hogar sin listas (`29`) y los errores `30`, `31` y `32`.
- Una página puente gratuita para que el enlace de invitación se pueda tocar en WhatsApp (último PR, opcional).

**No entra (Etapa 4 en adelante):**
- Crear y usar listas e ítems reales. Hasta entonces, un hogar nuevo muestra `29-inicio-sin-listas` y el botón **Nueva lista** todavía no crea nada real (dejalo inactivo o con un aviso temporal, y anotalo en la PR). Los datos de ejemplo siguen disponibles solo en desarrollo.
- Notificaciones.

## Decisiones ya tomadas para esta etapa

- **Quién puede editar el nombre del hogar:** cualquier miembro activo. El nombre no es sensible y mantiene la regla general de que los permisos son iguales salvo quitar miembros. Si Maira prefiere "solo quien creó el hogar", cambiar la regla y el panel.
- **Enlace de invitación:** como `changuito://...` no se puede tocar en WhatsApp, el mensaje que se comparte lleva el **código** y un **enlace https a una página puente** gratuita (Firebase Hosting, PR 7). La app también resuelve `changuito://unirse/<codigo>` cuando se abre ese enlace. Los App Links verificados quedan para más adelante.
- **Quien fue quitado o salió puede volver** a unirse con una invitación nueva y válida. Quien creó el hogar controla a quién le pasa el código.
- **Sin hogar necesita acceso a Perfil y a "Cerrar sesión"** (hoy solo se llega desde el menú DEV). Para esta etapa se autoriza agregar el avatar de perfil arriba a la derecha en `17-sin-hogar`, igual que en `11-hogar`, y avisarlo en la PR. Es la excepción a "no inventar pantallas": reusa un componente existente.

## Reglas específicas de esta etapa

- **Los permisos los decide el servidor, no la app.** Todo lo que la app impide (por ejemplo que alguien que no creó el hogar quite a otro) tiene que impedirlo también una regla de Firestore con su prueba. Las reglas autorizan por **membresía** (el documento de `miembros`), nunca por `hogarActualId` ni por `email`.
- **Sin conexión:** Firestore pone en cola las escrituras hechas sin señal y las confirma al reconectar, lo que dejaría la pantalla colgada. Las acciones que requieren al servidor (**crear hogar y unirse**) usan **transacciones** (que fallan al instante sin conexión) y muestran el error `26` (unirse) o `31` (crear hogar). Para el resto (quitar, salir, editar nombre, generar o desactivar invitación) definí el comportamiento sin conexión, documentalo en la PR y mostralo con claridad en la pantalla.
- **Código de invitación:** al menos 10 caracteres aleatorios, de un alfabeto sin caracteres ambiguos (sin `0/O`, `1/I/L`), generados con una fuente criptográfica, con el formato de `K7P2-9XQ-4MN`. Se lee de a uno; **no se puede listar** la colección `invitaciones`.
- **Privacidad:** en `miembros` se guardan nombre, foto y color, **no el correo**. Las demás personas no necesitan ver tu email.
- **Datos de otro usuario:** nadie lee `usuarios/{otro}`. Para mostrar nombre y foto de un miembro se usa la copia que cada persona guarda en su propio documento de `miembros` al unirse (y que refresca ella misma).
- Textos, colores y medidas salen de `DISENO.md`.
- La pantalla de prueba `ping` y su emulador siguen usando solo reglas del emulador.

## Cambios al esquema (actualizar `ESQUEMA-DATOS.md` en el PR 1)

1. **`hogares/{hogarId}`** suma `invitacionActivaId` (código vigente o vacío). Como `invitaciones` no se puede listar, así se encuentra la invitación actual con una lectura directa.
2. **`invitaciones/{codigo}`** suma `hogarNombre` e `invitadoPorNombre`, copiados al crearla. Quien recibe la invitación todavía no es miembro y no puede leer el hogar, y la pantalla `02` tiene que mostrar el nombre del hogar y quién invitó. Puede quedar desfasada si después se renombra el hogar: es aceptable; al regenerar la invitación se actualiza.
3. **`hogares/{hogarId}`** suma también `creadorActualId` (agregado en el PR 1): sin él las reglas no pueden comprobar que el hogar nunca queda con miembros activos y sin creador activo. Ver `ESQUEMA-DATOS.md`.
4. **`miembros/{uid}`** guarda `nombre`, `foto`, `colorAvatar` (el primer color no usado por miembros activos), `rol`, `estado`, `desde`, `hasta`, `invitacionId`, `invitadoPor`.
5. Documentar los estados de `miembros`: `activo`, `salio`, `quitado`.

## Operaciones y reglas (qué tiene que permitir y prohibir el servidor)

| Operación | Quién | Cómo |
|---|---|---|
| Crear hogar | Cualquier persona con sesión | En una sola transacción: crea `hogares/{id}` con `creadoPor` = su uid, crea su `miembros/{uid}` con rol `creador` y estado `activo`, y pone `hogarActualId` en su usuario. Las reglas verifican con `getAfter` que quede el miembro creador |
| Leer hogar y sus miembros | Solo miembros `activo` | Más: cada persona siempre puede leer **su propio** documento de `miembros` (para enterarse de que la sacaron) |
| Editar nombre del hogar | Cualquier miembro activo | Solo el campo `nombre`; `creadoPor` no cambia |
| Crear invitación | Cualquier miembro activo | Vence 48 h después; guarda `hogarNombre` e `invitadoPorNombre`; actualiza `invitacionActivaId` y revoca la anterior |
| Leer invitación | Cualquier persona con sesión, de a una | Sin listar |
| Desactivar invitación | Cualquier miembro activo del hogar | `estado = revocada` y `invitacionActivaId` vacío |
| Unirse | La propia persona | Crea (o reactiva) su `miembros/{uid}` con rol `miembro`, solo si la invitación existe, está `activa`, no venció y es de ese hogar. Transacción |
| Quitar | Solo el rol `creador` | Pone a otro miembro en `quitado` con `hasta`. No puede quitarse a sí mismo (eso es salir) |
| Salir | La propia persona | Pone su estado en `salio` con `hasta` y vacía su `hogarActualId`. Si es el creador y hay otros miembros activos, en el mismo lote pasa el rol `creador` a quien lleva más tiempo (menor `desde`) y ella queda como `miembro`. Si es la última persona, solo sale |
| Quien fue quitado | Se entera al abrir | Al detectar que su `miembros` ya no está `activo`, muestra el aviso `19` y vacía su propio `hogarActualId` |

Nunca puede quedar un hogar con miembros activos y **ningún** creador activo. Las reglas lo verifican con `getAfter`.

## PR 1 · Esquema y reglas de seguridad de hogares

Rama: `etapa-3/01-reglas-hogares`

1. Actualizar `ESQUEMA-DATOS.md` con los cambios de arriba.
2. Escribir las reglas de `hogares`, `miembros` e `invitaciones` en `firebase/firestore.rules`, manteniendo las de `usuarios` y todo lo demás bloqueado.
3. Pruebas con `@firebase/rules-unit-testing`, **exhaustivas**. Como mínimo: un miembro lee su hogar y un ajeno no; crear hogar solo con el miembro creador; unirse con invitación válida, vencida, revocada, de otro hogar y con un código inexistente; no se puede unir con un rol de creador; solo el creador quita, y no a sí mismo; salir y traspaso del rol; el hogar nunca queda sin creador con miembros activos; un `quitado` puede volver con invitación nueva; no se puede listar `invitaciones`; ningún acceso sin sesión; nada de otros usuarios.
4. No publicar. Dejar el comando para que Maira lo haga: `firebase deploy --only firestore:rules --project changuito-31ec1`.

**Se comprueba cuando:** las pruebas pasan en local y en GitHub, y Maira publicó las reglas. **Revisar con especial atención** este PR: es donde se decide quién puede hacer qué.

## PR 2 · Crear hogar y Inicio sin listas

Rama: `etapa-3/02-crear-hogar`

1. **Crear hogar** (`20`, `21`) con el nombre elegido, usando una transacción y el estado de carga mientras se crea. Si falla o no hay conexión: `31-error-crear-hogar`, conservando el nombre escrito, con "Reintentar" y "Ahora no" (vuelve a `17`).
2. Con hogar y sin listas → **Inicio sin listas** (`29`). Al abrir la app con un hogar, leer el hogar y su membresía; si falla la lectura, `32-error-carga` con "Reintentar".
3. Rutas protegidas actualizadas: sin sesión → Bienvenida; con sesión y sin hogar → Sin hogar; con hogar → Inicio.
4. Avatar de perfil arriba a la derecha en `17-sin-hogar`, que lleva a Perfil.
5. Tests de la lógica.

**Se comprueba cuando:** con la cuenta de Maira se crea un hogar, aparece en la consola de Firebase con su miembro creador, se ve Inicio sin listas, al reabrir la app sigue ahí, y desde Sin hogar se puede entrar a Perfil y cerrar sesión.

## PR 3 · Hogar en tiempo real y editar nombre

Rama: `etapa-3/03-hogar-tiempo-real`

1. Pestaña **Hogar** (`11`) con datos reales: nombre del hogar y miembros activos con su rol y avatar (color y nombre), actualizados en tiempo real. El botón de la fila propia dice "Creaste el hogar" si sos el creador.
2. **Editar el nombre del hogar** (`33`): panel con el nombre actual, **Guardar** deshabilitado si queda vacío, y los errores correspondientes.
3. Errores de lectura con `32`.
4. Tests.

**Se comprueba cuando:** el nombre editado se ve en Hogar y en la consola de Firebase, y un segundo dispositivo con la misma cuenta lo ve cambiar en tiempo real.

## PR 4 · Invitaciones

Rama: `etapa-3/04-invitaciones`

1. **Invitar** (`12`): muestra el código y el enlace de la invitación vigente (leyendo `invitacionActivaId`), "Vence en N h", y los botones Copiar, Compartir, **Generar enlace nuevo** y **Desactivar enlace** (`23`, con confirmación). Si no hay invitación activa o venció: `22-invitar-sin-enlace` con "Generar enlace nuevo".
2. **Compartir:** el mensaje lleva el código y el enlace (de momento `changuito://unirse/<codigo>`; en el PR 7 pasa a ser el enlace https de la página puente).
3. Desde `21-hogar-creado`, "Invitar" lleva a esta pantalla.
4. Tests de la generación de códigos (formato, longitud, aleatoriedad razonable) y de la lógica de vencimiento.

**Se comprueba cuando:** se genera un código, aparece en Firestore con vencimiento a 48 h, "Generar enlace nuevo" revoca el anterior, "Desactivar" deja la pantalla sin enlace, y el mensaje de compartir sale correctamente en WhatsApp.

## PR 5 · Unirse

Rama: `etapa-3/05-unirse`

1. **Con un código** (`18`): se escribe o pega, y "Unirme" se habilita al haber texto. Si el código no existe, está revocado o venció: `30-error-codigo`.
2. **Con un enlace** `changuito://unirse/<codigo>`: ruta que abre la pantalla `02-invitacion-recibida` con el nombre del hogar y quién invitó. Si el enlace es inválido: `24-error-enlace-invalido`. Si la persona no tiene sesión, conservar el código mientras inicia sesión y continuar después.
3. **Confirmar:** crea la membresía con una transacción. Sin conexión: `26-error-sin-conexion-unirse` con "Reintentar".
4. Tras unirse, ir a Inicio, que sigue sin listas.
5. Tests.

**Se comprueba cuando:** con la cuenta de prueba en el emulador se pega el código que generó la cuenta de Maira, aparece la pantalla de invitación con el nombre correcto, y al unirse la cuenta de Maira ve al nuevo miembro **en tiempo real** en Hogar. Un código revocado o vencido muestra el error.

## PR 6 · Quitar, salir, traspaso y "te sacaron"

Rama: `etapa-3/06-quitar-salir`

1. **Opciones de miembro** (`13`) solo para quien creó el hogar y solo sobre otros miembros, **Confirmar quitar** (`14`).
2. **Salir del hogar:** elige la variante según los datos reales: común (`15`), quien creó el hogar con otros miembros (`27`, mostrando a quién pasa el rol) o la última persona (`28`). Hace el traspaso en un solo lote, vacía `hogarActualId` y lleva a Sin hogar.
3. **Te sacaron** (`19`): al abrir la app o mientras está abierta, si la membresía deja de estar activa, mostrar el aviso y llevar a Sin hogar, vaciando el `hogarActualId` propio.
4. Un miembro quitado o que salió puede volver con una invitación nueva.
5. Tests de cada variante y del traspaso.

**Se comprueba cuando:** se prueba la secuencia completa con dos cuentas (ver abajo).

## PR 7 · Página puente para el enlace (opcional)

Rama: `etapa-3/07-pagina-puente`

1. Una página mínima en Firebase Hosting (plan gratuito) en `/unirse/<codigo>`: muestra el código, un botón "Abrir Changuito" que intenta abrir `changuito://unirse/<codigo>`, y la indicación de pegar el código si no se abre. Sin registrar datos ni usar analytics.
2. Configuración de Hosting en `firebase/`. **No publicar:** dejar el comando para que Maira lo haga (`firebase deploy --only hosting --project changuito-31ec1`). Confirmar antes que esto no requiere facturación.
3. El mensaje de compartir pasa a usar el enlace https de esa página.

**Se comprueba cuando:** el enlace llega por WhatsApp como enlace tocable y abre la página; el botón abre la app en la pantalla de invitación.

## Secuencia de prueba con dos cuentas (cuenta A: Maira en el celular real; cuenta B: de prueba en el emulador)

1. A crea el hogar "Nuestra casa" y ve Inicio sin listas.
2. A genera una invitación; B pega el código y se une. A ve a B aparecer en Hogar **sin recargar**.
3. B edita el nombre del hogar; A lo ve cambiar.
4. A quita a B; B ve el aviso "Ya no sos parte de Nuestra casa" y queda en Sin hogar.
5. B intenta unirse con el mismo código (que A ya revocó o regeneró): error de código.
6. A genera una invitación nueva y B vuelve a unirse.
7. B sale por su cuenta: A ve el cambio.
8. B vuelve a unirse; A (creadora) sale: el rol pasa a B y A queda en Sin hogar.
9. B (ahora creadora y única) sale: el hogar queda sin miembros activos.
10. Probar los errores: unirse sin conexión, crear hogar sin conexión.

## Cierre de la etapa

La Etapa 3 termina cuando:
- La secuencia de prueba con dos cuentas funciona entera.
- Las pruebas de reglas de seguridad pasan en local y en GitHub, y las reglas están publicadas.
- Los chequeos automáticos pasan.

Al terminar, actualizá esta sección y avisá que sigue la **Etapa 4 · Listas e ítems en tiempo real**.

Antes de la Etapa 4 conviene diseñar, en Claude Design, el menú de lista (renombrar, eliminar) y el error al guardar cambios. Dejalo como recordatorio.

## Estado

- [x] PR 1 · Esquema y reglas de seguridad de hogares (111 pruebas de reglas)
- [x] Maira publica las reglas
- [x] PR 2 · Crear hogar y Inicio sin listas (mergeado; ver "Notas del PR 2")
- [x] PR 3 · Hogar en tiempo real y editar nombre (en revisión; ver "Notas del PR 3")
- [ ] PR 4 · Invitaciones
- [ ] PR 5 · Unirse
- [ ] PR 6 · Quitar, salir, traspaso y "te sacaron"
- [ ] PR 7 · Página puente para el enlace (opcional)

### Notas del PR 2

- **Qué queda para PR 3 y siguientes:** en la sesión real, Hogar muestra solo a quien tiene la sesión (se lee su propio documento de `miembros`); la lista de miembros en tiempo real, Invitar, quitar y salir siguen con datos de ejemplo hasta los PR 3 a 6. El error `32` está en Inicio; Hogar lo suma en el PR 3. *(La lista de miembros y el `32` en Hogar quedaron en el PR 3.)*
- **Nueva lista** en un hogar real muestra un aviso temporal ("Las listas llegan en la próxima etapa") y no crea nada.
- **Si la membresía deja de estar activa** (te sacaron) la lectura falla y hoy se ve el error `32`; el aviso `19` llega en el PR 6.

### Notas del PR 3

- **Miembros en tiempo real:** además del hogar y la membresía propia, se escucha la colección `miembros` filtrada por `estado == 'activo'` (las reglas dejan listarla solo a miembros activos). Se ordenan del que lleva más tiempo al que se sumó último; quien todavía no tiene la hora del servidor va al final. La fila propia dice "Vos".
- **Editar el nombre (`33`):** lápiz en la tarjeta del hogar, visible para cualquier miembro (decisión de la etapa). Solo escribe el campo `nombre` (máximo 60, sin vacío).
- **Sin conexión, editar el nombre:** usa una transacción, igual que crear hogar: falla al instante y el panel muestra "No pudimos guardar el nombre. Revisá tu conexión y probá de nuevo.", conserva lo escrito y deja reintentar. Así no queda una escritura en cola que se aplique sola horas después y pise el cambio de otra persona. El nombre nuevo se ve cuando llega la lectura en tiempo real. El texto del error es mío: el diseño no trae una variante para este caso.
- **Error `32` en Hogar:** si falla alguna lectura, Hogar muestra el mismo estado que Inicio con "Reintentar"; el avatar de Perfil sigue disponible arriba.
- **Qué sigue con datos de ejemplo:** Invitar, las opciones de miembro, quitar y salir (PR 4 a 6).
