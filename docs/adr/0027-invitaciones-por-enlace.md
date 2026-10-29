# ADR-0027: Invitaciones y restablecimiento de contraseña por enlace, desde el panel de admin
Estado: Aceptado · Fecha: 2026-10-28

## Contexto
El dueño quiere invitar desde su panel de admin sin tocar la base de datos. El correo integrado de Supabase está limitado a **2 mensajes por hora** y solo envía a miembros de la organización; para correo real hace falta un SMTP propio y, normalmente, un dominio. El mismo límite afecta el restablecimiento de contraseñas.

## Decisión
- El botón **"Invitar"** del panel de admin llama a un endpoint de servidor (Route Handler, **solo admin**, usa `service_role` en servidor) que crea la invitación con `auth.admin.generateLink({ type: 'invite' })` y devuelve un **enlace para copiar y enviar por WhatsApp**. El enlace **caduca** y se puede **regenerar**.
- Mismo mecanismo para **restablecer contraseña** (`type: 'recovery'`): el admin genera un enlace para el usuario que la olvidó.
- El admin puede **desactivar/reactivar** usuarios (`profile.is_active` + bloqueo en Auth).
- Un trigger sobre `auth.users` crea `profile` y el rol `colportor` al aceptar la invitación.
- El **primer admin** se crea con un script de arranque.
- Envío automático por correo: **backlog** (requiere dominio + SMTP propio).

## Alternativas descartadas
- *Invitar por correo con el SMTP de Supabase*: límite de 2/hora y solo a miembros.
- *Crear usuarios a mano en el panel de Supabase*: el dueño no quiere tocar la base de datos.
- *Registro público con código*: abre la puerta a abuso y agota almacenamiento.

## Consecuencias
El admin es el canal de recuperación de contraseñas. Los enlaces se tratan como credenciales temporales (SECURITY.md). Cada endpoint verifica admin en servidor, valida con Zod y se prueba (TESTING.md).

## Referencias
BR-USR-01..08 · FLOWS F-25 · AF-80..AF-82 · RQ-ACC-04..06 · DECISION-LOG Q13, Q30
