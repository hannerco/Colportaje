# HU-BASE-07 · Despliegue: migraciones a la nube, entornos, backups y Vercel

> **Épica:** Cimientos · **Depende de:** HU-BASE-01, HU-BASE-02 · **Reglas:** ADR-0002, ADR-0041, `05-operacion/DEPLOYMENT.md` §3–§9, `03-arquitectura/SECURITY.md` · **Diseño:** sin pantalla

## Historia
**Como** dueño **quiero** que lo que se fusiona a `main` llegue a staging y producción de forma ordenada, con copias de seguridad y sin que nadie manipule claves a mano **para** confiar en que la app en uso real no se rompe ni se pierde.

## Contexto
- Ya existen los proyectos de Supabase `colportor-prod` y `colportor-staging` (us-east-1, org Emprendum, registro público desactivado, **sin** la integración de GitHub de Supabase: las migraciones las despliega esta CI). Configuración de seguridad de ambos: Data API activada, **sin** exposición automática de tablas, RLS automática activada (SECURITY.md; HU-BASE-02 R6).
- **El dueño** crea la cuenta de Vercel, hace `vercel login` y la primera importación del proyecto (`GUIA-DESPLIEGUE-PASO-A-PASO.md` §3) y **carga los valores de los secrets** en GitHub y Vercel. La IA nunca pide ni escribe claves: solo documenta los **nombres** y escribe los workflows.
- El plan gratuito de Supabase no da copias ni garantía de disponibilidad (DEPLOYMENT §7): por eso existen backup y *keep-alive*.
- Vercel despliega producción al fusionar a `main`, al mismo tiempo que corre la CI de migraciones. Por eso toda migración es **aditiva** (reglas comunes §9.1): la app nueva y la vieja funcionan con el esquema nuevo.

## Alcance
- **Incluye:** `vercel.json` (`{ "regions": ["iad1"] }`); workflow de migraciones (staging primero y producción después, `supabase db push`); workflows `keepalive.yml` y `backup.yml`; Dependabot y `pnpm audit` en CI; comprobación de solo lectura de la configuración de seguridad de la nube; documentación en `DEPLOYMENT.md` de lo que quede (nombres de secrets, cómo restaurar, resultado de la prueba de restauración).
- **No incluye:** crear cuentas o proyectos; los valores de los secrets; la importación inicial en Vercel (la hace el dueño); crear el primer administrador y cargar el catálogo (HU-BASE-03 y HU-BASE-04); el panel de uso de almacenamiento (Admin, sin diseño); pasar a Supabase Pro.

## Contrato
- **Secrets de GitHub Actions** (nombres, ver DEPLOYMENT §5.4): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD_STAGING`, `SUPABASE_DB_PASSWORD_PROD`, `SUPABASE_PROJECT_REF_STAGING`, `SUPABASE_PROJECT_REF_PROD`, y los del destino del backup. Se separan por entorno: ningún workflow de staging puede leer los de producción.
- **Workflows:** `.github/workflows/deploy-db.yml` (al fusionar a `main`: job `staging` → job `production`, este último solo si el primero pasó), `keepalive.yml` (cada 3 días), `backup.yml` (cada 2 días al inicio; manual con `workflow_dispatch`).
- **Verificación de la nube:** script `pnpm check:cloud <staging|prod>` de **solo lectura** que consulta el catálogo de Postgres y falla si: hay tablas con `owner_id` sin RLS, `anon` o `authenticated` tienen permisos por defecto sobre tablas nuevas del esquema `public`, o falta el *trigger* de RLS automática. (Las consultas exactas se verifican contra la versión de Postgres del proyecto.)

## Reglas (el sistema DEBE…)
- **R1.** CUANDO la migración falla en staging, el job de producción NO DEBE ejecutarse.
- **R2.** Los workflows DEBEN usar permisos mínimos (`permissions:` explícito), fijar versiones de las *actions* y NO DEBEN imprimir secrets en los registros.
- **R3.** `SUPABASE_SERVICE_ROLE_KEY` NO DEBE usarse en la CI de migraciones ni en ningún valor `NEXT_PUBLIC_*` (SECURITY.md).
- **R4.** El backup DEBE salir **cifrado** y la clave NO DEBE estar en el repositorio; la retención es de 8 semanas o 30 copias (DEPLOYMENT §8).
- **R5.** Ninguna migración ya aplicada se edita (CONVENTIONS §5b); `db push` que no encuentra cambios termina bien.
- **R6.** El job de producción DEBE comprobar que `SUPABASE_PROJECT_REF_PROD` no es el de staging antes de aplicar.

## Criterios de aceptación
- **CA-1.** **Dado** un PR con una migración nueva que se fusiona a `main`, **cuando** corre `deploy-db.yml`, **entonces** staging la aplica primero y producción después, y ambos proyectos quedan con la misma última migración.
- **CA-2.** **Dado** una migración con un error de SQL, **cuando** se fusiona, **entonces** el job `staging` falla y el job `production` **no** corre.
- **CA-3.** **Dado** que no hay migraciones nuevas, **cuando** corre el workflow, **entonces** termina en verde sin cambios.
- **CA-4.** **Dado** cualquier ejecución de los workflows, **cuando** se revisan sus registros, **entonces** no aparece ningún valor de secret (los nombres sí).
- **CA-5.** **Dado** `keepalive.yml`, **cuando** corre, **entonces** hace una consulta ligera a staging y a producción, y si alguno no responde, el workflow queda en rojo.
- **CA-6.** **Dado** `backup.yml` ejecutado a mano, **cuando** termina, **entonces** existe un archivo cifrado con el esquema y los datos; **sin** la clave no se abre; con ella, restaurado en un proyecto vacío, los conteos de filas por tabla coinciden con el origen (resultado anotado en DEPLOYMENT §8).
- **CA-7.** **Dado** `vercel.json`, **cuando** se importa el proyecto, **entonces** la región de las funciones es `iad1` (Settings → Functions).
- **CA-8.** **Dado** `ci.yml` ya fusionado (HU-BASE-01), **cuando** el dueño agrega el *check* `ci` como requerido en la regla `proteger-main`, **entonces** un PR con la CI en rojo no se puede fusionar. Paso manual del dueño, anotado en DEPLOYMENT §5.4.
- **CA-9.** **Dado** `pnpm check:cloud staging` y `pnpm check:cloud prod`, **cuando** se corren, **entonces** ambos terminan en verde; **dado** una tabla de prueba sin RLS, **entonces** fallan.

## Casos borde y errores
- Si staging y producción quedaran con migraciones distintas por una falla a medias, el workflow DEBE informar cuál es cuál y no seguir; la corrección es una **nueva** migración, nunca editar la aplicada.
- El destino del backup **está decidido** (OQ-42, 2026-11-16): repositorio privado de GitHub solo para backups cifrados; el dueño crea ese repositorio y entrega el token (como secret, nunca en el chat). El destino queda aislado en un solo paso del workflow, porque **al llegar a 3 GB en total se migra a Cloudflare R2**; el workflow avisa desde 2,5 GB.

## Datos
Sin tablas nuevas. No toca el esquema de negocio.

## Cómo se verifica
- Ejecución real de cada workflow en GitHub Actions (staging primero; producción solo con una migración inocua, por ejemplo un comentario) y `actionlint` en la CI.
- Prueba de restauración manual documentada (CA-6).

## Terminado cuando
Se cumple §10 de las reglas comunes (en lo que aplique a workflows) y los CA-1 a CA-9 están verificados y anotados en `05-operacion/DEPLOYMENT.md` (estado de las conexiones, §2).

**Al terminar, avisa al dueño, en este orden:** (1) antes de empezar, que el dueño cree el repositorio privado de backups (OQ-42 ya decidido: GitHub; migrar a R2 al llegar a 3 GB); (2) cuando los workflows estén listos, que él cargue los valores de los secrets en GitHub y en Vercel (nombres en el Contrato); (3) que él importe el proyecto en Vercel (guía, paso 3.3) y configure la URL en Supabase (paso 3.5); (4) que él marque el *check* `ci` como obligatorio si aún no lo hizo (CA-8); (5) que él verifique la prueba de restauración (CA-6).
