# Etapa 0 · Preparación del proyecto

> Objetivo: que una app mínima corra en el emulador y en el celular real, conectada a Firebase (gratis), con chequeos automáticos en cada PR. Contexto general: `CLAUDE.md` y `diseno/PLAN-CONSTRUCCION.md`.

## Datos fijos

- Nombre visible: **Changuito**. Identificador de paquete: **`com.mairajulian.changuito`**.
- Repo: `git@github.com:MairaJulian/lista-de-compras.git`.
- Estructura: `diseno/`, `app/` (React Native), `firebase/` (reglas y emulador).

## Estado del entorno de Maira (ya verificado)

- Node 22.14.0, npm 10.9.2, JDK 17 (Temurin) con `JAVA_HOME`, `ANDROID_HOME` configurado, plataformas Android 33 a 36 y build-tools hasta 36.0.0.
- Celular real conectado y autorizado por USB. Emulador **Pixel 8** (Android 36, con Google Play) creado.
- Git con el correo personal y el remoto personal, dentro de esta carpeta.
- **Pendiente de Maira:** crear el proyecto de Firebase y bajar `google-services.json` (ver "Antes del PR 2"). Todavía no está hecho.

## PR 1 · Esqueleto del proyecto

Rama: `etapa-0/01-esqueleto`

1. Verificar la identidad de git y el remoto (ver `CLAUDE.md`).
2. Crear la app en `app/` con Expo + TypeScript estricto, con nombre visible `Changuito` y paquete `com.mairajulian.changuito` (en `app.json`).
3. Comprobar la compatibilidad de Expo con `@react-native-firebase` (config plugins) **antes de seguir**. Si no es compatible, pasar a React Native sin Expo y explicarlo en la PR.
4. Configurar ESLint, Prettier y tests con Jest. Agregar los scripts `lint`, `typecheck` y `test` en el `package.json`.
5. Dejar la carpeta `android/` fuera del repo (se genera con `expo prebuild`).
6. Completar `.gitignore` (sin borrar lo que ya tiene): `node_modules`, `android/`, `ios/`, `.expo`, `google-services.json`, `.env*`, `*.keystore`, `*.jks`, `firebase-debug.log`.
7. Agregar `.github/pull_request_template.md` con tres secciones: *Qué cambió*, *Cómo probarlo en el celular*, *Qué no pude verificar*.
8. Actualizar `README.md` (hoy tiene solo una línea de prueba): qué es Changuito, cómo instalar y correr la app, y enlaces a `diseno/`.
9. Pantalla inicial mínima (texto "Changuito") que se vea en el emulador y en el celular.

**Cómo comprueba Maira que está bien:** `npm install`, después `npx expo run:android` con el celular conectado muestra la pantalla "Changuito". Lo mismo en el emulador. Los comandos `lint`, `typecheck` y `test` pasan.

## Antes del PR 2 (tarea de Maira)

- Crear el proyecto de Firebase (plan Spark, sin tarjeta) con la app de Android registrada con el paquete `com.mairajulian.changuito`.
- Activar Authentication con Google y crear Firestore (Standard, modo producción, la región más cercana; no se puede cambiar después).
- Bajar `google-services.json` y avisarle a Claude Code dónde lo dejó.
- Sacar la huella SHA-1 de depuración y agregarla en la consola (se necesita para el login con Google en la Etapa 2).

Si Firebase pide tarjeta o facturación en cualquier momento, parar.

## PR 2 · Conexión con Firebase

Rama: `etapa-0/02-firebase`

1. Instalar y configurar `@react-native-firebase/app` y `@react-native-firebase/firestore`. Usar `google-services.json` (fuera del repo) y referenciarlo desde `app.json`.
2. Crear `firebase/` con `firebase.json`, `firestore.rules` (**todo bloqueado**, `allow read, write: if false`) y la configuración del emulador de Firestore. Revisar los requisitos de Java del emulador de Firebase: si piden una versión más nueva que la 17, avisarle a Maira en la PR y **no instalar nada global**.
3. Pantalla de prueba, visible solo en modo desarrollo, que escriba y lea un documento `ping` **contra el emulador** de Firestore (no contra el Firestore real, que está bloqueado por las reglas).
4. Documentar en el README cómo levantar el emulador y probar la pantalla.

**Cómo comprueba Maira que está bien:** con el emulador de Firebase corriendo, la pantalla de prueba escribe y lee el documento en el celular y en el emulador de Android. La app compila con el archivo `google-services.json` en su lugar y sin él los comandos `lint`, `typecheck` y `test` siguen pasando.

## PR 3 · Chequeos automáticos

Rama: `etapa-0/03-ci`

1. GitHub Actions que, en cada PR, corra instalación, `lint`, `typecheck` y `test`. Esos chequeos **no deben depender de `google-services.json`** (usar mocks).
2. Documentar en el README qué verifica y qué no.

**Cómo comprueba Maira que está bien:** la PR muestra los chequeos corriendo y en verde. Si querés comprobar que protege, probá romper una prueba a propósito en una rama y ver que falla.

## Cierre de la etapa

La Etapa 0 termina cuando:
- Una app mínima corre en el emulador y en el celular real.
- Puede leer y escribir un documento de prueba (en el emulador de Firestore).
- Los chequeos automáticos corren en cada PR.

Al terminar, actualizá esta sección con lo que quedó hecho y dejá el aviso de que sigue la **Etapa 1 · Base visual y navegación**.

## Estado

- [x] PR 1 · Esqueleto (PR #3, mergeada)
- [x] Firebase creado por Maira (proyecto `changuito-31ec1`)
- [ ] PR 2 · Conexión con Firebase (PR abierta; falta que Maira pruebe la pantalla con el emulador)
- [ ] PR 3 · Chequeos automáticos
