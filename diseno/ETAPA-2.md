# Etapa 2 · Login y perfil

> Objetivo: que se pueda **entrar con Google de verdad**, que la sesión se conserve, y que Perfil muestre los datos reales de la cuenta. Todavía no hay hogares reales (eso es la Etapa 3). Contexto general: `CLAUDE.md` y `diseno/PLAN-CONSTRUCCION.md`. Diseño de referencia: `01-bienvenida`, `16-perfil`, `17-sin-hogar` y `25-error-inicio-sesion` en `diseno/pantallas/`.

## Alcance

**Entra:**
- Hacer compilar la autenticación nativa de Firebase (hoy no compila por un desajuste de versiones de Kotlin).
- Login con Google, creación del documento `usuarios/{uid}` en el primer ingreso y sesión persistente.
- Reglas de seguridad de Firestore para `usuarios`, con pruebas, y su publicación.
- Rutas protegidas según la sesión, Perfil con datos reales y "Cerrar sesión".
- El error de inicio de sesión del diseño (`25`).

**No entra (Etapa 3 en adelante):**
- Crear hogares, invitaciones reales, miembros y listas en Firestore. Hasta entonces, quien entra sin hogar ve la pantalla **Sin hogar** (`17`), y sus botones siguen siendo solo de diseño.
- Los datos de ejemplo siguen existiendo: en desarrollo hay que poder seguir viendo toda la app con ellos (ver PR 4).

## Reglas específicas de esta etapa

- **No cambiar a `expo-auth-session` ni al SDK web de Firebase para el login.** El Firestore nativo (`@react-native-firebase/firestore`) es el que da la copia local para el modo sin conexión, y solo ve la sesión del **Auth nativo**. Si el Auth nativo no compila, frená y consultá antes de elegir otro camino.
- Versiones: `@react-native-firebase/auth` tiene que coincidir con la versión de las otras librerías `@react-native-firebase/*` (hoy 27.1.0). La librería `@react-native-google-signin/google-signin` 16.1.5 ya se comprobó que compila.
- El `webClientId` de Google Sign-In (el cliente OAuth de tipo web de `google-services.json`) **no es un secreto**, pero `google-services.json` sigue sin subirse al repo.
- No registrar en logs ni guardar tokens o identificadores de sesión. Los mensajes de error al usuario salen del diseño (`25`) y no muestran detalles técnicos.
- El paquete es `com.mairajulian.changuito`. Si el login falla con `DEVELOPER_ERROR` (código 10), casi siempre es que la huella SHA-1 o el nombre del paquete registrados en Firebase no coinciden con los de la app instalada.
- Para probar con dos cuentas hace falta una segunda cuenta de Google de prueba en el emulador.

## PR 1 · Que compile la autenticación nativa

Rama: `etapa-2/01-auth-compila`

1. Instalar `@react-native-firebase/auth` y `@react-native-google-signin/google-signin`, y configurar los plugins que hagan falta en `app.json`.
2. Resolver el error de compilación de `:react-native-firebase_auth:compileDebugKotlin` (Firebase Auth compilado con metadatos de Kotlin 2.4.0, mientras Expo 58 usa 2.2.0). Probar, en este orden:
   1. Fijar una versión más vieja del BoM de Firebase para Android.
   2. Fijar la versión de Kotlin con `expo-build-properties` (`android.kotlinVersion`).
3. **Tope de una hora de intentos.** Si ninguna de las dos funciona, frená y contá qué mediste y qué otras opciones ves. No cambies a expo-auth-session ni al SDK web.
4. Sin tocar pantallas: solo comprobar que la app compila, se instala y abre.

**Se comprueba cuando:** `npx expo run:android` compila e instala la app en el celular real y en el emulador con ambas librerías incluidas, y los chequeos automáticos pasan. Documentar en el README la causa del problema y la solución.

## PR 2 · Reglas de seguridad de `usuarios`

Rama: `etapa-2/02-reglas-usuarios`

1. En `firebase/firestore.rules`: cada persona lee y escribe **solo su propio documento** `usuarios/{uid}` (con `request.auth.uid == uid`), validando los campos permitidos según `ESQUEMA-DATOS.md`. Todo lo demás sigue bloqueado.
2. Pruebas de las reglas con `@firebase/rules-unit-testing` contra el emulador de Firestore: una persona accede a su documento; no puede leer ni escribir el de otra; sin sesión no accede a nada; las colecciones que no existen todavía siguen bloqueadas.
3. Las reglas del emulador que ya existen para `ping` (`firestore.emulator.rules`) no se mezclan con las reales.
4. **No publicar las reglas.** Dejar en la PR los comandos exactos para que Maira las publique ella (hace falta `firebase login` con su cuenta personal): `firebase deploy --only firestore:rules --project changuito-31ec1`.

**Se comprueba cuando:** las pruebas de reglas pasan en local y en GitHub, y Maira publica las reglas y ve en la consola de Firebase (Firestore → Reglas) que quedaron publicadas. **Esto tiene que estar hecho antes de probar el PR 3.**

## PR 3 · Login con Google y documento de usuario

Rama: `etapa-2/03-login-google`

1. El botón "Entrar con Google" de Bienvenida abre el login con Google y entra a la sesión de Firebase.
2. En el primer ingreso se crea `usuarios/{uid}` con nombre, email, foto, `creadoEn` y `hogarActualId` vacío (ver `ESQUEMA-DATOS.md`). En ingresos posteriores no se pisan los datos existentes: se actualizan solo nombre y foto si cambiaron.
3. Casos de error, todos sin que la app se cierre:
   - La persona cancela el login: vuelve a Bienvenida sin mostrar error.
   - Falla el login o no hay conexión: pantalla `25-error-inicio-sesion`, con "Reintentar".
   - Falta Google Play Services: aviso claro.
4. Tests de la lógica de creación y actualización del usuario (con las dependencias nativas mockeadas).

**Se comprueba cuando:** en el celular real, "Entrar con Google" con la cuenta de Maira crea el documento `usuarios/{uid}` (visible en la consola de Firebase) con los datos correctos; repetir el login no lo duplica ni lo pisa; cancelar y los errores se comportan como se describe.

## PR 4 · Sesión, rutas protegidas y Perfil

Rama: `etapa-2/04-sesion-perfil`

1. Escuchar el estado de la sesión y proteger las rutas: sin sesión → Bienvenida; con sesión y sin hogar (`hogarActualId` vacío) → Sin hogar (`17`); con sesión y hogar → Inicio.
2. La sesión se conserva al cerrar y volver a abrir la app. Mientras se averigua el estado de la sesión, mostrar la pantalla de carga con la marca, sin parpadeos de Bienvenida.
3. **Perfil** (`16-perfil`) con los datos reales: nombre, correo de Google y avatar con inicial. "Cerrar sesión" cierra la sesión de Firebase y de Google y vuelve a Bienvenida.
4. **Datos de ejemplo en desarrollo:** como todavía no existen hogares reales, en `__DEV__` agregar la opción "Entrar con datos de ejemplo" en el menú DEV, para poder seguir viendo y probando toda la app con los datos actuales. No debe existir en la versión de producción.
5. Tests de la lógica de rutas protegidas y de cerrar sesión.

**Se comprueba cuando:** abrir la app sin sesión muestra Bienvenida; después de entrar con Google se ve Sin hogar; al cerrar y reabrir la app la sesión sigue; Perfil muestra tus datos reales; "Cerrar sesión" vuelve a Bienvenida y se puede volver a entrar.

## Cierre de la etapa

La Etapa 2 termina cuando:
- Se puede entrar con Google en el celular real y en el emulador (con la cuenta de prueba), y ambos usuarios aparecen en `usuarios/` en Firebase.
- La sesión persiste y "Cerrar sesión" funciona.
- Un usuario no puede leer ni modificar el documento de otro (comprobado con las pruebas de reglas).
- Los chequeos automáticos pasan.

Al terminar, actualizá esta sección y avisá que sigue la **Etapa 3 · Hogar e invitaciones**.

Antes de la Etapa 3 conviene diseñar en Claude Design: el Inicio de un hogar sin listas, otros errores (código mal escrito, falla al crear el hogar), edición del nombre del hogar y borrar una lista. Dejalo como recordatorio.

## Estado

- [x] PR 1 · Que compile la autenticación nativa (Kotlin 2.4.0 con `expo-build-properties`; probado en el emulador y en el celular real)
- [x] PR 2 · Reglas de seguridad de `usuarios` (pruebas con el emulador y en CI; sin publicar)
- [ ] Maira publica las reglas
- [ ] PR 3 · Login con Google y documento de usuario
- [ ] PR 4 · Sesión, rutas protegidas y Perfil
