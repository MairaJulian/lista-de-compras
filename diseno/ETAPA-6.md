# Etapa 6 · Presencia y limpieza de comprados (BORRADOR)

> **Borrador para que Maira revise.** Lo que depende de una decisión suya está marcado con `[DECIDIR]`. Objetivo: que al salir de una lista se limpien los ítems comprados **solo si nadie más la tiene abierta**, con aviso y "deshacer", y que la app purgue sola lo borrado hace más de 30 días. Contexto general: `CLAUDE.md`, `diseno/ESQUEMA-DATOS.md` (secciones "Presencia", "Borrado y deshacer") y `diseno/PLAN-CONSTRUCCION.md`. Diseño de referencia: `08-salir-de-la-lista` (ya existe, hoy solo con datos de ejemplo).

## Alcance

**Entra:**
- **Presencia:** mientras una lista está abierta, la app escribe `hogares/{hogarId}/presencia/{uid}` con `listaId` y `ultimoLatido` (hora del servidor) y lo renueva cada ~30 segundos. Al salir de la lista o cerrar la app se vacía `listaId`; si pasan más de ~2 minutos sin latido se considera cerrada.
- **Salir de la lista con comprados** (`08`): si hay ítems comprados y ninguna otra persona la tiene abierta, aviso "Se van a borrar N ítems comprados" y, al confirmar, se marcan como `borrado` (con `borradoPor` y `borradoEn`), con "deshacer" unos segundos. Si otra persona la tiene abierta, no se borra nada y la flecha vuelve directo a Inicio.
- **Purga automática** al abrir la app: cualquier miembro elimina de verdad los ítems con `borradoEn` de hace más de 30 días y, junto con ellos, las listas eliminadas hace más de 30 días (y los ítems de esas listas).
- **Reglas de seguridad** de `presencia` y de la eliminación real de ítems y listas, con pruebas exhaustivas.
- Hoy la sesión real **no** muestra `08` ni borra nada al salir (ver `ETAPA-4.md`, "No entra"): esta etapa lo activa.

**No entra:**
- Notificaciones y silenciar (Etapa 7). La presencia queda lista para que la Etapa 7 no avise a quien tiene la lista abierta, pero no se usa para eso todavía.
- Ajustes de notificaciones y menú de lista ampliado (Etapa 7).

## Decisiones a tomar `[DECIDIR]`

- `[DECIDIR]` **Reglas de Firestore.** Esta etapa **cambia las reglas** (nueva subcolección `presencia`, eliminación de ítems y listas vencidos). Según `CLAUDE.md`, eso va en una **PR aparte**, con sus pruebas, y las reglas no se publican hasta que Maira lo pida. Propuesta: PR 1 = reglas + pruebas; PR 2 = presencia; PR 3 = salir de la lista; PR 4 = purga.
- `[DECIDIR]` **Qué pasa con la presencia sin conexión.** Sin conexión el latido no llega al servidor: otro celular vería la lista como cerrada a los 2 minutos y podría borrar los comprados mientras alguien sigue comprando sin señal. Opciones: (a) aceptarlo y dejarlo documentado (los comprados borrados se pueden deshacer); (b) no borrar nunca si la persona que sale está sin conexión (ya que no puede saber quién más está). Propuesta: (b) para quien sale, (a) para el resto.
- `[DECIDIR]` **Tiempo del "deshacer".** El diseño no lo fija. Propuesta: el mismo aviso mínimo de la Etapa 4 ("Ítems borrados · Deshacer"), unos 5 segundos.
- `[DECIDIR]` **Qué cuenta como "tener la lista abierta".** Propuesta: latido de menos de 2 minutos y `listaId` igual a la lista, de cualquier persona activa menos quien sale. Una persona con la app en segundo plano deja de latir y deja de contar.
- `[DECIDIR]` **Dónde se purga.** Propuesta: una vez por apertura de la app, en segundo plano, después de que cargó el hogar, en tandas de hasta 500 documentos (límite de un lote), sin bloquear la pantalla. Si falla, se reintenta en la próxima apertura sin avisar.

## Pantallas

- `08-salir-de-la-lista` ya está diseñado. **El aviso de "deshacer" y los errores de esta etapa no tienen pantalla**: se reutiliza el aviso mínimo de la Etapa 4 y el estilo rojo de `31`/`37`. Hay que decirlo en la PR. Lo que falta decidir con Maira: si hace falta un texto para "no se borró nada porque otra persona tiene la lista abierta" (propuesta: ninguno, la flecha vuelve directo).

## Reglas específicas

- Escrituras **simples y por campo**, nunca transacciones, como en la Etapa 4. El latido es `setDoc` con `merge` de `listaId` y `ultimoLatido`.
- Borrar los comprados es **una escritura por ítem** (hasta 500 por lote si hace falta), con los mismos campos que borrar un ítem desde el detalle. "Deshacer" los restaura todos.
- Los nombres de campos y colecciones, tal cual `ESQUEMA-DATOS.md`.
- La purga **no** cuenta como "cambio sin sincronizar" ni cambia el indicador de la Etapa 5.

## Pasos propuestos

1. **PR 1 · Reglas.** `presencia/{uid}` (cada persona escribe solo la suya, lee cualquier miembro activo) y eliminación real de ítems (`borrado` y `borradoEn` de hace más de 30 días) y de listas vencidas. Pruebas exhaustivas con el emulador. Sin publicar.
2. **PR 2 · Presencia.** Latido, limpieza al salir y lectura de `presencia` en la suscripción del hogar.
3. **PR 3 · Salir de la lista.** Pantalla `08` con datos reales, borrado de comprados y "deshacer".
4. **PR 4 · Purga.** Al abrir la app.

## Verificación

- Con jest: lógica de "quién tiene la lista abierta" (vencimiento de 2 minutos), qué ítems se borran, orden del deshacer, tandas de la purga.
- Con el emulador y `adb`: latido visible en la consola del emulador de Firestore; salir de una lista con y sin otra persona; purga con ítems de fecha vieja.
- `[DECIDIR]` Para Maira: dos cuentas reales, una sale y no se borra nada; sale la última y se borran los comprados; el deshacer los recupera.

## Cierre de la etapa

Termina cuando, con dos personas en la misma lista, si una sale no se borra nada; cuando sale la última se borran los comprados y el deshacer los recupera; y la purga elimina lo vencido sin errores. Sigue la **Etapa 7 · Notificaciones y ajustes**.

## Estado

- [ ] PR 1 · Reglas y pruebas
- [ ] PR 2 · Presencia
- [ ] PR 3 · Salir de la lista
- [ ] PR 4 · Purga
- [ ] Prueba de Maira con dos cuentas
