# HU-BASE-02 · Base de datos local, convenciones y aislamiento por usuario (RLS)

> **Épica:** Cimientos · **Depende de:** HU-BASE-01 · **Reglas:** BR-GEN-01/02/04, BR-USR-03/07, ADR-0001, ADR-0022, ADR-0041 · **Diseño:** sin pantalla

## Historia
**Como** colportor **quiero** que nadie más (ni siquiera el admin) pueda ver o cambiar mis clientes, libros y dinero **para** confiar mis datos y los de mis clientes a la app.

## Contexto
- Se trabaja con **Supabase local** (`supabase start`, requiere Docker). Las cuentas en la nube las crea el dueño después (SG-02); no se necesitan aquí.
- El esquema normativo está en `02-datos/DATABASE.md` (nombres y tipos); el SQL exacto no lo es. Esta HU crea solo la **base común**; cada HU crea sus tablas en su propia migración (ADR-0041: las de visitas y minibooks no se crean ahora).
- Los datos de prueba son **ficticios**: nunca datos reales de clientes.

## Alcance
- **Incluye:** `supabase init` y `config.toml`; migración base con enums de la primera entrega (`app_role`, `title_category`, `copy_status`, `payment_kind`, `payment_status`, `cancel_reason`, `time_format`, `pay_method`, `deposit_status`, `photo_kind`, `issue_resolution`); funciones utilitarias `set_updated_at()`, `is_admin()`, `is_active_user()`, `today_bogota()`; tablas `profile`, `user_role`, `app_settings`; patrón de RLS; arnés de pruebas RLS con dos usuarios; generación de tipos para `src/adapters/supabase/`; `seed.sql` con datos ficticios; paso de RLS en la CI.
- **No incluye:** tablas de negocio (las crea cada HU), creación de usuarios en la nube, backups (fase de despliegue).

## Contrato
- **Patrón obligatorio de toda tabla de negocio** (lo siguen las HU siguientes): `id uuid primary key` (lo genera el cliente), `owner_id uuid not null default auth.uid()`, `created_at`, `updated_at` (trigger `set_updated_at`), `deleted_at null`; RLS activado con la política `owner_id = auth.uid() and is_active_user()` para `select/insert/update/delete`.
- **Permisos de la API (`GRANT`):** en Supabase en la nube (prod y staging) están **desactivados** "Automatically expose new tables" y activado "Enable automatic RLS" (decisión del dueño, 2026-11-10; ver SECURITY.md). Una tabla nueva **no** es accesible desde la API hasta que su migración otorga permisos explícitos: `grant select, insert, update, delete on <tabla> to authenticated;` (y `grant ... to service_role` solo si un endpoint de servidor la necesita). **Nunca** se otorga nada a `anon` en tablas de negocio. La migración base DEBE además quitar los privilegios por defecto del esquema `public` (`alter default privileges in schema public revoke ... from anon, authenticated, service_role`; verificar la sintaxis exacta contra la versión de la CLI) para que **local se comporte igual que la nube**. *Implementado (2026-11-13):* `alter default privileges for role postgres …` en la migración base y, además, `auto_expose_new_tables = false` en `supabase/config.toml` (opción de la CLI 3.1 equivalente al ajuste de la nube). Los privilegios por defecto de `supabase_admin` son internos de Supabase y no afectan a las tablas de nuestras migraciones.
- `today_bogota()` devuelve la fecha actual en America/Bogota; los triggers y funciones que validan fechas la usan.
- Comandos: `pnpm db:reset` (recrea la base local con migraciones y seed), `pnpm db:types` (regenera tipos), `pnpm test:rls`.

## Reglas (el sistema DEBE…)
- **R1.** Toda tabla con `owner_id` DEBE tener RLS activado y la política del patrón (BR-GEN-01).
- **R2.** CUANDO `profile.is_active = false`, ese usuario NO DEBE leer ni escribir ninguna fila de negocio (BR-USR-07).
- **R3.** El rol `admin` NO DEBE dar acceso a datos de negocio de otros usuarios (BR-GEN-01).
- **R4.** `app_settings` y `user_role` DEBEN ser de lectura para autenticados y de escritura solo para admin.
- **R6.** Toda migración que crea una tabla DEBE incluir en la misma migración sus políticas RLS **y** sus `GRANT` explícitos; local y nube DEBEN comportarse igual (sin exposición automática de tablas).
- **R5.** Las migraciones DEBEN ser aditivas: una migración aplicada nunca se edita (CONVENTIONS §5b).

## Criterios de aceptación
- **CA-1.** **Dado** los usuarios A y B con una fila cada uno en una tabla de prueba con `owner_id`, **cuando** A consulta, **entonces** solo recibe la suya; **cuando** A intenta actualizar o borrar la de B, **entonces** afecta 0 filas; **cuando** A intenta insertar con `owner_id` de B, **entonces** falla.
- **CA-2.** **Dado** que A es admin, **cuando** consulta la tabla de prueba, **entonces** tampoco ve la fila de B.
- **CA-3.** **Dado** A con `is_active = false`, **cuando** consulta, **entonces** recibe 0 filas, incluidas las suyas.
- **CA-4.** **Dado** un usuario no admin, **cuando** intenta modificar `app_settings` o `user_role`, **entonces** falla.
- **CA-5.** **Dado** una tabla de negocio nueva con `owner_id` agregada en el futuro, **cuando** corre `pnpm test:rls`, **entonces** la prueba genérica la recorre sola (descubre las tablas con `owner_id` en el esquema) y falla si no tiene RLS.
- **CA-6.** **Dado** una fila actualizada, **cuando** se lee, **entonces** su `updated_at` cambió.

- **CA-7.** **Dado** una tabla nueva creada por una migración **sin** `GRANT`, **cuando** el usuario autenticado A la consulta por la API, **entonces** falla por falta de permiso (no devuelve filas); **cuando** la migración incluye el `GRANT` y la política, **entonces** A ve solo las suyas. La prueba genérica de CA-5 también falla si una tabla con `owner_id` no tiene `GRANT` a `authenticated` o si `anon` tiene algún permiso sobre ella.

## Casos borde y errores
- `owner_id` lo asigna el default `auth.uid()`; si el cliente envía otro, la política de `with check` lo rechaza.

## Datos
Migración base descrita en Alcance. `app_settings` con una sola fila (`id = 1`, `bonus_goal = 4000000`; **sin** `max_favorites`).

## Cómo se verifica
- **Integración (Supabase local):** `tests/rls/` con los CA-1 a CA-6, incluida la prueba genérica de CA-5.

## Terminado cuando
Se cumple §10 de las reglas comunes y la CI corre `supabase start` + `pnpm test:rls`.
