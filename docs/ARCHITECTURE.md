# Arquitectura

Principios: **escalable, probada, sin "parche sobre parche", decisiones lógicas** (requisito del dueño). Las decisiones formales están en `adr/`. Este documento describe cómo se materializan.

## 1. Stack (versiones a fijar en el scaffolding)
| Capa | Elección | Nota |
|---|---|---|
| Lenguaje | **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`) | |
| Framework | **Next.js (App Router)** como PWA | Mayormente componentes cliente; evitar lógica de negocio en servidor salvo admin/invitaciones |
| Backend | **Supabase** (Postgres + Auth + Storage), región **São Paulo** | Sin API propia |
| Hosting | **Vercel** (región `gru1`) | Sin funciones exclusivas de Vercel (migrable) |
| Paquetes | **pnpm** | |
| Node | **22 LTS** (`.nvmrc`, `engines`) | |
| Estilos / UI | Tailwind CSS + componentes accesibles (shadcn/ui sobre Radix) | Propuesto; cambiar solo con ADR |
| Datos en cliente | **TanStack Query** (caché, optimista) | |
| Formularios | React Hook Form + **Zod** | Zod también valida en el límite de los repositorios |
| Fechas | `date-fns` + `date-fns-tz` (America/Bogota) | Todo "hoy" pasa por `domain/time` |
| Búsqueda | **Fuse.js** o MiniSearch (local, difusa, sin acentos) | Elegir en el scaffolding con una prueba de aceptación (RQ-CUS-04) |
| PWA | Serwist (service worker + manifest) | F1: instalable + caché del shell; F2: offline de escritura |
| Pruebas | Vitest (unitarias/integración), Playwright (E2E), Testing Library | Ver `TESTING.md` |
| Calidad | ESLint (+ reglas de límites entre capas), Prettier, `tsc --noEmit` | |
| Offline (F2) | Dexie (IndexedDB) | Detrás de `repositories` |

## 2. Capas y regla de dependencias

```
ui  ──►  features  ──►  repositories (interfaces)  ──►  domain
                              ▲
                  adapters (supabase, storage, local) implementan las interfaces
```

| Capa | Contiene | Puede importar | **No** puede importar |
|---|---|---|---|
| `domain/` | Tipos, reglas, derivaciones, máquinas de estado, `time`, `money`. **TypeScript puro**. | Nada externo (solo utilidades puras) | React, Next, Supabase, `fetch`, DOM |
| `repositories/` (interfaces) | Contratos: `CustomerRepository`, `CopyRepository`, `PaymentRepository`, `LeaderDepositRepository`, `MinibookSaleRepository`, `TitleRepository`, `VisitRepository`, `TrainingRepository`, `SettingsRepository`, `StorageRepository`… | `domain` | adapters, UI |
| `adapters/` | Implementaciones: `supabase/*`, `storage/*`, (F2) `local/*`, `sync/*`; mapeo fila↔dominio con Zod | `repositories`, `domain` | UI, features |
| `features/<área>/` | Casos de uso + hooks + componentes de la funcionalidad: `customers`, `sales`, `inventory`, `payments`, `deposits`, `minibooks`, `calendar`, `totals`, `admin`, `auth` | `domain`, interfaces de `repositories`, `ui` | adapters directamente (se inyectan) |
| `ui/` | Componentes compartidos sin lógica de negocio (botones, hojas, tablas, tooltips, iconos, formato) | `domain/money`, `domain/time` solo para formato | features, adapters |

**Regla de oro:** la UI nunca habla con Supabase. Todo acceso a datos pasa por una interfaz de `repositories`, y se inyecta la implementación (contexto/provider). Un linter (`eslint-plugin-boundaries` o `import/no-restricted-paths`) hace cumplir esto en CI.

## 3. Estructura de carpetas propuesta

```
/
├─ AGENTS.md  CLAUDE.md
├─ docs/                       (esta documentación)
├─ supabase/
│  ├─ migrations/              (SQL versionado; Supabase CLI)
│  ├─ seed.sql  functions/     (si se usan)
│  └─ config.toml
├─ scripts/                    (carga de catálogo, backup, utilidades)
├─ src/
│  ├─ app/                     (rutas Next: (auth)/login, (app)/hoy, clientes, vender, inventario, dinero, minibooks, calendario, hacer-inventario, ajustes, admin)
│  ├─ domain/                  (entidades, reglas, derivaciones, time, money, glossary-types)
│  ├─ repositories/            (interfaces + errores comunes)
│  ├─ adapters/                (supabase/, storage/, local/ (F2), sync/ (F2))
│  ├─ features/                (customers, sales, inventory, payments, deposits, minibooks, calendar, totals, admin, auth)
│  ├─ ui/                      (componentes compartidos)
│  ├─ lib/                     (config, env validado con Zod, utilidades)
│  └─ copy/es.ts               (todos los textos de UI y tooltips en español)
├─ tests/
│  ├─ e2e/                     (Playwright)
│  └─ rls/                     (integración de seguridad contra Supabase local)
├─ .github/workflows/          (ci.yml, backup.yml)
├─ vercel.json                 (regions: ["gru1"])
└─ package.json  tsconfig.json  .env.example
```

## 4. Convenciones de diseño del código
- **Dominio inmutable y puro.** Funciones `(estado) → valor`. Ej.: `balanceOf(customer, copies, payments, creditEntries)`, `ageStage(copy, thresholds, today)`, `depositSummary(deposit, payments, allocations)`.
- **Errores como valores en el dominio**: `Result<T, DomainError>` para reglas que pueden fallar (p. ej. "no hay stock suficiente", "falta recibo"); excepciones solo para fallos inesperados.
- **Una fuente por regla.** Toda regla de `BUSINESS-RULES.md` existe en **un** módulo del dominio y se referencia con su ID (`// BR-DEP-06`). La base de datos refuerza con checks/triggers las que protegen el dinero, pero el dominio es la fuente.
- **Mapeo explícito** fila ↔ dominio (Zod) en los adapters; nunca se filtran tipos de `supabase-js` fuera de `adapters/`.
- **IDs generados en cliente** (`crypto.randomUUID()`); operaciones **idempotentes** por ID (clave para F2).
- **Operaciones multi-fila atómicas** (vender, confirmar Abibono, registrar entrada de minibooks) mediante funciones/RPC de Postgres, no secuencias de llamadas desde la UI.
- **Textos de UI** solo desde `copy/es.ts` (facilita tooltips y futura revisión); **sin** cadenas en español sueltas en componentes.
- **Dinero:** `type COP = number` (entero) con helpers `formatCOP`, `parseCOP`; nunca decimales.
- **Registro de totalizadores:** `features/totals/registry.ts` exporta un array de piezas `{ id, label, tooltip, compute(ctx), categoryAware }`; la pantalla itera. Quitar uno = borrar una entrada.
- **Registro de reglas de antigüedad:** `domain/age.ts` recibe `thresholds` desde `app_settings` (nunca constantes enterradas).

## 5. Datos y rendimiento percibido
- Región Supabase **sa-east-1** y Vercel **gru1**.
- TanStack Query con caché; **actualizaciones optimistas** al agregar ejemplares y registrar abonos (con rollback).
- Listas con **miniaturas**; imágenes completas solo al abrir; mapa embebido solo al tocar.
- Los clientes (cientos) se cargan completos para búsqueda local; paginar solo ejemplares/abonos si crecen.
- Medir con dispositivos reales antes de lanzar (objetivo: primera interacción < 2 s en 4G; acciones de un toque < 300 ms percibidos).

## 6. PWA
- Manifest (nombre, iconos, `display: standalone`, tema), service worker con caché del shell. F1 requiere conexión para datos.
- iOS: instalable desde Safari ≥ 16.4; sin background sync (F2 sincroniza al abrir); push solo con la PWA instalada.

## 7. Fase 2 — Offline (diseño ya previsto)
- `adapters/local` (Dexie) implementa las **mismas interfaces**; un `SyncEngine` mantiene una **cola de salida** (outbox) de mutaciones idempotentes por UUID, reintentos con retroceso, y **cola de fotos**.
- Conflictos: **gana la última escritura por registro** (`updated_at`); hay un solo escritor por cuenta.
- **Pendiente de diseñar en F2:** `copy.number` lo asigna el servidor → offline requiere número provisional y reconciliación (ver `OPEN-QUESTIONS.md`).
- Indicadores de "pendiente de sincronizar" en la UI. Sesión caducada sin conexión: permitir uso local y reautenticar al volver.

## 8. Fase 3 — Líder
Nuevo rol `leader`, tablas de equipo y transferencias (`transfer`, estado `pending_receipt` en `copy`). El modelo actual no lo bloquea (BR-COPY-15).

## 9. Seguridad
Ver `SECURITY.md`. Resumen: RLS en todas las tablas con datos de usuario, `service_role` solo en servidor, validación de entrada con Zod, URLs firmadas para fotos, sin secretos en el cliente.

## 10. Decisiones que requieren ADR nuevo si se cambian
Framework, backend, hosting, librería de búsqueda, capa de datos local, estrategia de sincronización, esquema de numeración de ejemplares, política de fotos.
