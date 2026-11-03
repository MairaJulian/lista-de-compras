# Etapa 10 · Decisiones después del uso real (BORRADOR)

> **Borrador.** No se empieza hasta que la Etapa 9 (varios grupos) termine y la familia haya usado la app un tiempo. Recoge las decisiones grandes que quedan; todo lo que depende de Maira está marcado con `[DECIDIR]`. Antes se llamaba "Etapa 9".

## Decisión 1 · Notificaciones (Etapa 7 pospuesta)

Con lo vivido en casa, decidir si los avisos hacen falta y con qué opción se envían. El detalle, el alcance y las pantallas están en `ETAPA-7.md` y `ESQUEMA-DATOS.md` ("Notificaciones"). Los diseños de ajustes, permiso y "Silenciar" (pantallas 39 a 43) ya existen; los cambios en Perfil (`16`) y en el menú de lista (`34`) **no están implementados** y entran con esa etapa.

- Con varios grupos, los avisos llegan de **todos los grupos** y al tocarlos se abre el grupo que corresponde (ver `DISENO.md`). Las preferencias de silenciar son por lista y por persona.
- `[DECIDIR]` ¿Hacen falta los avisos? (Sí / No / Más adelante)
- `[DECIDIR]` Si hacen falta, cómo se envían: plan Blaze con Cloud Functions (**pide tarjeta y no tiene tope de gasto duro**, solo alertas de presupuesto), un servicio externo gratuito (por ejemplo, un Cloudflare Worker, con la app de quien agrega haciendo el agrupado y una clave de servicio de permisos mínimos guardada como secreto), o sin avisos.
- Si se elige Blaze: requiere que Maira lo autorice explícitamente (`CLAUDE.md` lo prohíbe por defecto).

## Decisión 2 · Publicación en Play Store

A mi entender requiere una cuenta de desarrollador con un pago único y varios requisitos: política de privacidad, forma de borrar la cuenta y los datos, y una clave de firma propia. **Verificar los requisitos vigentes al momento de decidir.**

- `[DECIDIR]` ¿Se publica o la familia sigue con el APK?
- Si se publica: la clave propia cambia la huella SHA-1, hay que registrarla en Firebase y los celulares tienen que reinstalar la app (aceptable para unas pocas personas). El ícono y el splash ya están hechos (`diseno/icono/`).
- Si la app se abre a más gente que la familia, se vuelve relevante un pendiente de baja prioridad: que quien creó el grupo pueda salir sin traspasar el rol con un cliente modificado (cerrarlo exige un contador de miembros activos en el grupo). Con varios grupos y gente fuera de la familia conviene revisarlo.

## Otros pendientes sin decidir

- `[DECIDIR]` Tema oscuro (sin diseñar): ¿lo piden?
- `[DECIDIR]` Fotos de perfil de Google en lugar de la inicial (hoy los avatares son la inicial con color por diseño).
- `[DECIDIR]` Enlace de invitación tocable (página puente en Firebase Hosting, o App Links verificados), hoy se comparte solo el código.
- `[DECIDIR]` Cargar unidades en los ítems ("kg", "docena"), que existen en el esquema pero no tienen interfaz.
- Colores de avatar repetidos entre miembros de un mismo grupo (aceptado hasta ahora).
