# Changuito · Esquema de datos (Firebase / Firestore)

> Complemento de `DISENO.md`. Describe qué se guarda en Firestore, cómo se relaciona y qué reglas de seguridad hacen falta. Los nombres de campos son una propuesta; se pueden ajustar al programar.

## Stack y decisiones que condicionan el esquema

- **App:** React Native + TypeScript, solo Android por ahora (iOS posible más adelante con el mismo código).
- **Backend:** Firebase en plan gratuito (Spark): Authentication (Google), Firestore y, más adelante, FCM. Sin Cloud Functions (exigen el plan de pago).
- Login solo con Google. Firebase Authentication ya separa la cuenta del método de acceso: un mismo usuario puede vincular otros proveedores después (email, etc.), así que no hace falta una tabla propia de "métodos de acceso".
- **Nombre visible: "grupo".** En la interfaz todo se llama grupo (la familia, una juntada, un cumpleaños), pero la colección y los campos siguen llamándose `hogares`, `hogarId`, `hogarActualId`, etc. No se renombran para no romper los datos existentes.
- Varias listas por grupo. Una persona puede estar en **varios grupos** a la vez (Etapa 9); la app tiene uno abierto (el último usado).
- Tiempo real + sin conexión: los provee el SDK de Firestore (copia local, cola de escrituras pendientes y listeners en vivo). **No hace falta registro de cambios numerado.**
- Si hay conflicto, **gana el último cambio recibido por el servidor, por campo**.
- Notificaciones solo al agregar o borrar ítems (se resuelven en la última etapa; ver "Notificaciones").
- Al salir de una lista se borran los comprados, **solo si nadie más la tiene abierta**, con deshacer.
- Cualquiera puede salir del hogar; solo quien lo creó puede quitar a otros.

## Estructura en Firestore

```
usuarios/{uid}
  └─ dispositivos/{dispositivoId}
invitaciones/{codigo}
hogares/{hogarId}
  ├─ miembros/{uid}
  ├─ listas/{listaId}
  ├─ items/{itemId}
  ├─ presencia/{uid}
  └─ eventos/{eventoId}        (reservado para notificaciones)
```

Los ítems están **planos a nivel de hogar** (con `listaId`), no dentro de cada lista. Así una sola suscripción trae todo el hogar: sirve para los contadores de la pantalla Inicio y para que todo funcione sin conexión. Un hogar de pocas personas maneja unos cientos de ítems como mucho, muy por debajo del cupo gratuito.

### `usuarios/{uid}` (el id es el de Firebase Auth)
| Campo | Notas |
|---|---|
| nombre, email, foto | Vienen de la cuenta de Google |
| creadoEn | |
| hogarActualId | **Último grupo usado** (el que abre la app). Vacío = estado "sin grupo" (no tiene ninguno activo). Cambiar de grupo actualiza solo este campo. No da ningún permiso |
| preferencias.avisarAgregadosBorrados | Sí / no (por defecto, sí) |
| preferencias.listasSilenciadas | Lista de `listaId` |

### `usuarios/{uid}/dispositivos/{dispositivoId}`
| Campo | Notas |
|---|---|
| tokenNotificaciones | A dónde mandar los avisos; se elimina al cerrar sesión |
| ultimaConexion | |

### `hogares/{hogarId}`
| Campo | Notas |
|---|---|
| nombre | Ej.: "Nuestra casa" |
| creadoPor | uid del creador original |
| creadoEn | |
| invitacionActivaId | Código de la invitación vigente, o vacío. Como `invitaciones` no se puede listar, así se encuentra la actual con una lectura directa |
| creadorActualId | uid de quien tiene hoy el rol `creador`. Cambia solo en el traspaso. Las reglas lo usan para comprobar que el hogar siempre tiene un creador activo y para no admitir miembros en un hogar sin creador activo |
| tipo | `familia`, `amigos` o `evento`. Ausente = `familia` (los grupos anteriores a la Etapa 9, sin migración). Solo cambia el aspecto (color e ícono) y un aviso al crear un evento. **Se elige al crear y no cambia después** (las reglas lo rechazan) |
| archivado | Booleano. Ausente = `false`. Con `true` el grupo queda en **solo lectura** para todos (ver abajo) |
| archivadoPor, archivadoEn | Quién lo archivó (uid propio) y cuándo (hora del servidor). Se vacían al desarchivar |

**Archivado a mano ≠ sin miembros activos** (dos situaciones distintas):

| | Archivado a mano | Sin miembros activos |
|---|---|---|
| Cómo se llega | El creador actual pone `archivado = true` | La última persona sale (sin cambiar su rol) |
| Acceso | Todos los miembros activos **siguen leyendo** | **Nadie** lo lee (las reglas piden ser miembro activo) |
| Escrituras | Rechazadas (solo lectura), salvo salir, traspasar el rol de creador y desarchivar | Imposibles: no queda quien escriba |
| Se revierte | El creador lo desarchiva | No se revierte (nadie puede unirse: no hay creador activo) |

El grupo no se borra nunca: solo se archiva (o queda abandonado).

### `hogares/{hogarId}/miembros/{uid}`
| Campo | Notas |
|---|---|
| rol | `creador` o `miembro` |
| estado | `activo` (es parte del hogar), `salio` (se fue por su cuenta) o `quitado` (lo sacó quien creó el hogar) |
| nombre, foto | Copia de los datos del usuario, para que los demás miembros los vean sin leer su perfil. **No se guarda el correo.** Cada persona refresca la suya |
| uid | uid de la persona (igual al id del documento). Sirve para la consulta de grupo de colecciones "mis grupos". Los miembros anteriores a la Etapa 9 no lo tienen: la app lo completa sola al abrir (su propio documento del grupo actual) |
| ultimoUso | Hora del servidor en que la persona abrió este grupo por última vez. La app lo marca al cambiar de grupo. Sirve para elegir a qué grupo pasar cuando sale de uno o la sacan |
| colorAvatar | Asignado al unirse: el primer color no usado por miembros activos |
| desde, hasta | Fechas de entrada y salida |
| invitacionId | Invitación con la que entró (para mostrar "te invitó X") |
| invitadoPor | uid de quien creó esa invitación |

No se borra el documento al salir: queda como historial y permite seguir mostrando "agregado por" en ítems viejos.

### `invitaciones/{codigo}` (nivel raíz)
| Campo | Notas |
|---|---|
| hogarId | |
| creadaPor | |
| venceEn | 48 horas desde que se crea (las reglas aceptan hasta 48 h + 5 min por diferencias de reloj) |
| estado | `activa` o `revocada` |
| hogarNombre | Nombre del hogar, copiado al crearla (las reglas comprueban que sea el real). Quien recibe la invitación todavía no puede leer el hogar. Puede quedar desfasado si se renombra el hogar; se actualiza al regenerar |
| invitadoPorNombre | Nombre de quien la creó, copiado al crearla (también verificado) |

- El **id del documento es el código** que va dentro del enlace y que también se puede escribir a mano. Formato como `K7P2-9XQ-4MN`: al menos 10 caracteres aleatorios (sin contar guiones) de un alfabeto sin caracteres ambiguos (sin `0/O`, `1/I/L`), generados con una fuente criptográfica. Las reglas exigen letras, números y guiones, con al menos 10 caracteres que no sean guiones. Se pueden leer de a una, no listar.
- Puede usarla más de una persona hasta que venza o se revoque. Regenerar = revocar la actual y crear otra.
- Está en el nivel raíz porque quien llega con el enlace todavía no es miembro y no puede leer el hogar.

### `hogares/{hogarId}/listas/{listaId}`
| Campo | Notas |
|---|---|
| nombre, color | Nombre: texto no vacío, máximo 80 caracteres. Color: uno de los cuatro del diseño (`green`, `amber`, `blue`, `neutral`) |
| icono | Sin uso por ahora (las reglas no lo admiten hasta que haga falta) |
| creadaPor, creadaEn | `creadaEn` usa la hora del servidor. No cambian |
| eliminada, eliminadaPor, eliminadaEn | Marca de borrado (se purga como los ítems). `eliminada` se escribe siempre (`false` al crear) y solo puede pasar de `false` a `true`, en una sola escritura con los tres campos (`eliminadaPor` = quien la elimina, `eliminadaEn` con la hora del servidor). Una lista eliminada no se modifica más |

- Cualquier miembro activo puede crear, renombrar (o cambiar el color) y eliminar una lista.
- Eliminar una lista **no toca sus ítems**: la app ignora los ítems cuya lista está eliminada, y la purga de la Etapa 6 los limpia junto con la lista. Solo se borra de verdad una lista eliminada hace más de 30 días.

### `hogares/{hogarId}/items/{itemId}`
| Campo | Notas |
|---|---|
| listaId | No cambia |
| nombre | Texto no vacío, máximo 120 caracteres |
| cantidad | Entero positivo opcional (el del − / +). Ausente = 1 |
| unidad | Texto opcional (máximo 30): "kg", "docena", "pack". Existe en el esquema, pero **todavía no tiene interfaz** |
| nota | Opcional, máximo 500 caracteres |
| comprado | Booleano, **se escribe siempre** (`false` al crear) |
| agregadoPor, agregadoEn | `agregadoEn` usa la hora del servidor. Ninguno de los dos cambia |
| tildadoPor, tildadoEn | Al tildar: uid de quien tilda y hora del servidor. Vacíos (o ausentes) si no está comprado |
| borrado, borradoPor, borradoEn | Marca de borrado (ver "Borrado y deshacer"). `borrado` **se escribe siempre** (`false` al crear). Al borrar: uid de quien borra y hora del servidor; al deshacer se vacían |

- **Consulta de ítems del hogar:** `borrado == false`. Por eso `borrado` tiene que existir siempre. Un ítem que pasa a borrado sale del resultado y los demás celulares lo ven desaparecer.
- Los ítems de una lista eliminada se ignoran en la app; los purga la Etapa 6 junto con la lista.
- Las reglas no comprueban que `listaId` exista (un ítem huérfano es inofensivo y evita una lectura por escritura).
- El id del ítem lo genera el celular, así se pueden crear ítems sin conexión sin chocar con otros.
- Avatar de la fila: el de `agregadoPor` mientras está pendiente, el de `tildadoPor` cuando pasa a comprados.
- **Regla de programación:** los cambios se hacen siempre con actualizaciones de campos sueltos, nunca reescribiendo el documento entero. De eso depende que "gana el último, por campo" funcione.

### `hogares/{hogarId}/presencia/{uid}` (datos temporales)
| Campo | Notas |
|---|---|
| listaId | Lista que tiene abierta (vacío si ninguna) |
| ultimoLatido | Hora del servidor, se renueva cada ~30 segundos mientras la lista está abierta. Si pasaron más de ~2 minutos, se considera cerrada |

Es un solo documento por persona, siempre sobrescrito. El margen de 2 minutos absorbe diferencias entre el reloj del celular y el del servidor.

### `hogares/{hogarId}/eventos/{eventoId}` (reservado)
Para las notificaciones: un evento por acción de agregar o borrar (tipo, lista, autor, cantidad, hora). Se define en la última etapa según la opción elegida; ver "Notificaciones".

## Sincronización

**Sin conexión:** la copia local y la cola de cambios pendientes las maneja el SDK de Firestore. Las escrituras hechas sin señal se aplican en el celular al instante y se envían al volver la conexión. La app lee del SDK si un dato todavía no se confirmó, y de ahí sale el indicador "Sincronizado / Sin conexión" y el aviso "N cambios sin sincronizar".

**Tiempo real:** con la app abierta, una suscripción por hogar recibe los cambios al instante. Si la app estuvo cerrada o sin señal, se pone al día sola al reconectar.

### Conflictos (gana el último, por campo)
| Situación | Resultado |
|---|---|
| Uno cambia la cantidad y otro agrega una nota | Se conservan los dos |
| Los dos cambian el mismo campo | Queda el cambio que el servidor recibió último |
| Uno borra un ítem y otro lo tilda después | Queda borrado (el borrado es un campo aparte). Vuelve solo con "deshacer" o agregándolo de nuevo |
| Dos agregan el mismo producto a la vez | Quedan dos ítems |
| Alguien edita sin conexión y mientras tanto lo quitaron del grupo | Las reglas rechazan esos cambios; la app detecta el rechazo y muestra "Ya no sos parte de [grupo]" |
| Alguien edita sin conexión y mientras tanto archivaron el grupo | Las reglas rechazan esos cambios (solo lectura); la app lo trata como un rechazo de escritura |

Detalle a tener presente: un cambio hecho sin conexión y enviado horas después igual cuenta como "el último" cuando llega. Es la regla acordada.

### Borrado y deshacer
- Borrar un ítem lo **marca** (`borrado = true`); no lo elimina. Así funciona el "deshacer" y el borrado llega a celulares que estaban sin conexión.
- **Purga a los 30 días:** no hay servidor que lo haga, así que lo hace la propia app: al abrirse, cualquier miembro elimina los ítems marcados hace más de 30 días. Las reglas solo permiten eliminar de verdad ítems en esa condición.
- **Salir de una lista:** si hay ítems comprados y ningún otro miembro la tiene abierta (según presencia), se marcan como borrados todos los comprados, con aviso de confirmación y "deshacer" disponible unos segundos. Si otro miembro la tiene abierta, no se borra nada.

## Invitaciones y unión al hogar

1. **Crear grupo:** en un solo lote se crean el grupo (con `tipo`) y el documento de miembro del creador (rol `creador`). Se guarda `hogarActualId` en el usuario. Se puede hacer teniendo ya otros grupos: no toca los demás.
2. **Invitar:** un miembro crea `invitaciones/{codigo}` con vencimiento a 48 horas. La app arma el enlace y el código para compartir por WhatsApp.
3. **Unirse:** quien abre el enlace (o escribe el código) lee la invitación, ve el nombre del hogar y quién invitó, y al confirmar crea su propio documento de miembro. Las reglas lo permiten solo si la invitación está activa, no venció y **el grupo no está archivado**. Unirse a otro grupo no toca los que la persona ya tiene.
4. **Revocar o regenerar:** pasar la invitación a `revocada` y, si hace falta, crear otra.

## Varios grupos (Etapa 9)

- **"Mis grupos"**: consulta de grupo de colecciones `miembros` con `where('uid', '==', <uid propio>)` (y `estado == 'activo'`). Se eligió esto y no una lista en `usuarios/{uid}` porque la membresía sigue siendo la única fuente de verdad: si otra persona te quita o el grupo se archiva, no hay una segunda lista que quede desfasada ni que la app tenga que mantener (nadie puede escribir en `usuarios/{otro}`). Costo: el campo `uid`, una regla de `list` y un **índice de grupo de colecciones** (`firebase/firestore.indexes.json`, que se publica aparte). El emulador no exige índices: lo confirma el Firestore real.
- Con la lista de ids, la app lee `hogares/{id}` de cada uno (lectura puntual, sin listeners) para mostrar nombre, tipo y archivado. Los conteos ("N miembros · N pendientes") se leen solo al abrir el panel.
- **Pasar a otro grupo** al salir o cuando te sacan: el de mayor `ultimoUso` entre los activos y no archivados (si ninguno lo tiene, el de menor `desde`). Se eligió `ultimoUso` por grupo en el documento propio de `miembros` (y no "el último de este celular") porque ya viene en la misma consulta de "mis grupos" y vale en cualquier celular.
- **Archivar / desarchivar:** una sola escritura sobre `hogares/{id}`, solo de quien es `creadorActualId` y creador activo. Un grupo archivado es de **solo lectura**; ver la lista exacta en "Reglas de seguridad".
- **Máximo de 10 grupos activos por persona:** límite blando de la app (las reglas no pueden contar). Los archivados no cuentan.

## Reglas de seguridad (qué controlan)

- `usuarios/{uid}`: cada persona lee y escribe solo el suyo (incluidos sus dispositivos).
- Los permisos salen siempre de la **membresía** (el documento de `miembros`), nunca de `hogarActualId` ni del email. Ninguna regla lee `usuarios/{otro}`.
- `hogares/{hogarId}`: lo leen solo los miembros `activo`. Cualquier miembro activo edita `nombre` e `invitacionActivaId` (esta última solo apuntando a una invitación activa del mismo hogar, y revocando la anterior en el mismo lote). `creadoPor`, `creadoEn` y `tipo` no cambian. No se borra. Se crea solo junto con el miembro `creador` de quien lo crea, en el mismo lote, con `tipo` opcional (uno de los tres valores) y sin campos de archivado. **Archivar** (`archivado = true`, `archivadoPor` propio, `archivadoEn` del servidor, los tres juntos y nada más) y **desarchivar** (`archivado = false` y los otros dos vacíos) solo los hace quien es `creadorActualId` y creador activo.
- `miembros`: un miembro activo lee a todos; cada persona siempre lee el suyo (así se entera de que la sacaron). Nunca se borra un documento. Crea el suyo solo (a) al armar un hogar nuevo, como `creador`, o (b) con una invitación que existe, está `activa`, no venció y es de ese hogar, siempre como `miembro` y con el hogar teniendo un creador activo. Quien salió o fue quitado puede volver con una invitación nueva y válida. Una persona solo puede cambiar su propio nombre, foto, `uid` (solo ponerlo igual al propio) y `ultimoUso` (hora del servidor), o pasar su propio estado a `salio`. `uid` y `ultimoUso` son opcionales al crear el documento. **"Mis grupos":** cualquier persona con sesión puede hacer una consulta de grupo de colecciones sobre `miembros` siempre que filtre por su propio `uid`; sin ese filtro, o con el de otra persona, se rechaza. Solo el `creador` puede poner a otro `miembro` en `quitado` (nunca a sí mismo).
- **Traspaso:** si se va quien creó el hogar y hay más gente, en un solo lote: su estado pasa a `salio` y su rol a `miembro`, el rol `creador` pasa a otro miembro activo y `creadorActualId` apunta a esa persona. Las reglas verifican con `getAfter` que el resultado tenga un creador activo; **no pueden verificar que sea quien lleva más tiempo ni que no queden otros miembros activos** (no pueden contar ni listar), eso lo decide la app. Si era la última persona, sale sin cambiar el rol: el grupo queda sin miembros activos (nadie lo lee) y, como `creadorActualId` ya no apunta a alguien activo, nadie puede unirse. No es lo mismo que archivarlo a mano (ver arriba).
- **Grupo archivado (solo lectura, hecho en el servidor):** mientras `archivado == true` las reglas rechazan, para todos (también para quien lo creó), crear, editar y borrar listas e ítems, crear y revocar invitaciones, cambiar el nombre del grupo, escribir la presencia, quitar miembros y cambiar el nombre, la foto o `ultimoUso` propios. Quedan permitidos: **leer** (miembros activos), **salir**, completar el `uid` propio, **desarchivar** (solo el creador actual) y **traspasar el rol de creador** al salir (caso límite decidido: se permite para que siempre haya alguien que pueda desarchivar; en esa escritura el grupo no admite ningún otro cambio). Nadie se une ni reingresa a un grupo archivado, ni con una invitación vigente (al desarchivar, la invitación sirve de nuevo si no venció). Cada escritura consulta el documento del grupo (una lectura más).
- `invitaciones`: se puede leer una por una (con sesión), nunca listarlas. Las crean los miembros activos del hogar, con vencimiento a 48 h, y lo único que se modifica es pasarlas de `activa` a `revocada`.
- `listas`: leen, crean, renombran y eliminan (marcan) los miembros activos. Al crear: `creadaPor` propio, `creadaEn` del servidor, `eliminada` en `false`, nombre de 1 a 80 caracteres y uno de los cuatro colores. Al editar: solo `nombre` y `color`, o la eliminación (`eliminada` de `false` a `true` con `eliminadaPor` propio y `eliminadaEn` del servidor); una lista eliminada no se modifica. Solo se borra de verdad una lista eliminada hace más de 30 días.
- `items`: leen y escriben los miembros activos. Al crear: `agregadoPor` propio, `agregadoEn` del servidor, `comprado` y `borrado` en `false`, sin marcas de tildado ni borrado. Al editar: `listaId`, `agregadoPor` y `agregadoEn` no cambian; tildar y borrar exigen el uid propio y la hora del servidor, y destildar y deshacer vacían sus marcas. Solo se pueden eliminar de verdad (a) los marcados como borrados hace más de 30 días, o (b) los de una lista eliminada hace más de 30 días (la regla consulta el documento de la lista; si la lista ya no existe, no alcanza).
- `presencia/{uid}`: lo leen (y lo listan) los miembros activos del hogar; cada miembro activo crea y actualiza solo el suyo, siempre con exactamente `listaId` (texto de hasta 100 caracteres, vacío si ninguna) y `ultimoLatido` con la hora del servidor. Nunca se borra (se vacía `listaId`).

**Costo de las reglas:** consultar el documento de miembro dentro de una regla cuenta como una lectura por pedido. Para una familia es despreciable frente al cupo diario.

## Notificaciones (se resuelve en la última etapa)

El esquema ya deja lo necesario: preferencias, silenciadas, dispositivos, presencia y la colección `eventos`. Lo que falta es quién envía el aviso, porque un celular no puede mandárselo a otro directamente. Opciones, según lo acordado:

1. Plan de pago (Blaze) con Cloud Functions. Blaze **no tiene un tope de gasto duro**, solo alertas de presupuesto, y pide tarjeta.
2. Un servicio externo gratuito que reciba el evento y envíe el aviso.
3. Sin avisos al principio (los cambios igual se ven en tiempo real con la app abierta).

Con cualquiera, la lógica es la misma: agrupar los cambios de una persona en una lista dentro de ~30 segundos, no avisar a quien hizo el cambio, ni a quien tiene esa lista abierta, ni a quien la silenció o desactivó los avisos, y que al tocar el aviso se abra esa lista.

## Pendiente (sigue abierto)

- Elegir cómo se envían las notificaciones (opciones de arriba).
- Diseñar el estado "sin grupo" y los errores (enlace vencido, falla de login).
- Diseñar el menú de lista (renombrar, silenciar, eliminar) y los ajustes de notificaciones.
- Definir si se usa Expo con development build o React Native sin Expo (al arrancar el proyecto).
