# HU-BASE-03 · Inicio de sesión, perfil y rol

> **Épica:** Cimientos · **Depende de:** HU-BASE-02 · **Reglas:** BR-USR-01/02/03/06/07/08, ADR-0001, ADR-0027, AF-83 · **Diseño:** sin pantalla (el sidebar muestra "Colportor" y el nombre del usuario)

## Historia
**Como** colportor **quiero** entrar con mi correo y contraseña **para** usar la app con mis propios datos.

## Contexto
- El registro es **solo por invitación** (BR-USR-01), pero las invitaciones y el panel de admin quedan fuera (ADR-0041). Mientras tanto, el dueño crea los usuarios **a mano** (en el panel de Supabase o con un script local de servidor).
- El sidebar del diseño muestra el nombre del usuario ("Hanner Conde"); el botón "Cambiar de cuenta" no tiene regla y queda fuera (`04-diseno/pendientes/FALTA-TRANSVERSAL.md` FT-02).

## Alcance
- **Incluye:** inicio y cierre de sesión con correo y contraseña; registro público desactivado; trigger que crea `profile` (nombre desde los metadatos del usuario) y el rol `colportor` al crearse un usuario; lectura del perfil actual (nombre, formato de hora, si es admin, si está activo); sesión persistente y detección de sesión vencida; script local `scripts/create-user.ts` (usa la `service_role` solo en la máquina del dueño) para crear un usuario con nombre y, opcionalmente, rol admin.
- **No incluye:** invitaciones, restablecer contraseña, desactivar/reactivar desde la app, modo administrador, cambiar el formato de hora (Ajustes no está diseñado).

## Contrato para el front
### Lecturas
- `useSession()` → `{ status: 'loading' | 'signed_in' | 'signed_out' | 'expired'; userId? }`.
- `useCurrentProfile()` → `{ id, fullName, timeFormat: '12h' | '24h', isAdmin, isActive }`.
### Acciones
- `signIn({ email, password })` → `Result<void>` · errores: `INVALID_CREDENTIALS`, `USER_INACTIVE`, `OFFLINE`.
- `signOut()` → `Result<void>`.

## Reglas (el sistema DEBE…)
- **R1.** El registro público DEBE estar desactivado en Supabase Auth (BR-USR-01).
- **R2.** CUANDO se crea un usuario, el sistema DEBE crear su `profile` y su rol `colportor` en la misma transacción (BR-USR-03).
- **R3.** CUANDO un usuario con `is_active = false` inicia sesión, el sistema DEBE cerrar la sesión y devolver `USER_INACTIVE` (BR-USR-07).
- **R4.** CUANDO la sesión vence, el sistema DEBE informar `expired` sin borrar los datos guardados para consulta sin conexión (AF-83).
- **R5.** La `service_role` DEBE usarse solo en el script local y nunca en `NEXT_PUBLIC_*` ni en el navegador.

## Criterios de aceptación
- **CA-1.** **Dado** un usuario creado con el script (`Hanner Conde`), **cuando** inicia sesión con su correo y contraseña, **entonces** `useCurrentProfile` devuelve `fullName = "Hanner Conde"`, `timeFormat = "12h"`, `isAdmin = false`.
- **CA-2.** **Dado** una contraseña equivocada, **cuando** intenta entrar, **entonces** recibe `INVALID_CREDENTIALS`.
- **CA-3.** **Dado** un usuario con `is_active = false`, **cuando** intenta entrar, **entonces** recibe `USER_INACTIVE` y queda sin sesión.
- **CA-4.** **Dado** cualquier persona, **cuando** intenta registrarse por la API pública de Auth, **entonces** falla.
- **CA-5.** **Dado** una sesión vencida y datos en caché, **cuando** la app consulta la sesión, **entonces** el estado es `expired` y las lecturas en caché siguen disponibles.

## Casos borde y errores
- Sin conexión, `signIn` devuelve `OFFLINE` sin intentar.

## Datos
Trigger sobre `auth.users` → `profile` + `user_role('colportor')`. Configuración de Auth con registro desactivado en `config.toml`.

## Cómo se verifica
- **Integración:** creación de usuario → perfil y rol; inicio de sesión correcto e incorrecto; usuario inactivo; registro público rechazado.

## Terminado cuando
Se cumple §10 de las reglas comunes.

**Al terminar, avisa al dueño:** para que él complete su `.env.local` con los valores de **staging** (guía de despliegue, paso 2.7) y cree su usuario en staging con el script. La IA no pide ni pega esas claves.
