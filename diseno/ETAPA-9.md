# Etapa 9 · Decisiones después del uso real (BORRADOR)

> **Borrador.** No se empieza hasta que la Etapa 8 termine (la familia usó la app un par de semanas y lo anotado en `USO-REAL.md` está resuelto o decidido). Solo recoge las dos decisiones grandes que vienen; todo lo que dependa de Maira está marcado con `[DECIDIR]`.

## Decisión 1 · Notificaciones (Etapa 7 pospuesta)

Con lo vivido en casa, decidir si los avisos hacen falta y con qué opción se envían. El detalle, el alcance y las pantallas están en `ETAPA-7.md` y `ESQUEMA-DATOS.md` ("Notificaciones"). Los diseños de ajustes, permiso y "Silenciar" (pantallas 39 a 43) ya existen; los cambios en Perfil (`16`) y en el menú de lista (`34`) **no están implementados** y entran con esa etapa.

- `[DECIDIR]` ¿Hacen falta los avisos? (Sí / No / Más adelante)
- `[DECIDIR]` Si hacen falta, cómo se envían: plan Blaze con Cloud Functions (**pide tarjeta y no tiene tope de gasto duro**, solo alertas de presupuesto), un servicio externo gratuito, o sin avisos.
- Si se elige Blaze: requiere que Maira lo autorice explícitamente (`CLAUDE.md` lo prohíbe por defecto).

## Decisión 2 · Publicación en Play Store

A mi entender requiere una cuenta de desarrollador con un pago único y varios requisitos: política de privacidad, forma de borrar la cuenta y los datos, y una clave de firma propia. **Verificar los requisitos vigentes al momento de decidir.**

- `[DECIDIR]` ¿Se publica o la familia sigue con el APK?
- Si se publica: la clave propia cambia la huella SHA-1, hay que registrarla en Firebase y los celulares tienen que reinstalar la app (aceptable para tres personas). Hace falta además el ícono de la app, que no está diseñado.
- Pendiente de baja prioridad que se vuelve relevante solo si la app se abre a más gente que la familia: que quien creó el hogar pueda salir sin traspasar el rol con un cliente modificado (cerrarlo exige un contador de miembros activos).

## Otros pendientes sin decidir

- `[DECIDIR]` Tema oscuro (sin diseñar): ¿lo piden?
- Ícono de la aplicación (hoy es el de Expo por defecto): pedirlo a Claude Design.
