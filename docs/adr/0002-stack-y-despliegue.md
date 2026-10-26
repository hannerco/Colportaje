# ADR-0002: Stack y despliegue
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Sin presupuesto; máximo ~10 usuarios; el dueño domina TypeScript y Next.js; los usuarios están en Colombia y **la lentitud hace que la gente odie la app**.

## Decisión
- **Next.js (App Router) + TypeScript** como PWA; **Supabase** (Postgres, Auth, Storage) como backend, región **sa-east-1 (São Paulo)**; **Vercel** con región **gru1**; **pnpm**; Node 22 LTS.
- Pruebas: **Vitest** + **Playwright**. Planes gratuitos.
- No usar funciones exclusivas de Vercel para poder migrar.

## Alternativas descartadas
- *Vite + React + Supabase*: fue la recomendación inicial; el dueño prefiere Next.js por conocimiento.
- *Render gratis*: se duerme a los 15 min; el primer acceso tarda ~30 s (mala experiencia en la calle).
- *API propia (Node/Nest)*: más piezas que mantener sin beneficio con ~10 usuarios.
- *Firebase*: modelo no relacional, peor encaje con datos tan relacionales.

## Consecuencias
- Vercel Hobby es "no comercial": migrar o pagar si se monetiza.
- Supabase gratis: 500 MB BD, 1 GB archivos, pausa tras 7 días sin actividad, **sin backups** (ver ADR-0020).
- Región cercana reduce latencia (~60–90 ms desde Colombia).

## Referencias
ARCHITECTURE.md · DEPLOYMENT.md · OPEN-QUESTIONS OQ-27..29 · DECISION-LOG Q3, Q8, Q50
