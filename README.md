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

Node 22, JDK 17 y el SDK de Android (`ANDROID_HOME` configurado). Expo Go no sirve: la app usa código nativo y se compila en tu compu.

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
