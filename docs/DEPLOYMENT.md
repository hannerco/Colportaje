# Despliegue, entornos y operaciones

Costo objetivo: **$0**. Región objetivo: **São Paulo** (cercanía a Colombia; ver ADR-0021).

## 1. Servicios
| Servicio | Uso | Plan | Región |
|---|---|---|---|
| **GitHub** | Código, CI (Actions), backups programados | Gratis | — |
| **Vercel** | Hosting de Next.js (PWA) | Hobby (gratis, uso no comercial) | `gru1` (São Paulo) |
| **Supabase** | Postgres, Auth, Storage | Free | `sa-east-1` (São Paulo) |
| **Claude Design** | Diseño de pantallas (fuera del repo) | — | — |
| *(futuro)* Cloudflare R2 | Fotos al 70 % de uso | Gratis (10 GB) | — |

## 2. Estado de las conexiones
> Actualizar esta sección cuando cambie. Última actualización: ver historial de git.

| Conexión | Estado | Detalle |
|---|---|---|
| Repositorio GitHub | Ver `README.md` raíz / `gh repo view` | Privado, rama `main` |
| CLI Vercel | Instalado (`vercel` 65.x) | Requiere `vercel login` (navegador) |
| CLI Supabase | Instalado (`supabase` 2.x) | Requiere `supabase login` (navegador) |
| Proyecto Vercel enlazado | Pendiente de login | `vercel link` |
| Proyecto Supabase creado/enlazado | Pendiente de login | `supabase projects create` + `supabase link` |

## 3. Entornos
| Entorno | Base de datos | Hosting | Uso |
|---|---|---|---|
| **Local** | Supabase local (`supabase start`, Docker) | `pnpm dev` | Desarrollo y pruebas RLS/E2E |
| **Preview** | Proyecto Supabase de **producción o staging** (decidir; con ~10 usuarios se usa el mismo proyecto con datos de prueba separados, o un segundo proyecto gratuito) | Vercel preview por PR | Revisión |
| **Producción** | Proyecto Supabase `colportaje` | Vercel (`main`) | Uso real |

> El plan gratuito de Supabase permite 2 proyectos activos: se recomienda uno de **producción** y uno de **staging** para probar migraciones. Decisión final al crear los proyectos (anotar aquí).

## 4. Variables de entorno
Ver `SECURITY.md`. Se definen en Vercel (Project → Settings → Environment Variables) y localmente en `.env.local`.
`.env.example` (versionado) lista los nombres sin valores. Nunca se commitean valores.

## 5. Puesta en marcha (una sola vez)

### 5.1 Autenticarse
```bash
gh auth login            # ya hecho (cuenta hannerco)
vercel login             # abre el navegador
supabase login           # abre el navegador, genera un access token
```
Si se ejecuta desde Claude Code, anteponer `! ` para que corra en la sesión (p. ej. `! vercel login`).

### 5.2 Supabase
```bash
supabase orgs list
# Crear el proyecto en São Paulo (guardar la contraseña de la BD en un gestor de secretos, NO en git)
supabase projects create colportaje --org-id <ORG_ID> --region sa-east-1 --db-password '<PASSWORD_FUERTE>'
supabase init                                   # crea supabase/config.toml
supabase link --project-ref <PROJECT_REF>
supabase db push                                # aplica supabase/migrations/*
```
En el panel de Supabase: Authentication → desactivar **registro público** (*Allow new users to sign up* = off) y configurar la plantilla de correo de invitación; crear buckets (`title-images` público, `user-photos` privado) con las políticas de `SECURITY.md`.

### 5.3 Vercel
```bash
vercel link                                     # asocia el directorio con un proyecto nuevo
vercel git connect                              # conecta el repo de GitHub (despliegue automático)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY        # solo Production/Preview, nunca Public
```
`vercel.json` fija la región: `{ "regions": ["gru1"] }`. Verificar en Project → Settings → Functions → Region.

### 5.4 GitHub
- Proteger `main` (PR obligatorio + CI verde).
- Secrets del repo (para CI/backups): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, y los de destino del backup.
- Activar Dependabot y `pnpm audit` en CI.

### 5.5 Primer administrador
1. Crear el primer usuario desde Supabase (Authentication → Users → *Add user* con correo del dueño).
2. Insertar su perfil y roles: `profile` + `user_role (colportor)` y `user_role (admin)` (script `scripts/bootstrap-admin.ts` o SQL en `supabase/seed.sql`).
3. Cargar el catálogo con `scripts/seed-titles.ts` (idempotente; recibe un CSV/JSON de Títulos y precios).

## 6. Invitar a un colportor (texto para la pantalla de admin)
1. Abre el panel de Supabase del proyecto → **Authentication → Users**.
2. Pulsa **Invite user** y escribe el correo de la persona.
3. La persona recibirá un correo; al abrirlo crea su contraseña y entra a la app.
4. Verifica en **Admin → Usuarios** que aparece con el rol *colportor*.
(Un formulario dentro de la app con `service_role` en el servidor queda para F2.)

## 7. Migraciones
- Todo cambio de esquema = nueva migración en `supabase/migrations/` (`supabase migration new <nombre>`), revisada por PR. **Nunca** editar una migración ya aplicada.
- Local: `supabase db reset` reconstruye desde cero con migraciones + seed.
- Producción: `supabase db push` desde CI al fusionar a `main` (tras pasar pruebas), o manualmente por el dueño.
- Después de cambiar el esquema, regenerar tipos: `supabase gen types typescript --linked > src/adapters/supabase/database.types.ts`.

## 8. Backups
Workflow `.github/workflows/backup.yml` (semanal + manual):
1. `supabase db dump` (esquema + datos) → archivo comprimido y **cifrado** (p. ej. `age`/`gpg` con clave en secrets).
2. Copia del bucket `user-photos` (rclone/Storage API) → almacenamiento privado (repositorio privado de backups, Release asset, o bucket de otro proveedor).
3. Retención: 8 semanas.
**Restauración (probar al menos una vez antes de producción):** crear proyecto vacío → `supabase db push` (esquema) → restaurar datos con `psql`/`pg_restore` → restaurar fotos → verificar conteos. Documentar el resultado de la prueba aquí.

## 9. Monitoreo y operación
- Uso de almacenamiento visible al admin; alerta al 70 % (migrar a R2).
- Vercel Analytics/Speed Insights (opcional) y Supabase Reports para revisar latencia.
- Si Supabase pausa el proyecto por inactividad: reanudar desde el panel (con uso diario no ocurre).
- Registrar incidentes y cambios de configuración en este archivo.

## 10. Lista de verificación antes de abrir a los colportores
- [ ] Registro público desactivado en Supabase Auth.
- [ ] RLS activada y `tests/rls` en verde en todas las tablas.
- [ ] Buckets y políticas de Storage verificados con dos usuarios de prueba.
- [ ] Región São Paulo confirmada en Vercel y Supabase.
- [ ] Variables en Vercel correctas; `service_role` fuera del cliente.
- [ ] Backup ejecutado y **restauración probada**.
- [ ] PWA instalable en Android e iOS reales; rendimiento medido.
- [ ] Aviso de tratamiento de datos redactado (OQ-26).
- [ ] Primer administrador y catálogo cargados.
