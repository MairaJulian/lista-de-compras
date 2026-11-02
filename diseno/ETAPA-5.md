# Etapa 5 · Funcionamiento sin conexión

> Objetivo: que Changuito **se pueda usar en el supermercado sin señal** y que la persona siempre sepa qué está pasando: qué se guardó, qué está esperando y qué falló. Contexto general: `CLAUDE.md`, `diseno/ESQUEMA-DATOS.md` (sección "Sincronización") y `diseno/PLAN-CONSTRUCCION.md`. Diseño de referencia: `05-lista` (Sincronizado), `07-lista-sin-conexion` y `37-error-guardar`.

## Cómo se trabaja esta etapa (más autónomo)

Esta etapa es **una sola PR**, de principio a fin, sin esperar indicaciones intermedias. Si al avanzar ves que supera lo revisable (por ejemplo, más de ~1.000 líneas de código sin contar tests), frená y proponé cómo dividirla.

1. Hacé todos los pasos de abajo, en orden.
2. **Verificá vos lo que se pueda automatizar** en el emulador (ver "Verificación automática") antes de abrir la PR, y dejá en la PR qué resultó y qué no.
3. En la PR, el "Cómo probarlo" tiene que ser corto y contener **solo lo que necesita los ojos de Maira o dos cuentas reales**. No le pidas repetir lo que ya verificaste.
4. Esta etapa **no cambia las reglas de Firestore**; si ves que hace falta cambiarlas, frená y avisá antes de seguir.
5. Cuando termines, actualizá el estado de este archivo y escribí un borrador de `diseno/ETAPA-6.md` (Presencia y limpieza de comprados) siguiendo `PLAN-CONSTRUCCION.md`, `ESQUEMA-DATOS.md` y el formato de las etapas anteriores, **como un commit aparte dentro de la misma PR** para que Maira lo revise. Dejá marcado con `[DECIDIR]` lo que dependa de una decisión suya.
6. Los archivos `diseno/ETAPA-5.md` y los cambios de diseño que Maira dejó sin commitear entran en esta misma PR, **como el primer commit** (solo documentación). Mostrale la lista de archivos antes de commitear.
7. En `CLAUDE.md` cambiá solo la línea "Etapa actual" a `Etapa actual: 5 → diseno/ETAPA-5.md` y agregá la sección "Proceso por etapa" que está al final de este archivo. No toques nada más.

## Alcance

**Entra:**
- Comprobar que la copia local de Firestore está activa y configurada a propósito (no por defecto).
- Indicador **Sincronizado / Sin conexión** en la pantalla Lista, aviso "N cambios sin sincronizar" y reloj en los ítems pendientes (`05`, `07`).
- Que la app **abra y se use sin conexión** (arranque en frío sin señal, con los datos ya vistos).
- Cuando vuelve la conexión, que todo se sincronice y los indicadores se limpien solos.
- Detectar que **te quitaron del hogar mientras estabas sin conexión** y mostrar el aviso `19` en lugar de un error de guardado.
- Revisar que las acciones que **exigen conexión** (crear hogar, unirse, quitar, salir, generar o desactivar invitación) fallen rápido con su mensaje y no queden colgadas.

**No entra:**
- Presencia, limpieza de comprados y purga (Etapa 6), notificaciones (Etapa 7).
- Los conflictos entre dispositivos **no se resuelven con código nuevo**: los resuelve Firestore ("gana el último por campo"). Acá solo se **comprueba** que se comportan como dice el esquema.

## Decisiones ya tomadas para esta etapa

- **Prioridad del indicador** (de mayor a menor): **Sin guardar** (error rechazado por el servidor, ya hecho en la Etapa 4) → **Sin conexión** → **Sincronizado**. Lo que está esperando conexión **no es un error**.
- **"Cambios sin sincronizar":** se cuenta por documento (un ítem con varios campos cambiados cuenta como uno), sumando los ítems de esa lista y la propia lista si tiene un cambio pendiente. Es una aproximación y está bien.
- **No se agregan pantallas nuevas.** Todo sale de `05`, `07` y `37`. Si falta un texto, usar el de `DISENO.md` (por ejemplo: "Los cambios se guardan en tu celular y se sincronizan cuando vuelva la conexión.").
- El indicador existe **solo en la pantalla Lista**, como en el diseño.

## Reglas específicas de esta etapa

- **No esperes la promesa de una escritura** para actualizar la pantalla (sin conexión no se resuelve). Esto ya se respeta desde la Etapa 4; tiene que seguir así.
- **Cómo saber si hay conexión:** dejá que Claude Code elija y justifique, en este orden de preferencia:
  1. Metadatos de las suscripciones de Firestore (`includeMetadataChanges`, `fromCache`, `hasPendingWrites`): no agregan dependencias, pero `fromCache` puede tardar unos segundos en cambiar al perder la señal.
  2. Si eso es demasiado lento para el indicador, sumar `@react-native-community/netinfo` (gratis, módulo nativo: hay que volver a compilar). Si se usa, dejar escrito por qué.
- El indicador no puede **mentir**: nunca mostrar "Sincronizado" si hay cambios pendientes o no hay conexión, ni "Sin conexión" si en realidad está todo guardado y conectado. Cuando haya duda, preferí "Sin conexión" con cambios pendientes antes que "Sincronizado".
- **Un cambio pendiente que el servidor rechaza al volver la conexión** va a `37` (Sin guardar), salvo un caso: si la persona **ya no es miembro activo**, no se muestra `37`; se descartan esos cambios fallidos y se muestra el aviso `19` ("Ya no sos parte de …") y se la lleva a Sin hogar. (El código de "te sacaron" ya existe desde la Etapa 3: reutilizalo.)
- Los tests de lógica van con Firestore simulado. El comportamiento real sin conexión **no se puede probar con Jest**: se verifica en el emulador de Android (ver abajo).

## Pasos

1. **Copia local explícita.** Configurar Firestore con la persistencia activada y un tamaño de caché definido, y dejar escrito en el README qué quedó configurado. Comprobar que no se perdió nada al reiniciar la app.
2. **Estado de conexión y de pendientes.** Una capa pequeña (por ejemplo `syncStatus`) que combine: conexión, cantidad de documentos con cambios pendientes de la lista abierta y errores rechazados. Con tests de la lógica de prioridad.
3. **Pill de la Lista y aviso `07`.** "Sincronizado" (verde), "Sin conexión" (ámbar) con el aviso "N cambios sin sincronizar" (con el singular correcto: "1 cambio sin sincronizar"), reloj en cada ítem con cambio pendiente. Al volver la conexión, se limpian solos, sin parpadeos raros.
4. **Arranque sin conexión.** Con datos ya vistos antes, abrir la app en modo avión: la sesión se conserva, aparecen Inicio, el hogar y las listas desde la copia local, sin error `32` ni pantallas de carga infinitas. Si algo en el arranque exige red (por ejemplo, leer el documento del usuario o del hogar en lugar de usar la caché), corregirlo.
5. **Te quitaron mientras estabas sin conexión** (ver regla arriba), con tests.
6. **Acciones que exigen conexión:** revisar una por una que fallan rápido con su mensaje (`26`, `31`, y los avisos de quitar, salir e invitar) y que no se quedan colgadas ni dejan escrituras en cola. Corregir lo que haga falta.
7. **README:** sección "Funcionamiento sin conexión" con cómo se detecta la conexión, qué cuenta como pendiente y cómo probarlo.

## Verificación automática (la hace Claude Code, antes de abrir la PR)

Hay un emulador Pixel 8 con la cuenta de prueba B ya iniciada en el hogar. Con `adb` se puede apagar la conexión (`adb shell svc wifi disable` y `adb shell svc data disable`, o el modo avión si esa versión de Android lo permite por línea de comandos), tocar la pantalla (`adb shell input tap`, con `uiautomator dump` para ubicar los elementos), sacar capturas y leer el log.

Con **un tope de una hora**, intentá verificar y dejar en la PR el resultado de cada punto (qué pasó realmente, no qué debería pasar):

1. Con la lista abierta, cortar la conexión: la pill pasa a "Sin conexión".
2. Sin conexión: agregar un ítem, tildar otro y editar uno. Aparecen al instante, con reloj, y el aviso dice "3 cambios sin sincronizar" (o la cuenta que corresponda).
3. Restaurar la conexión: los relojes y el aviso desaparecen y la pill vuelve a "Sincronizado".
4. Cerrar la app sin conexión y abrirla de nuevo sin conexión: se ve la lista con lo ya cargado y los cambios pendientes siguen ahí.
5. Una acción que exige conexión (por ejemplo, generar un enlace de invitación) sin señal: falla rápido con su mensaje.

Usá una lista de prueba con nombre evidente (por ejemplo "PRUEBA OFFLINE") y **borrala al terminar**. No toques las listas reales. Si el emulador no se deja automatizar en una hora, dejá solo el checklist para Maira y decilo.

## Qué le queda a Maira (corto)

Después de que Claude Code deje la PR lista, con **dos cuentas reales** (A en el celular, B en el emulador) y la app instalada con `npx expo run:android` en ambos:

1. **Dos dispositivos sin conexión editan campos distintos del mismo ítem** (A cambia la cantidad, B la nota, los dos en modo avión): al volver la conexión quedan los dos cambios.
2. **Los dos editan el mismo campo** (nombre, por ejemplo): queda el que llegó último al servidor.
3. **Uno borra y el otro tilda** el mismo ítem: queda borrado.
4. **Te quitaron sin conexión:** B en modo avión; A lo quita del hogar; B agrega un ítem y vuelve la conexión: B ve el aviso `19` y no el error de guardado.
5. **Prueba real en el supermercado** (opcional pero recomendable): usar la app sin señal en un lugar donde se corte.

## Cierre de la etapa

La Etapa 5 termina cuando:
- La verificación automática dejó resultados (o está explicado por qué no se pudo) y la prueba de Maira de arriba pasa.
- Los chequeos automáticos pasan y las reglas no cambiaron.

Al terminar, avisá que sigue la **Etapa 6 · Presencia y limpieza de comprados** y que el borrador de `ETAPA-6.md` está en la PR para revisar.

## Estado

- [x] Copia local explícita (`firestoreConfig.ts`: persistencia activada, 100 MB; ver README)
- [x] Estado de conexión y pendientes (`syncLogic.ts`, `syncStatus.ts`, `pendingStore.ts`; metadatos de Firestore, sin `netinfo`)
- [x] Pill, aviso y relojes
- [x] Arranque sin conexión (verificado en el emulador, ver la PR)
- [x] "Te quitaron" sin conexión (con tests; **el caso real con dos cuentas queda para Maira**)
- [ ] Acciones que exigen conexión revisadas: solo se verificó **generar enlace** sin señal (falla rápido con su mensaje). Faltan crear hogar, unirse, quitar, salir y desactivar enlace: usan transacciones, sin cambios en esta etapa
- [x] README
- [x] Verificación automática en el emulador (puntos 1 a 5; resultados en la PR)
- [ ] Prueba de Maira con dos cuentas
- [x] Borrador de `ETAPA-6.md`

---

## Texto para agregar a `CLAUDE.md` (sección "Proceso por etapa")

```
## Proceso por etapa

- Cuando Maira diga "seguí con la etapa actual" (o algo equivalente), leé el archivo de la etapa en curso, hacé todos los pasos pendientes y no esperes indicaciones intermedias. Una etapa = una PR, salvo que supere lo revisable (en ese caso frená y proponé cómo dividirla) o que cambie las reglas de Firestore.
- Si una etapa cambia las reglas de Firestore, hacé de eso una PR aparte, con sus pruebas, y no publiques las reglas hasta que Maira lo pida. Cuando diga "publicá las reglas", ejecutá `npx firebase deploy --only firestore:rules --project changuito-31ec1` desde la carpeta `firebase/` con su sesión ya iniciada y confirmá que quedó publicado.
- Antes de abrir la PR, verificá todo lo que se pueda con el emulador y `adb` (instalar, abrir, tocar, cortar la conexión, capturas y logs). En la PR contá qué resultó de verdad y qué no pudiste verificar. Lo que quede para Maira tiene que ser corto: solo lo que necesita ojos humanos, dos cuentas o el celular real.
- Al terminar una etapa, dejá en la misma PR un borrador del archivo de la etapa siguiente, con `[DECIDIR]` en lo que dependa de una decisión de Maira. Si la etapa siguiente necesita pantallas que todavía no están diseñadas, decilo en la PR.
- Nunca mergees ni pushees a `main`: eso lo hace Maira.
```
