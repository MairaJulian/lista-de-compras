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
