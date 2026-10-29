# ADR-0019: Arquitectura en capas y pruebas
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Requisito: arquitectura escalable, con pruebas y sin "parche sobre parche". El riesgo mayor es el dinero y los datos de clientes.

## Decisión
- Capas: `domain` (TS puro) → `repositories` (interfaces) → `adapters` (Supabase, Storage; F2 local/sync) → `features` → `ui`. **La UI nunca habla con Supabase.** Un linter de límites hace cumplir la regla.
- Reglas del negocio en **un solo lugar** (dominio), referenciadas por ID `BR-*`; la BD refuerza con checks/triggers las que protegen el dinero.
- Operaciones multi-fila **atómicas** vía funciones/RPC de Postgres.
- Pruebas: unitarias del dominio (Vitest, ≥ 95 %), integración de **RLS y funciones** contra Supabase local, E2E con Playwright (móvil y escritorio). CI en GitHub Actions; migraciones con Supabase CLI.

## Alternativas descartadas
- *Lógica en componentes React o en consultas sueltas*: duplicación y regresiones.
- *Sin pruebas de RLS*: la fuga entre usuarios sería invisible.

## Consecuencias
Cambiar de proveedor, añadir offline o campañas no toca las features. Mayor disciplina inicial.

## Referencias
03-arquitectura/ARCHITECTURE.md · 03-arquitectura/TESTING.md · 03-arquitectura/CONVENTIONS.md
