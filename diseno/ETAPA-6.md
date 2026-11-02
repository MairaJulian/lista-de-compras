# Etapa 6 · Presencia y limpieza de comprados

> Decisiones de Maira ya incorporadas (ver "Decisiones tomadas"). Objetivo: que al salir de una lista se limpien los ítems comprados **solo si nadie más la tiene abierta**, con aviso y "deshacer", y que la app purgue sola lo borrado hace más de 30 días. Contexto general: `CLAUDE.md`, `diseno/ESQUEMA-DATOS.md` (secciones "Presencia", "Borrado y deshacer") y `diseno/PLAN-CONSTRUCCION.md`. Diseño de referencia: `08-salir-de-la-lista` (ya existe, hoy solo con datos de ejemplo).

## Alcance

**Entra:**
- **Presencia:** mientras una lista está abierta, la app escribe `hogares/{hogarId}/presencia/{uid}` con `listaId` y `ultimoLatido` (hora del servidor) y lo renueva cada ~30 segundos. Al salir de la lista se vacía `listaId`; **el latido se detiene cuando la app pasa a segundo plano**; si pasan más de ~2 minutos sin latido se considera cerrada.
- **Salir de la lista con comprados** (`08`): si hay ítems comprados y ninguna otra persona la tiene abierta, aviso "Se van a borrar N ítems comprados" y, al confirmar, se marcan como `borrado` (con `borradoPor` y `borradoEn`), con "deshacer" unos 8 segundos. Si otra persona la tiene abierta, no se borra nada, sin ningún texto extra: la flecha vuelve directo a Inicio.
- **Purga automática** al abrir la app: cualquier miembro elimina de verdad los ítems con `borradoEn` de hace más de 30 días y, junto con ellos, las listas eliminadas hace más de 30 días (y los ítems de esas listas).
- **Reglas de seguridad** de `presencia` y de la eliminación real de ítems (borrados hace más de 30 días, o de una lista eliminada hace más de 30 días, consultando el documento de la lista), con pruebas exhaustivas. La eliminación de listas vencidas y de ítems borrados vencidos ya existía desde la Etapa 4; esta etapa agrega `presencia` y los ítems de listas vencidas.
- **Arreglo menor (PR 2):** el singular del contador de Inicio ("1 pendiente").
- Hoy la sesión real **no** muestra `08` ni borra nada al salir (ver `ETAPA-4.md`, "No entra"): esta etapa lo activa.

**No entra:**
- Notificaciones y silenciar (Etapa 7). La presencia queda lista para que la Etapa 7 no avise a quien tiene la lista abierta, pero no se usa para eso todavía.
- Ajustes de notificaciones y menú de lista ampliado (Etapa 7).

## Decisiones tomadas

- **Dos PRs en total:** PR 1 = reglas y pruebas (sin publicar hasta que Maira lo pida); PR 2 = presencia, salir de la lista y purga.
- **Reglas:** `presencia/{uid}` y, además, permitir borrar ítems de una lista eliminada hace más de 30 días (consultando el documento de la lista), con pruebas.
- **Purga:** consulta solo por `borradoEn < fecha de corte` (sin índice compuesto). **Confirmarlo al programarla** (PR 2) contra el emulador. Una vez por apertura de la app, en segundo plano, después de que cargó el hogar, en tandas de hasta 500 documentos, sin bloquear la pantalla; si falla, se reintenta en la próxima apertura sin avisar. No cuenta como "cambio sin sincronizar".
- **Leer la presencia al salir:** una lectura puntual **forzada al servidor** (`getDocsFromServer`), no un listener permanente. Si falla o no hay conexión, **no se borra nada**. Quien sale no se cuenta a sí misma.
- **Qué cuenta como "tener la lista abierta":** `listaId` igual a la lista y `ultimoLatido` de menos de 2 minutos, de cualquier persona activa menos quien sale. Con la app en segundo plano el latido se detiene y deja de contar.
- **Deshacer:** unos 8 segundos, con el aviso mínimo de la Etapa 4 ("Ítems borrados · Deshacer").
- **Sin texto extra** cuando no se borra porque otra persona tiene la lista abierta: la flecha vuelve directo.
- **Presencia sin conexión:** (b) para quien sale (si no puede leer del servidor, no borra); (a) para el resto: un celular sin señal deja de latir y a los 2 minutos otro puede borrar los comprados; el deshacer lo cubre.

## Pantallas

- `08-salir-de-la-lista` ya está diseñado. **El aviso de "deshacer" y los errores de esta etapa no tienen pantalla**: se reutiliza el aviso mínimo de la Etapa 4 y el estilo rojo de `31`/`37`. Hay que decirlo en la PR. No hay texto para "no se borró nada porque otra persona tiene la lista abierta" (decidido: ninguno).

## Reglas específicas

- Escrituras **simples y por campo**, nunca transacciones, como en la Etapa 4. El latido es `setDoc` con `merge` de `listaId` y `ultimoLatido`.
- Borrar los comprados es **una escritura por ítem** (hasta 500 por lote si hace falta), con los mismos campos que borrar un ítem desde el detalle. "Deshacer" los restaura todos.
- Los nombres de campos y colecciones, tal cual `ESQUEMA-DATOS.md`.
- La purga **no** cuenta como "cambio sin sincronizar" ni cambia el indicador de la Etapa 5.

## Pasos

1. **PR 1 · Reglas y pruebas.** `presencia/{uid}` (cada persona escribe solo la suya; lee cualquier miembro activo) y eliminación real de ítems de una lista eliminada hace más de 30 días. Pruebas con el emulador. **Sin publicar**: Maira pide la publicación.
2. **PR 2 · Presencia, salir de la lista y purga.** Latido (se detiene en segundo plano), lectura puntual al servidor, pantalla `08` con datos reales, borrado de comprados y "deshacer", purga al abrir la app y singular de Inicio ("1 pendiente").

## Verificación

- Con jest: lógica de "quién tiene la lista abierta" (vencimiento de 2 minutos), qué ítems se borran, orden del deshacer, tandas de la purga.
- Con el emulador y `adb`: latido visible en el emulador de Firestore; salir de una lista con y sin otra persona; sin conexión no se borra nada; purga con ítems de fecha vieja.
- Para Maira: dos cuentas reales, una sale y no se borra nada; sale la última y se borran los comprados; el deshacer los recupera.

## Cierre de la etapa

Termina cuando, con dos personas en la misma lista, si una sale no se borra nada; cuando sale la última se borran los comprados y el deshacer los recupera; y la purga elimina lo vencido sin errores. Sigue la **Etapa 7 · Notificaciones y ajustes**.

## Estado

- [x] PR 1 · Reglas y pruebas (216 pruebas pasan; reglas **sin publicar**)
- [ ] Maira publica las reglas
- [ ] PR 2 · Presencia, salir de la lista y purga
- [ ] Prueba de Maira con dos cuentas
