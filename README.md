# Changuito

App Android de lista de compras compartida para una familia. Hecha con React Native (Expo, development build) y Firebase (plan gratuito).

## Documentación

- [`diseno/DISENO.md`](diseno/DISENO.md): decisiones de producto, estilo, pantallas y flujos.
- [`diseno/ESQUEMA-DATOS.md`](diseno/ESQUEMA-DATOS.md): qué se guarda en Firestore, reglas y sincronización.
- [`diseno/PLAN-CONSTRUCCION.md`](diseno/PLAN-CONSTRUCCION.md): etapas de construcción.
- [`diseno/ETAPA-0.md`](diseno/ETAPA-0.md): etapa en curso.

## Estructura

- `diseno/`: documentación y diseño.
- `app/`: la app (React Native + TypeScript).
- `firebase/`: reglas de Firestore y emulador.

## Requisitos

Node 22, JDK 17, el SDK de Android (`ANDROID_HOME` configurado) y CMake 3.31.6 (ver "Rutas largas en Windows"). Expo Go no sirve: la app usa código nativo y se compila en tu compu.

## Instalar y correr

```bash
cd app
npm install
npx expo run:android
```

`expo run:android` genera la carpeta `android/` (no se versiona), compila e instala en el celular conectado por USB (con depuración activada) o en el emulador abierto. Para ver los dispositivos: `adb devices`.

## Chequeos

Desde `app/`:

```bash
npm run lint
npm run typecheck
npm test
```

### Chequeos automáticos (GitHub Actions)

En cada PR corre `.github/workflows/ci.yml`: instala las dependencias de `app/` con `npm ci` y ejecuta `lint`, `typecheck` y `test`, en Ubuntu con Node 22.

**Qué verifica:**

- Que el código pase ESLint y compile con TypeScript estricto.
- Que pasen las pruebas de Jest. Firestore está mockeado, así que no hace falta `google-services.json` ni el emulador.

**Qué no verifica:**

- Que la app compile para Android ni que se vea o ande en un dispositivo: eso se prueba a mano con `npx expo run:android`.
- Nada contra Firebase real ni contra el emulador de Firestore (la pantalla de prueba se comprueba a mano).
- El formato de Prettier (`npm run format` lo arregla, pero no falla el PR).
- Las reglas de Firestore: todavía no hay pruebas de reglas (llegan con las etapas que las usan).

## Firebase

La app usa `@react-native-firebase`. El archivo `google-services.json` **no está en el repo**: bajalo de la consola de Firebase (proyecto `changuito-31ec1`, app Android `com.mairajulian.changuito`) y dejalo en `app/google-services.json`. `app.json` lo referencia desde ahí. Sin ese archivo la app no compila, pero `lint`, `typecheck` y `test` siguen pasando.

### Reglas de seguridad de Firestore

`firebase/firestore.rules` son las reglas reales: cada persona lee y escribe solo su `usuarios/{uid}` (con los campos de `ESQUEMA-DATOS.md`; no se puede borrar ni cambiar `creadoEn`) y todo lo demás está bloqueado. Las pruebas corren contra el emulador (necesita Java):

```
cd firebase
npm run test:rules
```

Publicarlas (hace falta `firebase login` con la cuenta personal):

```
cd firebase
npx firebase login
npx firebase deploy --only firestore:rules --project changuito-31ec1
```

### Emulador de Firestore y pantalla de prueba

En modo desarrollo, la pantalla inicial muestra un botón **Probar Firestore** que escribe y lee el documento `ping/ping` contra el **emulador** de Firestore (nunca contra el Firestore real, que está bloqueado por `firebase/firestore.rules`).

1. Levantá el emulador (en una terminal que quede abierta). La primera vez descarga el emulador:
   ```bash
   cd firebase
   npm install
   npm run emulator
   ```
2. Con el celular (o el emulador de Android) conectado, redirigí el puerto:
   ```bash
   adb reverse tcp:8080 tcp:8080
   ```
   Hay que repetirlo cada vez que se reconecta el cable o se reinicia el emulador de Android.
3. Corré la app (`cd app && npx expo run:android`) y tocá **Probar Firestore**. Tiene que decir "Escribió y leyó ping".

Notas:

- `app/firebase.json` desactiva el cambio automático de `localhost` por `10.0.2.2` (`android_bypass_emulator_url_remap`). Esa dirección solo sirve en el emulador de Android; sin esto, en un celular real la prueba se queda en "Probando…". Es un dato que se toma al compilar: si lo cambiás, reconstruí la app con `npx expo run:android`.
- El emulador usa `firebase/firestore.emulator.rules`, que solo permite `ping/*`. El Firestore real usa `firebase/firestore.rules`, todo bloqueado.
- El emulador de Firestore necesita Java. Con JDK 17 funciona con `firebase-tools` 14 (fijado en `firebase/package.json`); la versión 15 pide JDK 21 o más.

## Funcionamiento sin conexión

**Copia local de Firestore.** `app/src/data/firestoreConfig.ts` la deja configurada a propósito al arrancar (antes de la primera lectura): persistencia en disco activada y caché de **100 MB** (`cacheSizeBytes`). Es lo mismo que el SDK trae por defecto en Android, pero queda escrito. Gracias a eso la app abre y se usa sin señal con lo que ya se vio, y los cambios hechos sin conexión quedan en una cola en el disco que se envía sola al volver.

**Cómo se detecta la conexión.** Sin dependencias nuevas: `watchHouseholdData` escucha listas, ítems y miembros con `includeMetadataChanges`. Si alguna lectura viene de la copia local (`fromCache`) es que Firestore no pudo confirmarla con el servidor, o sea "Sin conexión". Se eligió esto antes que `@react-native-community/netinfo` por no sumar un módulo nativo; si en las pruebas con el celular el indicador tarda demasiado en cambiar, se reevalúa.

**Qué cuenta como pendiente.** Se cuenta **por documento** de la lista abierta: cada ítem con `hasPendingWrites`, la propia lista si tiene un cambio pendiente y, para lo que ya no aparece en la lectura (un ítem borrado sin conexión), las escrituras de esta sesión que el servidor todavía no confirmó (`pendingStore`). Un ítem con varios campos cambiados cuenta uno. Es una aproximación: un ítem borrado sin conexión **y** con la app cerrada y vuelta a abrir deja de contarse (el cambio igual se envía).

**Prioridad del indicador** (`syncLogic.ts`): *Sin guardar* (el servidor rechazó algo) → *Sin conexión* → *Sincronizado*. Para no mentir: nunca dice "Sincronizado" con lecturas de la copia local o con cambios sin confirmar. Dos esperas cortas evitan parpadeos: al arrancar no se muestra nada hasta 4 s (hasta que responde el servidor) y, con conexión, un cambio recién hecho tiene 2 s para confirmarse antes de pasar a "Sin conexión". El reloj de los ítems solo se muestra mientras el indicador dice "Sin conexión".

**Te quitaron mientras estabas sin conexión.** Al volver, el servidor rechaza esos cambios por permisos. `trackWrite` pregunta al servidor si seguís siendo miembro activo; si no, descarta el cambio (no es un error de guardado) y el aviso "Ya no sos parte de…" sale de la lectura de tu membresía.

**Cómo probarlo.** Con la app abierta en una lista, activá el modo avión (o `adb shell svc wifi disable` y `adb shell svc data disable`): la pill pasa a "Sin conexión". Agregá, tildá y editá ítems: aparecen al instante con el reloj y el aviso cuenta los cambios. Al desactivar el modo avión se limpian solos. Con la app cerrada y en modo avión, volver a abrirla muestra lo ya visto y los cambios pendientes siguen ahí. Los tests de lógica (`syncLogic.test.ts`, `pendingStore.test.ts`, `listSource.test.ts`, `failureStore.test.ts`) usan Firestore simulado: el comportamiento real sin conexión solo se ve en el celular o el emulador.

## Rutas largas en Windows (CMake 3.31.6)

**Requisito:** CMake **3.31.6** instalado en el SDK de Android (Android Studio > SDK Manager > SDK Tools > CMake > "Show Package Details" > 3.31.6).

**Por qué:** las librerías nativas con C++ generado (`react-native-screens`, `react-native-safe-area-context`) producen rutas de objetos de CMake de hasta ~370 caracteres con el repo en `C:\Users\maira\dev\MAIRA\lista-de-compras`. El ninja de CMake 3.22.1 (el que usa Android Gradle Plugin por defecto) falla con `Filename longer than 260 characters`; el ninja 1.12 de CMake 3.31.x no. Windows ya tiene `LongPathsEnabled = 1`, así que alcanza con cambiar de CMake. No hace falta mover el repo ni usar `subst` (probamos `subst` y falla: Node resuelve la ruta real y mezcla las dos raíces).

**Cómo funciona:** el config plugin `app/plugins/with-cmake-local-properties.js` escribe `android/local.properties` (`sdk.dir` y `cmake.dir`, con barras normales) en cada `expo prebuild`, buscando CMake 3.31.x dentro de `ANDROID_HOME`. Si no lo encuentra, el prebuild falla con un mensaje que explica cómo instalarlo.

**Comandos para compilar** (desde `app/`):

```bash
npm install
npx expo prebuild --platform android      # genera android/ y escribe local.properties
npx expo run:android                      # compila e instala en el dispositivo conectado
```

Solo para compilar el APK debug (sin instalar), más rápido porque usa una sola arquitectura:

```bash
cd android
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
```

Si ya tenías una carpeta `android/` de antes, corré `npx expo prebuild --platform android` una vez para que se escriba `local.properties`. Si aparece `Filename longer than 260 characters`, es que falta ese archivo o apunta a otro CMake.

## Autenticación nativa y Kotlin

`@react-native-firebase/auth` 27.1.0 usa `firebase-auth` 25.0.0 (BoM 35.0.2), que está compilado con metadatos de Kotlin 2.4.0. Expo 58 compila con Kotlin 2.2.0, que solo lee hasta 2.3, y fallaba `:react-native-firebase_auth:compileDebugKotlin` con "Module was compiled with an incompatible version of Kotlin. The binary version of its metadata is 2.4.0, expected version is 2.2.0".

**Solución:** `expo-build-properties` en `app/app.json` fija `android.kotlinVersion` en `2.4.0`. Se descartó fijar un BoM más viejo (34.0.0): Auth compilaba, pero `@react-native-firebase/firestore` 27.1.0 usa APIs de Firebase 35 y dejaba de compilar.

Si se actualiza Expo o `@react-native-firebase/*`, revisá si este valor sigue haciendo falta. El primer build con Kotlin 2.4.0 tarda unos 10 minutos (descarga el compilador).
