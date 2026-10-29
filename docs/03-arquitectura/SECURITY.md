# Seguridad y privacidad

Los datos incluyen nombres, teléfonos, direcciones, fotos de clientes y dinero. Tratar como sensibles.

## Modelo de amenazas (v1)
| Amenaza | Mitigación |
|---|---|
| Un colportor lee/edita datos de otro | **RLS** por `owner_id` en todas las tablas; pruebas en `tests/rls/` (obligatorias) |
| Un colportor se hace admin | Roles solo en `user_role`, escritura solo con `is_admin()`; el conmutador de UI no concede nada |
| Un admin ve datos de negocio de otros | RLS por `owner_id` también para admins (BR-GEN-01); el admin solo lee catálogo, ajustes y `profile`/`user_role` |
| Abuso de los endpoints `/api/admin/*` | Verificación de admin **en servidor** en cada llamada, validación Zod, límites de frecuencia, registro de la acción; devuelven enlaces de un solo uso con caducidad, nunca claves |
| Enlaces de invitación/restablecimiento filtrados | Un solo uso, caducidad corta, regenerables; el admin los entrega por un canal privado (WhatsApp 1:1) |
| Usuario retirado sigue entrando | `profile.is_active = false` + bloqueo (`ban`) en Auth; RLS rechaza si `is_active` es falso |
| Fuga de la `service_role key` | Solo servidor/scripts; **nunca** `NEXT_PUBLIC_*`; no se commitea; rotación documentada |
| Fotos privadas expuestas | Bucket `user-photos` privado, políticas por prefijo `owner_id/`, **URLs firmadas** de corta duración |
| Registro abusivo / agotar almacenamiento | **Solo invitación**; sin registro público; alerta de uso |
| XSS por campos libres (información, notas) | Render como texto, nunca `dangerouslySetInnerHTML`; React escapa por defecto |
| Inyección de URL de mapa | `maps_url` solo se usa en `href`/iframe tras validar dominio `google.com/maps`/`maps.app.goo.gl`; iframe con `sandbox` y CSP `frame-src` restringida |
| Pérdida de datos | Backups cada 2 días al inicio y luego semanales, keep-alive, paso futuro a Supabase Pro (`05-operacion/DEPLOYMENT.md` §7–8); borrado lógico; bloqueo de abonos entregados |
| Sesión robada | Cookies `httpOnly`/`secure` (Supabase SSR), expiración razonable, cierre de sesión |
| Dependencias vulnerables | `pnpm audit` y Dependabot en CI |

## Secretos y entorno
Archivo `.env.example` versionado (sin valores); `.env.local` **ignorado por git**. Variables:

| Variable | Dónde | Pública |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente | sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente | sí (protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | solo servidor/scripts | **NO** |
| `SUPABASE_DB_PASSWORD` | solo local/CI de backup | **NO** |
| `SUPABASE_ACCESS_TOKEN` | CI (migraciones/backups) | **NO** |
| `SUPABASE_PROJECT_REF` / `_PROD` / `_STAGING` | scripts y CI | no sensible, pero no se publica |

Se validan al arrancar con Zod (`src/lib/env.ts`); la app falla rápido si faltan.

## Políticas de Storage (resumen)
- `title-images`: `select` público; `insert/update/delete` solo `is_admin()`.
- `user-photos`: `select/insert/update/delete` solo si `(storage.foldername(name))[1] = auth.uid()::text`.

## Autenticación sin correo transaccional
El correo integrado de Supabase está limitado (2 mensajes/hora y solo a miembros de la organización), por lo que **no se usa** para invitaciones ni restablecimientos (ADR-0027). El flujo es: el admin genera un **enlace** (`auth.admin.generateLink` de tipo `invite` o `recovery`) desde un endpoint de servidor y lo entrega por WhatsApp. Consecuencias de seguridad: (1) el enlace equivale a una credencial temporal, tratarlo como secreto; (2) el admin es el único canal de recuperación de contraseñas; (3) el registro público está desactivado en Supabase Auth.

## Cabeceras recomendadas (Next)
`Content-Security-Policy` estricta (`default-src 'self'`; `img-src 'self' data: blob: <supabase>`; `frame-src https://www.google.com`), `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` mínima (cámara solo si se usa la captura nativa).

## Privacidad
- Datos personales de terceros (clientes del colportor): minimizar; las fotos de "información" son opcionales.
- El admin **no** ve datos de negocio de otros colportores (BR-GEN-01).
- Mostrar al usuario cómo eliminar sus datos (borrado lógico + eliminación definitiva por el admin bajo petición, documentado).
- Cumplir la ley colombiana de protección de datos (Ley 1581 de 2012): aviso de tratamiento, finalidad y contacto. Plantilla con huecos en `05-operacion/AVISO-DATOS-PLANTILLA.md`; el responsable y su contacto los define el dueño y debe revisarlo alguien con criterio legal antes de abrir a otros colportores (SG-05).
