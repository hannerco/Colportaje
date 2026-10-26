# Seguridad y privacidad

Los datos incluyen nombres, teléfonos, direcciones, fotos de clientes y dinero. Tratar como sensibles.

## Modelo de amenazas (v1)
| Amenaza | Mitigación |
|---|---|
| Un colportor lee/edita datos de otro | **RLS** por `owner_id` en todas las tablas; pruebas en `tests/rls/` (obligatorias) |
| Un colportor se hace admin | Roles solo en `user_role`, escritura solo con `is_admin()`; el conmutador de UI no concede nada |
| Fuga de la `service_role key` | Solo servidor/scripts; **nunca** `NEXT_PUBLIC_*`; no se commitea; rotación documentada |
| Fotos privadas expuestas | Bucket `user-photos` privado, políticas por prefijo `owner_id/`, **URLs firmadas** de corta duración |
| Registro abusivo / agotar almacenamiento | **Solo invitación**; sin registro público; alerta de uso |
| XSS por campos libres (información, notas) | Render como texto, nunca `dangerouslySetInnerHTML`; React escapa por defecto |
| Inyección de URL de mapa | `maps_url` solo se usa en `href`/iframe tras validar dominio `google.com/maps`/`maps.app.goo.gl`; iframe con `sandbox` y CSP `frame-src` restringida |
| Pérdida de datos | Backups semanales (`DEPLOYMENT.md`); borrado lógico; bloqueo de abonos entregados |
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

Se validan al arrancar con Zod (`src/lib/env.ts`); la app falla rápido si faltan.

## Políticas de Storage (resumen)
- `title-images`: `select` público; `insert/update/delete` solo `is_admin()`.
- `user-photos`: `select/insert/update/delete` solo si `(storage.foldername(name))[1] = auth.uid()::text`.

## Cabeceras recomendadas (Next)
`Content-Security-Policy` estricta (`default-src 'self'`; `img-src 'self' data: blob: <supabase>`; `frame-src https://www.google.com`), `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` mínima (cámara solo si se usa la captura nativa).

## Privacidad
- Datos personales de terceros (clientes del colportor): minimizar; las fotos de "información" son opcionales.
- El admin **no** ve datos de negocio de otros colportores (BR-GEN-01).
- Mostrar al usuario cómo eliminar sus datos (borrado lógico + eliminación definitiva por el admin bajo petición, documentado).
- Cumplir la ley colombiana de protección de datos (Ley 1581 de 2012): aviso de tratamiento, finalidad y contacto — **pendiente de redactar** (ver `OPEN-QUESTIONS.md`).
