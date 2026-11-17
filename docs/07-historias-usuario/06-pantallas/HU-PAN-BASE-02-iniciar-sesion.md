# HU-PAN-BASE-02 · Iniciar sesión

> **Iteración 1** · **Estado: BLOQUEADA, espera diseño** · **Nivel:** pantalla · **Ruta:** `/entrar` · **Depende de:** HU-PAN-BASE-01, HU-BASE-03 · **Diseño:** **no existe** (`04-diseno/pendientes/FALTA-TRANSVERSAL.md`, «Login y Ajustes»; OQ-44) · **Reglas:** BR-USR-02

## Historia
**Como** colportor **quiero** entrar con mi correo y mi contraseña **para** usar la app en mi celular.

## Por qué está bloqueada
El back de sesión está hecho (HU-BASE-03: `useSignIn`, `useSession`), pero la pantalla no está diseñada, y las reglas del proyecto no permiten inventarla. **Sin esta pantalla nadie puede usar la app fuera del Storybook.** Se le pidió al dueño que la diseñe (OQ-44). Con la biblioteca actual debería bastar una isla con dos Campos, el Botón principal y la Franja de sin conexión.

## Cuando llegue el diseño
Se completa esta HU con la plantilla `PLANTILLA-FRONT.md`:
- los estados del diseño (vacío, error de credenciales, sin conexión, cargando);
- el mapeo de errores de `signIn` a textos de `copy/es.ts`;
- la redirección a `/clientes` al entrar.

## Cambios por iteración
*(vacío)*
