# Etapa 7 · Notificaciones y ajustes (BORRADOR)

> **POSPUESTA (decisión de Maira, Etapa 8):** primero se usa la app en casa unas semanas y después se decide si los avisos hacen falta y con qué opción se envían. Este borrador queda como está hasta entonces. Ver `ETAPA-8.md`.

> **Borrador para que Maira revise.** Lo que depende de una decisión suya está marcado con `[DECIDIR]`. Objetivo: que cuando una persona agrega o borra ítems, las demás reciban **un solo aviso agrupado** (si no tienen esa lista abierta), que al tocarlo se abra la lista, y poder silenciar listas o apagar los avisos. Contexto general: `CLAUDE.md`, `diseno/ESQUEMA-DATOS.md` (secciones "Notificaciones", `presencia`, `eventos`, `usuarios/{uid}.preferencias`) y `diseno/PLAN-CONSTRUCCION.md`. Diseño de referencia: `09-notificacion` y `34-menu-lista`.

## Alcance

**Entra:**
- **Cómo se envían los avisos.** Un celular no le puede mandar una notificación a otro: hace falta algo que la envíe. Es la decisión más grande de la etapa (ver abajo).
- **Registrar el dispositivo** (token de FCM) en `usuarios/{uid}/dispositivos/{id}` y limpiarlo al cerrar sesión.
- **Eventos** (`hogares/{hogarId}/eventos`): uno por acción de agregar o borrar ítems (tipo, lista, autor, cantidad, hora).
- **Agrupar avisos:** los cambios de una persona en una lista se juntan dentro de ~30 segundos en un solo aviso ("Lucía agregó 2 ítems").
- **A quién no se avisa:** a quien hizo el cambio, a quien tiene esa lista abierta (la **presencia** que dejó lista la Etapa 6: `listaId` igual y `ultimoLatido` de menos de 2 minutos), a quien silenció la lista y a quien desactivó los avisos.
- **Al tocar el aviso** se abre esa lista.
- **Ajustes de notificaciones** (`preferencias.avisarAgregadosBorrados`) y **silenciar listas** (`preferencias.listasSilenciadas`).
- **Menú de lista ampliado:** agrega "Silenciar" a renombrar y eliminar (`34-menu-lista`).
- **Reglas de Firestore** de `eventos` y `dispositivos`, con pruebas.

**No entra:**
- Avisos por otras acciones (tildar, renombrar, eliminar lista, entrar o salir del hogar): el diseño solo cubre agregar y borrar ítems.
- Notificaciones en iPhone (solo Android).

## Decisiones a tomar `[DECIDIR]`

- `[DECIDIR]` **Cómo se envían los avisos** (las tres opciones de `ESQUEMA-DATOS.md`, "Notificaciones"):
  1. Plan Blaze con Cloud Functions (sin tope de gasto duro, solo alertas de presupuesto). **Pide tarjeta**: según `CLAUDE.md` está prohibido sin que Maira lo decida explícitamente.
  2. Un servicio externo gratuito que reciba el evento y envíe el aviso por FCM (por ejemplo, un cron o un webhook en un servicio con plan gratis). Queda una pieza fuera de Firebase para mantener, y hay que cuidar la clave de servicio de FCM (nunca en el repo).
  3. Sin avisos por ahora: los cambios igual se ven en tiempo real con la app abierta. La etapa se reduce a ajustes y silenciar, que no tendrían efecto hasta que haya avisos.
  Propuesta: decidir con Maira antes de empezar; si no hay una opción gratuita que le convenza, elegir la 3 y dejar la etapa en "ajustes + registro del dispositivo".
- `[DECIDIR]` **Con la app cerrada del todo.** Las notificaciones del sistema llegan con la app cerrada, pero agrupar y filtrar "tiene la lista abierta" lo tiene que hacer quien envía (no el celular que recibe). Confirmar que eso es aceptable con la opción elegida.
- `[DECIDIR]` **Pantalla de ajustes de notificaciones.** No está diseñada. Propuesta: un interruptor "Avisarme cuando agreguen o borren ítems" en `Perfil` y la lista de listas silenciadas dentro del menú de cada lista, sin pantalla nueva.
- `[DECIDIR]` **Permiso de notificaciones en Android 13+.** Cuándo pedirlo (propuesta: la primera vez que se entra a un hogar, con una explicación breve; el texto no está diseñado).
- `[DECIDIR]` **Reglas de Firestore.** Esta etapa cambia las reglas (`eventos`, `dispositivos`). Según `CLAUDE.md`, va en una PR aparte, con pruebas, y las reglas no se publican hasta que Maira lo pida.

## Pantallas

- `09-notificacion` está diseñada (aviso de Android con el texto agrupado). `34-menu-lista` ya está implementado con "Renombrar" y "Eliminar"; falta "Silenciar".
- **Sin diseñar:** pantalla o sección de ajustes de notificaciones, el pedido de permiso, el estado de una lista silenciada (¿icono en la tarjeta de Inicio?) y los errores. Hay que decirlo en la PR y, si Maira no los diseña, reutilizar componentes existentes y avisarlo.

## Reglas específicas

- Escrituras **simples y por campo**, como en las etapas anteriores. `preferencias` se edita con actualizaciones de campos sueltos.
- Los nombres de campos y colecciones, tal cual `ESQUEMA-DATOS.md`.
- Textos en español rioplatense: "Lucía agregó 2 ítems", "Diego borró un ítem".
- Nada de claves ni tokens en el repo.

## Pasos propuestos

1. **Decisión** de cómo se envían los avisos (con Maira) y borrador de la solución elegida.
2. **PR 1 · Reglas** de `eventos` y `dispositivos`, con pruebas. Sin publicar.
3. **PR 2 · Registro del dispositivo y permiso**, `preferencias` y ajustes.
4. **PR 3 · Eventos y envío de avisos** (según la opción elegida), con agrupado y filtros.
5. **PR 4 · Menú de lista: silenciar** y abrir la lista al tocar el aviso.

## Verificación

- Con jest: agrupado (ventana de ~30 segundos), a quién se avisa y a quién no (autor, lista abierta, silenciada, avisos apagados), texto del aviso en singular y plural.
- Con el emulador y `adb`: el aviso de prueba con `adb` / FCM de prueba, abrir la lista al tocarlo.
- `[DECIDIR]` Para Maira: dos cuentas reales; una agrega ítems con la app del otro cerrada y al otro le llega **un solo aviso agrupado** que abre esa lista.

## Cierre de la etapa

Termina cuando una persona agrega ítems con la app del otro cerrada y a este le llega un solo aviso agrupado que abre esa lista, sin avisar a quien tiene la lista abierta, a quien la silenció ni a quien apagó los avisos. Sigue la **Etapa 8 · Pulido y uso real**.

## Estado

- [ ] Decidir cómo se envían los avisos
- [ ] PR 1 · Reglas y pruebas
- [ ] PR 2 · Dispositivo, permiso y ajustes
- [ ] PR 3 · Eventos y envío
- [ ] PR 4 · Silenciar y abrir la lista
- [ ] Prueba de Maira con dos cuentas
