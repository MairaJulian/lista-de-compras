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
- `firebase/`: reglas de Firestore y emulador (llega en el PR 2 de la Etapa 0).

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
