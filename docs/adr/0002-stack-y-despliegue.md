# ADR-0002: Stack, plataformas y región
Estado: Aceptado · Fecha: 2026-10-26 · Revisado: 2026-10-28 (región y cuentas)

## Contexto
Sin presupuesto; máximo ~10 usuarios; el dueño domina TypeScript y Next.js; los usuarios están en Colombia y **la lentitud hace que la gente odie la app**. El dueño quiere que el proyecto "no se caiga por nada del mundo" y prefiere cuentas nuevas dedicadas (tiene otros proyectos en Supabase).

## Decisión
- **Next.js (App Router) + TypeScript** como PWA; **Supabase** (Postgres, Auth, Storage); **Vercel Hobby**; **pnpm**; Node 22 LTS; **Vitest** + **Playwright**. Planes gratuitos.
- **Región: us-east-1 (N. Virginia) en Supabase y iad1 (Washington D.C., por defecto) en Vercel.** Se **midió** la latencia TCP desde Medellín (línea fija, 6 muestras): us-east-1 **~85 ms**, us-east-2 ~97 ms, sa-east-1 (São Paulo) **~146 ms**, us-west-1 ~210 ms. El tráfico de Colombia sale por EE. UU., por eso Brasil queda más lejos en la práctica. Pendiente repetir desde un celular con datos móviles (SG-01).
- **Cuentas nuevas y dedicadas** de Supabase y Vercel, con 2FA. Supabase: organización "Colportor" con **dos proyectos** (`colportor-prod`, `colportor-staging`).
- **Vercel y no Render:** Render gratis duerme a los 15 min y el primer acceso tarda ~30 s.
- No usar funciones exclusivas de Vercel para poder migrar.

## Alternativas descartadas
- *São Paulo (sa-east-1)*: era la recomendación inicial; la medición la refutó.
- *Vite + React*: el dueño prefiere Next.js por conocimiento.
- *Render gratis*: se duerme.
- *Cloudflare Pages/Workers*: más generoso y sin cláusula "no comercial", pero Next.js requiere un adaptador (OpenNext) con más trabajo y límites de runtime; con 14 días de plazo no conviene. Reevaluar si la app se monetiza.
- *API propia / Firebase*: más piezas o peor encaje.

## Consecuencias
- Vercel Hobby es "no comercial": migrar o pagar si se monetiza.
- Supabase Free: 500 MB de BD, 1 GB de archivos, 2 proyectos activos por organización, **pausa tras 7 días sin actividad** y **sin copias de seguridad** → mitigaciones en ADR-0020 y `DEPLOYMENT.md` §7; **Pro (~25 USD/mes)** cuando la use gente con dinero real (SG-06).
- El correo integrado de Supabase está limitado (ADR-0027).

## Referencias
ARCHITECTURE.md · DEPLOYMENT.md · GUIA-DESPLIEGUE-PASO-A-PASO.md · DECISION-LOG (rondas 7–9)
