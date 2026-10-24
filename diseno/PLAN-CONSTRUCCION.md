# Changuito · Plan de construcción por etapas

> Leelo junto con `DISENO.md` (qué se ve) y `ESQUEMA-DATOS.md` (qué se guarda). Cada etapa termina con algo que se puede probar en un celular real, y se hace en pasos chicos, uno por PR, para que se puedan revisar de a uno.

## Stack

- React Native + TypeScript, solo Android por ahora.
- Firebase en plan gratuito (Spark): Authentication con Google, Firestore.
- Notificaciones al final (ver Etapa 7).
- Todo gratis en esta fase. Costo futuro a tener presente: hasta donde sé, publicar en la Play Store requiere una cuenta de desarrollador con un pago único; confirmarlo cuando llegue ese momento.

## Etapa 0 · Preparación

**Qué se hace**
- Repo en el GitHub personal y estructura base del proyecto, con un archivo de contexto que apunte a `diseno/DISENO.md` y `diseno/ESQUEMA-DATOS.md`.
- Instalar lo necesario para Android (Android Studio con el emulador, JDK) y crear el proyecto de React Native.
- Decidir: Expo con development build (se compila en tu compu, sin costo) o React Native sin Expo. Expo Go no sirve porque Firebase necesita código nativo.
- Crear el proyecto en Firebase (plan Spark), registrar la app de Android, agregar la huella SHA-1 de depuración (la pide el login con Google) y activar Authentication con Google y Firestore.
- Conectar el celular real por cable (depuración USB).

**Se comprueba cuando:** una app mínima corre en el emulador y en tu celular, y puede leer y escribir un documento de prueba en Firestore.

## Etapa 1 · Base visual y navegación

**Qué se hace**
- Tema con los colores y tipografías del `DISENO.md` (Nunito y DM Sans).
- Componentes reutilizables: avatar con inicial, tarjeta de lista, fila de ítem, botones, campo de agregar, panel inferior, aviso centrado, barra inferior con las pestañas Listas y Hogar.
- Las pantallas armadas con datos de ejemplo, sin Firebase todavía.

**Se comprueba cuando:** cada pantalla, en el celular, se parece a su imagen de `pantallas/`.

## Etapa 2 · Login y perfil

**Qué se hace**
- Pantalla de bienvenida con "Entrar con Google".
- Crear el documento `usuarios/{uid}` en el primer ingreso.
- Pantalla Perfil con el nombre y la cuenta, y "Cerrar sesión".
- La sesión se conserva al cerrar y volver a abrir la app.

**Se comprueba cuando:** podés entrar con tu cuenta en el celular real, cerrar la app, volver a abrirla sin tener que loguearte de nuevo, y cerrar sesión.

## Etapa 3 · Hogar e invitaciones

**Qué se hace**
- Crear hogar (en un solo lote: hogar + miembro creador).
- Pantalla Hogar con los miembros y roles.
- Invitar: crear la invitación con vencimiento, compartir enlace y código, regenerar y revocar.
- Unirse desde el enlace (la app tiene que abrirse al tocar el enlace) o escribiendo el código.
- Quitar a un miembro (solo el creador) y salir del hogar, con traspaso de rol si se va el creador.
- Reglas de seguridad de esta parte, probadas con el emulador de Firebase antes de usarlas con datos reales.
- Estado "sin hogar" y los mensajes de error de invitación (diseñar antes de programar).

**Se comprueba cuando:** con dos cuentas de Google (por ejemplo el emulador y tu celular), una invita y la otra entra; solo el creador puede quitar; una persona que salió pierde el acceso.

## Etapa 4 · Listas e ítems en tiempo real

**Qué se hace**
- Pantalla Inicio con las tarjetas de listas y sus contadores de pendientes.
- Crear lista (nombre y color).
- Pantalla Lista: agregar rápido, tildar y destildar, pasar a Comprados, detalle del ítem (nombre, cantidad, nota), borrar con deshacer.
- Una sola suscripción al hogar para todo, y actualizaciones por campo (nunca reescribir el ítem entero).
- Reglas de seguridad de listas e ítems, con pruebas.

**Se comprueba cuando:** con dos dispositivos abiertos a la vez, lo que uno agrega, tilda o borra aparece en el otro al instante.

## Etapa 5 · Funcionamiento sin conexión

**Qué se hace**
- Activar y verificar la copia local de Firestore.
- Indicador "Sincronizado / Sin conexión" y el aviso "N cambios sin sincronizar", con el reloj en los ítems pendientes.
- Detectar que te quitaron del hogar mientras estabas sin conexión y mostrar el aviso correspondiente.

**Se comprueba cuando:** probando en modo avión:
- Agregar, tildar y borrar sin señal funciona, y al volver la conexión todo se sincroniza.
- Dos dispositivos sin conexión que editan campos distintos del mismo ítem conservan ambos cambios.
- Si editan el mismo campo, queda el último que llegó al servidor.
- Borrar en uno y tildar en otro deja el ítem borrado.

## Etapa 6 · Presencia y limpieza de comprados

**Qué se hace**
- Registrar la lista abierta de cada persona (latido cada ~30 segundos).
- Al salir de una lista: aviso "Se van a borrar N ítems comprados" y borrado solo si nadie más la tiene abierta, con deshacer.
- Purga automática, al abrir la app, de los ítems borrados hace más de 30 días.

**Se comprueba cuando:** con dos personas en la misma lista, si una sale no se borra nada; cuando sale la última, se borran los comprados y el deshacer los recupera.

## Etapa 7 · Notificaciones y ajustes

**Qué se hace**
- Elegir cómo se envían los avisos (opciones en `ESQUEMA-DATOS.md`) y programarlo.
- Registrar el dispositivo, agrupar avisos, no avisar a quien hizo el cambio ni a quien tiene la lista abierta.
- Pantalla de ajustes de notificaciones, silenciar listas, y menú de lista (renombrar, silenciar, eliminar).

**Se comprueba cuando:** una persona agrega ítems con la app del otro cerrada, y a este le llega un solo aviso agrupado que abre esa lista.

## Etapa 8 · Pulido y uso real

**Qué se hace**
- Errores y casos borde que queden (falla de login, enlace vencido, pérdida de conexión durante una acción).
- Probar en uso real en casa durante un par de semanas con los tres.
- Después se evalúa el tema oscuro y la publicación en la Play Store.

**Se comprueba cuando:** usan la app en las compras reales sin tener que volver a la lista de WhatsApp.

## Cómo conviene trabajar cada etapa

- Etapas en PRs chicas (por ejemplo, la Etapa 3 en 4 o 5), para poder revisar de a una.
- Antes de pasar a la siguiente, probar lo de "se comprueba cuando" en el celular real.
- Las reglas de seguridad de Firestore se prueban con el emulador de Firebase, no con datos reales.
