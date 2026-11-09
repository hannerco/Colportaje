# HU-BASE-01 · Proyecto por capas, calidad y utilidades del dominio

> **Épica:** Cimientos · **Depende de:** — · **Reglas:** BR-GEN-03/04/05/07/15, ADR-0002, ADR-0019, ADR-0041 · **Diseño:** sin pantalla

## Historia
**Como** equipo que construye Colportor con IA **quiero** un proyecto con capas que se hagan cumplir solas, pruebas listas y utilidades de dominio para tiempo, dinero y configuración **para** que cada HU siguiente se construya sobre reglas que no se puedan romper por descuido.

## Contexto
- El repositorio hoy solo tiene documentación (`AGENTS.md`). El código anterior se descartó a propósito (ronda 21b); no se recupera.
- **Antes de subir código**, el dueño debe pasar el repositorio `hannerco/Colportaje` a **privado** (SG-03). Es una acción externa del dueño; la IA no la hace.
- Stack fijado en ADR-0002 y `03-arquitectura/ARCHITECTURE.md` §1. Las cuentas de Supabase y Vercel **no** son necesarias para esta HU (todo corre en local).

## Alcance
- **Incluye:** proyecto Next.js (App Router) con TypeScript estricto y pnpm; estructura de carpetas de ARCHITECTURE §3; reglas de límites entre capas; Vitest; CI; validación de variables de entorno; utilidades de dominio (`Result`, `AppError`, tiempo, dinero, configuración); inyección de repositorios.
- **No incluye:** pantallas ni componentes (solo un `layout` y una página vacía mínimos para que compile), tokens de diseño, Supabase (HU-BASE-02), PWA y caché (HU-BASE-06), despliegue en Vercel.

## Contrato para el resto del código
- `src/domain/shared/result.ts`: `Result<T, E> = { ok: true; value: T } | { ok: false; error: E }` y ayudantes `ok()`, `err()`.
- `src/domain/shared/errors.ts`: `AppError = { code: string; retryable: boolean; details?: Record<string, unknown> }` y los códigos comunes de `00-REGLAS-COMUNES.md` §3.
- `src/domain/money.ts`: tipo `COP` (entero), `isValidCOP(n)` (entero ≥ 0), `formatCOP(n)` → `"$1.250.000"` (negativos `"−$5.000"`), `parseCOP(texto)` → entero o error (acepta `"1.250.000"`, `"$1.250.000"`, `"1250000"`).
- `src/domain/time.ts`: `Clock` inyectable; `todayBogota(clock)` → `LocalDate` (`AAAA-MM-DD`); `formatDate(d)` → `dd/mm/aaaa`; `formatTime(instant, '12h'|'24h')` (`9:40 p. m.` / `21:40`); `addDays`, `addMonthsClamped` (31/01 + 1 mes = 28/02), `lastDayOfMonth`, `daysBetween`; `startOfWeek` con **domingo** como primer día.
- `src/domain/config/business-config.ts`: objeto tipado y congelado con **todas** las claves de `00-REGLAS-COMUNES.md` §8, cada una con el ID de su regla en un comentario.
- `src/domain/text.ts`: `normalizeForSearch(texto)` → minúsculas, sin tildes, espacios colapsados; `compareEs(a, b)` para ordenar en español.
- `src/lib/ids.ts`: `newId()` (UUID v4 con `crypto.randomUUID()`).
- `src/lib/env.ts`: lee y valida con Zod `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`; falla al arrancar si faltan. `.env.example` sin valores.
- `src/features/shared/repositories-provider`: proveedor que inyecta las implementaciones de los repositorios (para poder cambiarlas en pruebas o en la fase 2).

## Reglas (el sistema DEBE…)
- **R1.** El dominio (`src/domain/`) DEBE ser TypeScript puro: sin React, Next, Supabase, `fetch` ni DOM. Una prueba de arquitectura lo verifica.
- **R2.** CUANDO un archivo de una capa importa una capa prohibida (tabla de ARCHITECTURE §2), el lint DEBE fallar.
- **R3.** "Hoy" DEBE calcularse en America/Bogota con un reloj inyectado, nunca con la zona del dispositivo ni del servidor (BR-GEN-05).
- **R4.** Ningún valor de negocio cambiable DEBE aparecer fuera de `business-config.ts` (BR-GEN-15).
- **R5.** TypeScript DEBE estar en modo `strict` con `noUncheckedIndexedAccess`; `any` y `@ts-ignore` prohibidos por lint.

## Criterios de aceptación
- **CA-1.** **Dado** el instante `2026-11-08T04:30:00Z` (23:30 del 07/11 en Bogotá), **cuando** se pide `todayBogota`, **entonces** devuelve `2026-11-07`.
- **CA-2.** **Dado** `2027-01-31`, **cuando** se suma 1 mes con `addMonthsClamped`, **entonces** da `2027-02-28`.
- **CA-3.** **Dado** `1250000`, **cuando** se formatea, **entonces** da `"$1.250.000"`; **dado** `"$1.250.000"`, **cuando** se interpreta, **entonces** da `1250000`; **dado** `"12,5"`, **entonces** da error de validación.
- **CA-4.** **Dado** un archivo en `src/domain/` que importa `@supabase/supabase-js`, **cuando** se corre `pnpm lint`, **entonces** falla con la regla de límites.
- **CA-5.** **Dado** `"María José  Gómez"`, **cuando** se normaliza, **entonces** da `"maria jose gomez"`.
- **CA-6.** **Dado** el repositorio recién clonado, **cuando** se corre `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build`, **entonces** todo pasa.
- **CA-7.** **Dado** un pull request, **cuando** corre la CI, **entonces** ejecuta `lint → typecheck → test → build` y bloquea si algo falla (el paso de RLS se agrega en HU-BASE-02).

## Casos borde y errores
- La semana empieza el domingo: `startOfWeek(miércoles 2026-11-04)` = `2026-11-01`.
- `formatTime` respeta 12 h por defecto (BR-GEN-07).

## Datos
Ninguno (sin base de datos todavía).

## Cómo se verifica
- **Dominio:** pruebas de `time`, `money`, `text`, `result` y del objeto de configuración (que exista cada clave de §8).
- **Arquitectura:** prueba que recorre `src/domain/` y falla si encuentra imports externos.

## Terminado cuando
Se cumple §10 de las reglas comunes y la CI corre en GitHub Actions con los pasos de CA-7.
