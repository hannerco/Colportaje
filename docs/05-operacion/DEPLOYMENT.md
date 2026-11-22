# Despliegue, entornos y operaciones

Costo objetivo: **$0**. Región: **us-east-1 (N. Virginia)** en Supabase y **iad1 (Washington D.C.)** en Vercel, elegidas **midiendo** desde Medellín (ADR-0002, ADR-0021). **Guía explicada paso a paso para el dueño:** [`05-operacion/GUIA-DESPLIEGUE-PASO-A-PASO.md`](GUIA-DESPLIEGUE-PASO-A-PASO.md).

## 1. Servicios
| Servicio | Uso | Plan | Región | Cuenta |
|---|---|---|---|---|
| **GitHub** | Código, CI (Actions), backups programados, keep-alive | Gratis | — | `hannerco` (repo `Colportaje`, **privado**) |
| **Vercel** | Hosting de Next.js (PWA) | **Hobby** (gratis, uso no comercial) | **iad1** (por defecto) | **Cuenta nueva** dedicada |
| **Supabase** | Postgres, Auth, Storage | **Free** | **us-east-1** | **Cuenta nueva** dedicada, org "Emprendum" |
| **Claude Design** | Diseño de pantallas (fuera del repo) | — | — | — |
| *(futuro)* Cloudflare R2 | Fotos al 70 % de uso | Gratis (10 GB) | — | — |

**Por qué Vercel y no Render:** Render gratis duerme el servicio a los 15 min y el primer acceso tarda ~30 s (mala experiencia en la calle). **Por qué us-east-1:** medido desde Medellín: us-east-1 ~85 ms, us-east-2 ~97 ms, sa-east-1 ~146 ms, us-west-1 ~210 ms (el tráfico de Colombia sale por EE. UU.). Repetir la medición desde un celular con datos móviles (SG-01).

## 2. Estado de las conexiones
> Mantener actualizado. Última verificación: ver historial de git.

| Conexión | Estado | Detalle |
|---|---|---|
| Repositorio GitHub `Colportaje` | **Creado (SG-03)** | `https://github.com/hannerco/Colportaje`, **privado** (2026-11-10). Ya se puede subir código; nunca claves ni datos reales |
| CLI Vercel | Instalado (65.x) | **Login hecho** (equipo Emprendum, plan Hobby) |
| CLI Supabase | Proyecto: 3.1.0 (`pnpm exec supabase`) | **Login hecho** (2026-11-10, cuenta nueva). El repositorio está enlazado a **staging** |
| Proyecto Vercel `colportor-storybook` | **Creado (2026-11-17)** | Storybook: producción desde `main` en `https://colportor-storybook.vercel.app`; vistas previas por rama (protegidas por Vercel) |
| Proyecto Vercel `colportor` (la app) | **Creado y enlazado al repositorio (2026-11-20, HU-BASE-07)** | Next.js, Node 22, región `iad1` (`vercel.json`), producción desde `main`. Variables: producción → `colportor-prod`; vistas previas y desarrollo → `colportor-staging` (solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`; la `service_role` **no** va a Vercel: la app no la usa) |
| Proyectos Supabase `colportor-prod` / `colportor-staging` | **Creados (2026-11-10)** | us-east-1, org Emprendum, registro público desactivado, sin integración de GitHub. Staging activo; **prod estaba pausado el 2026-11-20** (plan gratis): se reactiva desde el panel y el *keep-alive* evita que vuelva a pasar |
| GitHub Environments `staging` / `production` | **Creados (2026-11-20)** | Cada uno con sus secrets; ver §5.4 |
| Repositorio de backups `hannerco/colportor-backups` | **Creado (2026-11-20, privado)** | Solo archivos cifrados; la CI escribe con una *deploy key* (secret `BACKUP_DEPLOY_KEY`) |

## 3. Entornos
| Entorno | Base de datos | Hosting | Uso |
|---|---|---|---|
| **Local** | Supabase local (`supabase start`, Docker) | `pnpm dev` | Desarrollo y pruebas RLS/E2E |
| **Staging** | Proyecto `colportor-staging` | Preview de Vercel (por PR) | Probar migraciones y E2E sin tocar datos reales |
| **Producción** | Proyecto `colportor-prod` | Vercel (`main`) | Uso real |

El plan gratuito permite 2 proyectos activos por organización: uno de producción y uno de staging.

## 4. Variables de entorno
Ver `03-arquitectura/SECURITY.md`. Se definen en Vercel (Settings → Environment Variables; la `service_role` como *Sensitive*) y localmente en `.env.local` (ignorado por git). `.env.example` lista los nombres. **Nunca** se pegan valores en el chat ni se commitean.

## 5. Puesta en marcha (resumen técnico; el dueño sigue la guía explicada)

### 5.1 Autenticarse (interactivo; usar `! ` dentro de Claude Code)
```bash
gh auth login        # ya hecho (hannerco)
supabase login       # cuenta nueva; abre el navegador
vercel login         # cuenta nueva; abre el navegador
```

### 5.2 Supabase
```bash
supabase orgs list
supabase projects create colportor-prod    --org-id <ORG_ID> --region us-east-1 --db-password '<PASSWORD>'
supabase projects create colportor-staging --org-id <ORG_ID> --region us-east-1 --db-password '<PASSWORD>'
supabase init
supabase link --project-ref <REF_STAGING>   # primero staging
supabase db push
```
Al crear **cada** proyecto: *Enable Data API* **sí**, *Automatically expose new tables* **no**, *Enable automatic RLS* **sí**, sin conectar la integración de GitHub de Supabase (las migraciones las despliega el CI); misma configuración en prod y staging. Las migraciones llevan `GRANT` explícitos (SECURITY.md, HU-BASE-02 R6).
Panel: Authentication → desactivar **registro público**; **URL Configuration** con la URL de Vercel; subir el **tiempo de caducidad del enlace de invitación** al máximo permitido; buckets `title-images` (público) y `user-photos` (privado) con las políticas de `03-arquitectura/SECURITY.md` (idealmente creados por migración).

### 5.3 Vercel
```bash
vercel link --project colportor
vercel git connect
vercel env add NEXT_PUBLIC_SUPABASE_URL      production|preview|development
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production|preview|development
```
Producción usa `colportor-prod`; *preview* y *development*, `colportor-staging`. La app solo lee esas dos variables públicas (`src/lib/env.ts`); la `SUPABASE_SERVICE_ROLE_KEY` **no** se carga en Vercel (R3 de HU-BASE-07: se usa solo en scripts locales y nunca en el navegador). Instalación: `corepack enable && pnpm install --frozen-lockfile` (pnpm 12, igual que el Storybook).
`vercel.json`: `{ "regions": ["iad1"] }`. Verificar en Settings → Functions → Function Region. Hobby podría limitar las opciones: si `iad1` es el valor por defecto, no hay nada que cambiar.

### 5.4 GitHub
- Proteger `main`: regla `proteger-main` **ya creada y activa** (2026-11-10: exige PR, bloquea force push y borrado, 0 aprobaciones). Falta marcar el *check* `ci` como obligatorio cuando HU-BASE-01 cree el workflow y corra una vez (HU-BASE-07 CA-8).
- **Secrets (HU-BASE-07).** Cada entorno de GitHub (Settings → Environments) tiene los suyos; un job de staging no puede leer los de producción:

| Dónde | Nombre | Quién lo carga | Para qué |
|---|---|---|---|
| Repositorio | `SUPABASE_ACCESS_TOKEN` | **Cargado por el dueño (2026-11-21).** Token propio para la CI (supabase.com → Account → Access Tokens), de alcance «Project» sobre `colportor-prod` y `colportor-staging`, **vence a los 90 días (≈ 2027-02-19): renovarlo antes** (crear otro igual y `gh secret set SUPABASE_ACCESS_TOKEN`), o fallan keep-alive, backups y migraciones. Permisos: Project Settings, Connection Pooling, API Keys, API Key Secrets, Storage, Storage Config, Data API Config y Projects (account-wide) en lectura; Database en lectura y escritura; el resto en None | Enlazar proyectos, consultas por la Management API y copiar las fotos en el backup |
| Entorno `staging` | `SUPABASE_PROJECT_REF_STAGING` | Cargado (2026-11-20) | Proyecto de staging |
| Entorno `staging` | `SUPABASE_DB_PASSWORD_STAGING` | **El dueño** | `db push` a staging |
| Entorno `production` | `SUPABASE_PROJECT_REF_PROD` | Cargado (2026-11-20) | Proyecto de producción |
| Entorno `production` | `SUPABASE_DB_PASSWORD_PROD` | **El dueño** | `db push` y backup de producción |
| Entorno `production` | `BACKUP_DEPLOY_KEY` | Cargado (2026-11-20; *deploy key* con escritura solo en `colportor-backups`) | Subir el backup |
| Entorno `production` (variable) | `BACKUP_REPO` = `hannerco/colportor-backups` | Cargado | Destino del backup |

  Cargar un valor sin pegarlo en ningún chat: `gh secret set <NOMBRE> [--env staging|production]` (lo pide oculto). Si no se recuerda la contraseña de una base: Supabase → proyecto → Database → Settings → *Reset database password*, y se actualiza el secret.
- **Workflows:** `ci.yml` (calidad, auditoría `pnpm audit --prod --audit-level high` —por ahora **solo avisa**: el 2026-11-20 ya había en `main` una crítica en `maplibre-gl` (se corrige con 6.4.1, cambio mayor) y una alta en `zod` vía `@serwist/turbopack` (≥ 4.6.6); al corregirlas se quita `continue-on-error`— y `actionlint`), `deploy-db.yml` (al fusionar a `main` con migraciones: staging → producción), `keepalive.yml` (cada 3 días), `backup.yml` (cada 2 días y manual). Dependabot semanal (`.github/dependabot.yml`) para npm y GitHub Actions.
- **Comprobación de la nube:** `pnpm check:cloud staging|prod` (solo lectura, por la Management API; necesita `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF_<ENTORNO>`). Falla si una tabla con `owner_id` no tiene RLS, si el rol `postgres` deja permisos por defecto a `anon`/`authenticated` sobre tablas nuevas de `public`, o si falta el event trigger `ensure_rls`. Los permisos por defecto de `supabase_admin` son internos de la plataforma y no se revisan. Corre también al final de cada job de `deploy-db.yml`.

### 5.5 Primer administrador
1. Crear el primer usuario del dueño (invitación desde la propia app solo existe cuando ya hay un admin: el **primero** se crea con un script de arranque o desde el panel de Supabase → Authentication → Users → *Add user* con el correo del dueño).
2. Insertar su `profile` y los roles `colportor` y `admin` (script `scripts/bootstrap-admin.ts` o `supabase/seed.sql`).
3. Cargar el catálogo con `scripts/seed-titles.ts` (idempotente; recibe un CSV/JSON de Títulos y precios).
4. A partir de ahí, **todas las invitaciones se hacen desde el panel de admin** (enlace para WhatsApp), sin tocar la base de datos.

## 6. Migraciones
- Todo cambio de esquema = nueva migración en `supabase/migrations/` (`supabase migration new <nombre>`), revisada por PR. **Nunca** editar una migración ya aplicada.
- Local: `supabase db reset` reconstruye con migraciones + seed.
- Staging: se aplica primero; las pruebas E2E corren allí. Producción: `supabase db push` desde CI al fusionar a `main`.
- Tras cambiar el esquema: `supabase gen types typescript --linked > src/adapters/supabase/database.types.ts`.

## 7. Confiabilidad del plan gratuito (qué esperar y cómo mitigarlo)
El dueño quiere que el proyecto "no se caiga por nada del mundo". El plan **Free de Supabase no ofrece garantía de disponibilidad**. Riesgos y mitigaciones:
| Riesgo | Mitigación |
|---|---|
| **Pausa tras 7 días sin actividad** | Uso diario la evita; además un **GitHub Action cada 3 días** hace una consulta ligera de mantenimiento |
| **Sin copias de seguridad** | **Backup cada 2 días** durante las primeras semanas, luego semanales (ver §8) |
| 500 MB de BD / 1 GB de archivos | Fotos comprimidas (ADR-0013); alerta al admin al 70 %; migrar fotos a R2 |
| Incidente del proveedor | Backups externos; plan de restauración probado |
| Cuenta o proyecto bloqueado por error | Cuenta dedicada solo a este proyecto, 2FA, correo de recuperación guardado |
| Todo lo anterior | **Pasar a Supabase Pro (~25 USD/mes: copias diarias, sin pausa)** cuando la use gente con dinero real (SG-06) |

## 8. Backups
Workflow `.github/workflows/backup.yml` (cada 2 días al inicio, luego semanal, y manual):
1. `supabase db dump` de producción: `roles.sql`, `schema.sql` y `data.sql` (con `COPY`).
2. Copia de los buckets `user-photos` y `title-images`.
3. Todo va en un `.tar.gz` **cifrado** con `openssl cms` y el certificado público `.github/backup/recipient.crt`. **La llave privada no está en el repositorio ni en GitHub**: la guarda el dueño (se generó en su equipo, `~/Documents/Colportor-backups/llave-privada-backups.pem`; debe guardarla en un gestor de contraseñas o una memoria aparte y borrar la copia suelta). Sin ella no se puede abrir ninguna copia.
4. Cada copia es una rama huérfana `backup/<fecha>-<bytes>` de `hannerco/colportor-backups` (así borrar una copia libera su espacio). Retención: las de las últimas **8 semanas, máximo 30**. Aviso (amarillo) desde 2,5 GB y error (rojo) desde 3 GB.

**Abrir una copia:**
```bash
git clone --single-branch --branch backup/<fecha>-<bytes> git@github.com:hannerco/colportor-backups.git copia
openssl cms -decrypt -binary -inform DER -in copia/colportor-<fecha>.tar.gz.cms \
  -inkey <ruta>/llave-privada-backups.pem -out backup.tar.gz
tar -xzf backup.tar.gz   # roles.sql, schema.sql, data.sql, storage/
```
**Destino (OQ-42, decidido 2026-11-16):** repositorio privado de GitHub solo para backups cifrados. **Umbral de migración: al llegar a 3 GB en total, pasar a Cloudflare R2.** El workflow avisa desde 2,5 GB para dar tiempo a crear la cuenta de R2 (la crea el dueño). Mientras tanto, la retención se mantiene para que el repositorio no crezca sin control.
**Restauración (probar al menos una vez antes de abrir a los colportores):** crear proyecto vacío → `supabase db push` (esquema) → restaurar datos con `psql`/`pg_restore` → restaurar fotos → verificar conteos. Documentar el resultado de la prueba aquí.

## 9. Monitoreo y operación
- Uso de almacenamiento visible al admin; alerta al 70 %.
- Vercel Speed Insights (opcional) y Supabase Reports para latencia.
- Workflow `keepalive.yml` (cada 3 días) contra staging y producción.
- Registrar incidentes y cambios de configuración en este archivo.

## 10. Lista de verificación antes de abrir a los colportores
- [ ] Registro público desactivado en Supabase Auth (en prod y staging).
- [ ] RLS activada y `tests/rls` en verde en todas las tablas.
- [ ] Buckets y políticas de Storage verificados con dos usuarios de prueba.
- [ ] Región **us-east-1** (Supabase) e **iad1** (Vercel) confirmadas; (SG-01 cerrado: servidores ya creados).
- [ ] Variables correctas en Vercel; `service_role` fuera del cliente y marcada Sensitive.
- [ ] Endpoints `/api/admin/*` rechazan a no-admins (probado).
- [ ] Backup ejecutado y **restauración probada**; keep-alive activo.
- [ ] PWA instalable en Android e iOS reales; lectura sin conexión verificada; rendimiento medido.
- [ ] Aviso de tratamiento de datos redactado y revisado (SG-05).
- [ ] Primer administrador y catálogo cargados; cuentas con 2FA y recuperación guardada.
