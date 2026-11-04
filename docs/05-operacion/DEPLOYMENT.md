# Despliegue, entornos y operaciones

Costo objetivo: **$0**. Región: **us-east-1 (N. Virginia)** en Supabase y **iad1 (Washington D.C.)** en Vercel, elegidas **midiendo** desde Medellín (ADR-0002, ADR-0021). **Guía explicada paso a paso para el dueño:** [`05-operacion/GUIA-DESPLIEGUE-PASO-A-PASO.md`](GUIA-DESPLIEGUE-PASO-A-PASO.md).

## 1. Servicios
| Servicio | Uso | Plan | Región | Cuenta |
|---|---|---|---|---|
| **GitHub** | Código, CI (Actions), backups programados, keep-alive | Gratis | — | `hannerco` (repo `Colportaje`; público por ahora, privado antes de subir código) |
| **Vercel** | Hosting de Next.js (PWA) | **Hobby** (gratis, uso no comercial) | **iad1** (por defecto) | **Cuenta nueva** dedicada |
| **Supabase** | Postgres, Auth, Storage | **Free** | **us-east-1** | **Cuenta nueva** dedicada, org "Colportor" |
| **Claude Design** | Diseño de pantallas (fuera del repo) | — | — | — |
| *(futuro)* Cloudflare R2 | Fotos al 70 % de uso | Gratis (10 GB) | — | — |

**Por qué Vercel y no Render:** Render gratis duerme el servicio a los 15 min y el primer acceso tarda ~30 s (mala experiencia en la calle). **Por qué us-east-1:** medido desde Medellín: us-east-1 ~85 ms, us-east-2 ~97 ms, sa-east-1 ~146 ms, us-west-1 ~210 ms (el tráfico de Colombia sale por EE. UU.). Repetir la medición desde un celular con datos móviles (SG-01).

## 2. Estado de las conexiones
> Mantener actualizado. Última verificación: ver historial de git.

| Conexión | Estado | Detalle |
|---|---|---|
| Repositorio GitHub `Colportaje` | **Creado (SG-03)** | `https://github.com/hannerco/Colportaje`, público. Solo contiene documentación (sin las imágenes de referencia). Pasarlo a **privado** antes de subir código, claves o datos |
| CLI Vercel | Instalado (65.x) | Falta `vercel login` en la cuenta nueva |
| CLI Supabase | Instalado (2.x) | Falta `supabase login` en la cuenta nueva |
| Proyecto Vercel enlazado | Pendiente | `vercel link` |
| Proyectos Supabase `colportor-prod` / `colportor-staging` | Pendiente | `supabase projects create` o por el panel |

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
Panel: Authentication → desactivar **registro público**; **URL Configuration** con la URL de Vercel; subir el **tiempo de caducidad del enlace de invitación** al máximo permitido; buckets `title-images` (público) y `user-photos` (privado) con las políticas de `03-arquitectura/SECURITY.md` (idealmente creados por migración).

### 5.3 Vercel
```bash
vercel link
vercel git connect
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY     # solo servidor, Sensitive
```
`vercel.json`: `{ "regions": ["iad1"] }`. Verificar en Settings → Functions → Function Region. Hobby podría limitar las opciones: si `iad1` es el valor por defecto, no hay nada que cambiar.

### 5.4 GitHub
- Proteger `main` (PR obligatorio + CI verde).
- Secrets del repo (Settings → Secrets and variables → Actions): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF_PROD`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, y los de destino del backup.
- Activar Dependabot y `pnpm audit` en CI.

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
1. `supabase db dump` (esquema + datos) → archivo comprimido y **cifrado** (clave en secrets).
2. Copia del bucket `user-photos` → almacenamiento privado (repositorio privado de backups, o bucket de otro proveedor).
3. Retención: 8 semanas (o 30 copias).
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
- [ ] Región **us-east-1** (Supabase) e **iad1** (Vercel) confirmadas; medición repetida desde un celular (SG-01).
- [ ] Variables correctas en Vercel; `service_role` fuera del cliente y marcada Sensitive.
- [ ] Endpoints `/api/admin/*` rechazan a no-admins (probado).
- [ ] Backup ejecutado y **restauración probada**; keep-alive activo.
- [ ] PWA instalable en Android e iOS reales; lectura sin conexión verificada; rendimiento medido.
- [ ] Aviso de tratamiento de datos redactado y revisado (SG-05).
- [ ] Primer administrador y catálogo cargados; cuentas con 2FA y recuperación guardada.
