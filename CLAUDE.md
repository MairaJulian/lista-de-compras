# Changuito · Guía para Claude Code

App Android de lista de compras compartida para una familia (3 adultos). Nombre visible: **Changuito**. Repo: `lista-de-compras`. Proyecto personal de Maira.

## Antes de hacer cualquier cosa, leé

1. `diseno/DISENO.md`: decisiones de producto, estilo, pantallas y flujos. Las imágenes de `diseno/pantallas/` son el diseño de referencia.
2. `diseno/ESQUEMA-DATOS.md`: qué se guarda en Firestore, reglas de seguridad y sincronización.
3. `diseno/PLAN-CONSTRUCCION.md`: etapas de construcción.
4. El archivo de la etapa en curso. **Etapa actual: 1** → `diseno/ETAPA-1.md`. (La Etapa 0 ya está cerrada; su detalle está en `diseno/ETAPA-0.md`.)

`diseno/referencia-html/*.dc.html` sirve solo para copiar valores exactos (colores, tamaños, textos). No es código de la app.

## Stack (ya decidido)

- React Native + TypeScript estricto, **solo Android** por ahora.
- **Expo con development build local** (`expo prebuild`; la carpeta `android/` se genera y no se versiona). Si en el PR 1 se comprueba que Expo no es compatible con `@react-native-firebase`, cambiar a React Native sin Expo y dejarlo explicado en el PR.
- Firebase en **plan Spark (gratuito, sin tarjeta)**: Authentication (Google) y Firestore. Notificaciones al final, ver `PLAN-CONSTRUCCION.md`.
- Identificador de paquete: `com.mairajulian.changuito`. Nombre visible de la app: `Changuito`.
- Estructura del repo: `diseno/` (documentación y diseño), `app/` (la app), `firebase/` (reglas de Firestore y configuración del emulador).

## Convenciones

- Textos de la interfaz en **español rioplatense (voseo)**, tal como en las pantallas de diseño.
- Nombres de campos y colecciones de Firestore **tal cual** `ESQUEMA-DATOS.md` (en español). El resto del código (variables, funciones, componentes) en inglés.
- Colores, tipografías (Nunito y DM Sans) y medidas salen de `DISENO.md`. Centralizalos en un tema; no repitas valores sueltos.
- Los cambios en ítems se hacen siempre con actualizaciones de campos sueltos, nunca reescribiendo el documento entero (de eso depende "gana el último, por campo").

## Cómo trabajar (importante)

- **Identidad de git:** antes del primer commit de cada sesión, verificá que `git config user.email` sea el correo personal de Maira y que `git remote -v` apunte a `git@github.com:MairaJulian/lista-de-compras.git`. Si no coincide, **frená y avisá**. No modifiques la configuración global de git. Trabajá solo dentro de esta carpeta.
- **Nunca pushees a `main`.** Una rama y una PR por paso: `etapa-N/NN-descripcion` (por ejemplo `etapa-0/01-esqueleto`). Maira revisa y mergea.
  - Única excepción: si el repo no tiene ningún commit en `main`, hacé un commit inicial con lo que ya existe y pusheá `main` una sola vez, aclarándolo en el primer mensaje.
- PRs chicas y revisables. Una PR por paso del plan; si un paso crece demasiado, dividilo.
- Cada PR lleva la descripción de `.github/pull_request_template.md`: **qué cambió, cómo probarlo en el celular, qué no pudiste verificar**.
- Antes de abrir una PR corré lint, chequeo de tipos y tests. Si algo no pasa, no abras la PR: arreglalo o explicá por qué.
- Si `gh` no está instalado, hacé el push y dejá el enlace para abrir la PR a mano.
- Al terminar un paso, actualizá el estado de la etapa en su archivo (qué quedó hecho y qué queda).

## Límites (no los cruces sin preguntar)

- **Todo gratuito.** No actives el plan Blaze ni ningún servicio de pago. Si Firebase o cualquier otra herramienta pide tarjeta o facturación, frená y avisá.
- **No subas secretos.** `google-services.json`, claves, keystores, `.env` y similares van en `.gitignore`. Si algo parecido a un secreto aparece en el repo, avisá.
- No instales software global ni toques nada fuera de la carpeta del repo sin avisar.
- No inventes datos ni pantallas que no estén en el diseño: si algo falta (ver "No diseñado todavía" en `DISENO.md`), preguntá o proponelo en la PR.
- Sé honesto en las PRs sobre lo que no verificaste. Claude Code no puede ver la app en el celular ni probar el login con una cuenta real: eso lo prueba Maira.

## Para probar en el celular

Hay un celular real conectado por USB (depuración activada) y un emulador Pixel 8 con Google Play. Usá `npx expo run:android` para instalar en el dispositivo conectado; en PowerShell `& "$env:ANDROID_HOME\platform-tools\adb.exe" devices` lista los dispositivos.
