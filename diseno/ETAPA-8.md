# Etapa 8 · Listo para usar en casa

> Objetivo: que Changuito **salga de tu celular y se use en las compras reales de la familia**, que se enteren cuando algo falla sin depender de que te avisen, y que lo que aparezca al usarla se arregle rápido. Contexto general: `CLAUDE.md` y `diseno/PLAN-CONSTRUCCION.md`.

## Qué cambió respecto del plan original

- **La Etapa 7 (notificaciones) queda pospuesta**, por decisión de Maira: primero se usa la app unas semanas y después se decide si los avisos hacen falta y con qué opción se envían (ver `ETAPA-7.md` y `ESQUEMA-DATOS.md`, "Notificaciones"). Importante: **Blaze no tiene un tope de gasto duro**, solo alertas de presupuesto. El plan original decía lo contrario; corregir esa frase en `ESQUEMA-DATOS.md`, sin cambiar nada más.
- Esta etapa se organiza en **una PR de preparación** y después **un ciclo de uso real** con arreglos en PRs chicas.

## Cómo se trabaja esta etapa

Sigue la sección "Proceso por etapa" de `CLAUDE.md`. Resumen para esta etapa:

1. Hacé la **PR 1** completa sin esperar indicaciones intermedias, verificando en el emulador todo lo que se pueda.
2. En la PR, el "Cómo probarlo" tiene que ser corto: solo lo que necesita el celular real o a la familia.
3. Los cambios de documentación que Maira dejó sin commitear en `diseno/` (`ETAPA-8.md` y lo que haya) van como **primer commit** de la PR, mostrándole la lista antes.
4. En `CLAUDE.md` cambiá solo la línea "Etapa actual" a `Etapa actual: 8 → diseno/ETAPA-8.md (la Etapa 7 está pospuesta)`.
5. En `ETAPA-7.md` agregá arriba una nota de que está pospuesta, sin borrar nada.
6. **Esta etapa no cambia las reglas de Firestore.** Si ves que hace falta, frená y avisá.

## Decisiones ya tomadas

- **Sin notificaciones por ahora.** Los cambios se ven en tiempo real con la app abierta.
- **Instalación por APK, sin Play Store todavía.** La publicación en la tienda se evalúa después del uso real (ver "Después del uso real").
- **El APK se firma con la clave de debug que ya usa el proyecto**, porque su huella SHA-1 ya está registrada en Firebase y el login con Google funciona. Si más adelante se publica en Play Store hará falta una clave propia y reinstalar la app en los celulares: es aceptable para una familia de tres.
- **Invitar a la familia con el código**, no con enlace. La página puente del PR 7 de la Etapa 3 **queda sin hacer** salvo que Maira cambie de opinión (alcanza con copiar y pegar el código entre tres personas).
- **Revisión de errores:** los casos que ya tienen pantalla (`24` a `26`, `30` a `32`, `37`, `38`) ya están hechos; acá solo se revisa que nada se quede sin manejar.

## PR 1 · Preparación para uso real

Rama: `etapa-8/01-uso-real`

1. **APK de release reproducible.**
   - Un comando documentado en el README (o un script en `app/`) que genere el APK de release.
   - Confirmar con qué clave queda firmado y que es la misma cuya SHA-1 está en Firebase, para que el login con Google funcione.
   - Verificar que el APK **incluye el JavaScript** (no depende de Metro) y que **no incluye** el menú DEV ni los datos de ejemplo.
   - El APK y las claves **no se versionan**. Si hay algún archivo de claves, confirmar que está en `.gitignore`.
2. **Instalación en los celulares de la familia.** Sección del README, escrita para una persona no técnica: permitir "instalar apps de orígenes desconocidos" para el programa con el que reciben el archivo, qué aviso de Play Protect pueden ver y que es normal, y cómo entrar con Google y unirse al hogar con el código.
3. **Registro automático de fallos con Crashlytics** (`@react-native-firebase/crashlytics`, que hasta donde sé es gratuito en el plan Spark; confirmarlo antes de sumarlo y frenar si pidiera tarjeta). Objetivo: enterarse de los cierres inesperados de los celulares de la familia sin que te avisen. Es un módulo nativo: hay que volver a compilar. No registrar datos personales ni contenido de listas; solo errores y el uid. Verificar que no rompe el arranque sin conexión de la Etapa 5.
4. **Barrido de casos borde, solo los conocidos.** Revisar y corregir, con tests cuando se pueda:
   - Un ítem tildado que se vio sin tachar justo después de reconectar (visto una vez en la Etapa 5, sin investigar): reproducirlo o descartarlo, y dejar escrito qué se encontró.
   - Colores de avatar repetidos entre miembros (decisión de la Etapa 3: aceptable). Solo documentar si sigue pasando; **no tocar reglas**.
   - Pantallas que quedan en blanco o con carga infinita en cualquier falla (sin conexión, sin datos, sin permisos): que siempre haya un estado visible.
   - Textos en singular y plural en toda la app (por ejemplo "1 pendiente", "1 cambio sin sincronizar", "1 ítem").
5. **Archivo de seguimiento del uso real:** crear `diseno/USO-REAL.md` con una plantilla simple de tabla (fecha, quién, qué pasó, qué esperaba, estado) y una explicación de dos líneas de cómo usarla. Ver "Ciclo de uso real".
6. **Higiene del repo**, solo lo trivial:
   - Revisar las advertencias de `npm audit` en `firebase/` y decir cuáles son de herramientas de desarrollo y cuáles podrían afectar a la app. **No usar `--force`.**
   - Dejar el README actualizado con el estado real del proyecto.
7. **Borrador de `diseno/ETAPA-9.md`** como commit aparte dentro de la misma PR, solo con las dos decisiones grandes que vienen (ver "Después del uso real") y `[DECIDIR]` donde corresponda.

**Se comprueba cuando:** Maira genera el APK con el comando documentado, lo instala en su celular real sobre la versión de desarrollo (o después de desinstalarla), entra con Google y todo funciona sin conexión a la compu; y Crashlytics muestra un fallo de prueba en la consola de Firebase.

## Qué le queda a Maira (corto)

1. **Pantalla de consentimiento de Google:** en la consola de Google Cloud del proyecto (APIs y servicios → Pantalla de consentimiento de OAuth), mirar el estado. Si dice "Testing" (pruebas), solo pueden entrar las cuentas que figuren como usuarios de prueba: agregar los correos de las tres cuentas de la familia, o dejarlo en modo producción si Google lo permite sin verificación para estos permisos básicos (confirmarlo en la consola). Probarlo con una cuenta que no sea la tuya antes de dar el APK.
2. **Instalar el APK en su celular** y probar el recorrido completo una vez.
3. **Pasar el APK a la familia** por un medio privado (WhatsApp o Drive con enlace restringido) y acompañarlos en la primera instalación.
4. **Crear un hogar para casa** (o reutilizar "Nuestra casa"), generar el código y que cada persona se una.
5. Opcional: pedirle a Claude Design el **ícono de la aplicación** (hoy es el de Expo por defecto), que no está diseñado. Cuando esté, entra en una PR chica.

## Ciclo de uso real (dos semanas, aproximadamente)

1. La familia usa Changuito en las compras reales. Lo que les moleste, falte o falle lo anotan en `diseno/USO-REAL.md` (alcanza con una línea) o se lo pasan a Maira para anotar.
2. Cada tanto, Maira le dice a Claude Code: **"Revisá `diseno/USO-REAL.md` y arreglá lo que esté sin resolver, en una PR"**. Claude Code agrupa lo anotado, arregla lo que sea un error claro, y para lo que sea una **decisión de producto** (algo nuevo o un cambio de diseño) lo deja marcado con `[DECIDIR]` en vez de inventarlo.
3. Los fallos que reporte Crashlytics también se revisan en cada ciclo: Maira pega lo que vea en la consola de Firebase y Claude Code lo investiga.
4. Si algo requiere pantallas nuevas, se diseña antes en Claude Design.

## Después del uso real (decisiones, no tareas)

- **Notificaciones:** con lo vivido en casa, decidir si hacen falta y con qué opción (ver `ETAPA-7.md`). Las pantallas de ajustes, el permiso y "Silenciar" ya se están diseñando.
- **Tema oscuro:** pendiente de diseño; evaluar si lo piden.
- **Publicación en Play Store:** a mi entender requiere una cuenta de desarrollador con un pago único y varios requisitos (política de privacidad, borrado de cuenta, clave de firma propia). **Verificar los requisitos vigentes al momento de decidir**, no ahora.
- **Reglas de seguridad pendientes de baja prioridad:** quien creó el hogar podría salir sin traspasar el rol con un cliente modificado (anotado en la Etapa 3); cerrarlo exige un contador de miembros activos en el hogar. Solo vale la pena si la app se abre a más gente que la familia.

## Cierre de la etapa

La Etapa 8 termina cuando:
- La familia usó la app en compras reales durante un par de semanas.
- Lo anotado en `USO-REAL.md` está resuelto o decidido.
- Los chequeos automáticos pasan y Crashlytics no muestra fallos sin atender.

## Estado

- [ ] APK de release reproducible
- [ ] Guía de instalación para la familia
- [ ] Crashlytics
- [ ] Barrido de casos borde
- [ ] `USO-REAL.md`
- [ ] Higiene del repo
- [ ] Borrador de `ETAPA-9.md`
- [ ] Maira: pantalla de consentimiento de Google
- [ ] Maira: APK instalado en la familia
- [ ] Dos semanas de uso real
