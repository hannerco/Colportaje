# HU-PAN-BASE-02 · Iniciar sesión

> **Iteración 1** · **Estado: terminada, con diseño propio (el dueño delegó el diseño, 2026-11-19)** · **Nivel:** pantalla · **Ruta:** `/entrar` · **Depende de:** HU-PAN-BASE-01, HU-BASE-03 · **Diseño:** no existe en el lienzo (`04-diseno/pendientes/FALTA-TRANSVERSAL.md`, «Login y Ajustes»; OQ-44): lo armó el asistente con la biblioteca por encargo del dueño · **Reglas:** BR-USR-02

## Historia
**Como** colportor **quiero** entrar con mi correo y mi contraseña **para** usar la app en mi celular.

## Pantalla
`SignInScreen` en `src/features/auth/screens/`, **Storybook:** `Pantallas/Sesión/Iniciar sesión`. Una isla centrada (400 como máximo) con la marca (Avatar `brand`), «Colportor», «Entra con tu correo y tu contraseña», el Campo «Correo», el Campo «Contraseña» (con «Mostrar» / «Ocultar») y «Entrar» a todo el ancho.
- «Entrar» se habilita al llenar correo y contraseña; Enter también envía. El correo se recorta.
- **Sin conexión:** Franja «Sin conexión» y «Entrar» deshabilitado (no hay cómo comprobar la clave).
- **Errores de `signIn`:** `INVALID_CREDENTIALS` en el campo de la contraseña; `USER_INACTIVE`, `OFFLINE` y el resto en una Franja arriba de los campos, con el texto de `copy.errors.codes`.
- **Redirección:** con sesión abierta, `/entrar` lleva a `/clientes`; entrar con éxito también.

## Estados (stories)
Vacío · Entrar (con Enter) · Mostrar contraseña · Entrando · Credenciales incorrectas · Usuario desactivado · Sin conexión · Matriz.

## Criterios de aceptación
- **CA-1.** **Dado** correo y contraseña correctos, **entonces** entro y llego a Clientes.
- **CA-2.** **Dado** una contraseña equivocada, **entonces** sigo en Iniciar sesión y el campo dice «El correo o la contraseña no coinciden.»
- **CA-3.** **Dado** que no hay conexión, **entonces** la Franja avisa y «Entrar» no funciona.

## Cambios por iteración
- **2026-11-19 (al programarla, sin lienzo):** el dueño pidió programarla sin diseño, guiándose por el back y por lo ya montado. Se armó con la biblioteca (isla, Campos, Botón, Franja, Avatar de marca) y se extendió el Campo con los tipos «correo» y «contraseña» (la contraseña con «Mostrar» / «Ocultar» en texto, porque el mapa de íconos está cerrado en 46). La E2E entra con un usuario creado por la propia prueba. La clave en el celular del dueño y el primer despliegue (BASE-01) ya pueden probarse con esta pantalla.
- **2026-11-22 (#41, ronda 34):** con `NEXT_PUBLIC_GOOGLE_SIGN_IN=on` la pantalla muestra solo «Continuar con Google» (sin contraseñas); al volver de Google, si el correo no está autorizado, avisa «Ese correo no tiene acceso…». Sin la variable, sigue el correo y la contraseña (transición hasta que el dueño configure Google, DEPLOYMENT §5.6). Stories «Con Google» y «Correo sin acceso»; `googleErrorFromUrl` con su prueba.
- Ronda 37, #87 (2026-11-23): diseño de la Propuesta 9 del lienzo con el logo elegido (panel marino, frase de la marca y cita; en móvil, hoja inferior). Átomo Logo nuevo y tokens de marca.
