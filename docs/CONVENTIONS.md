# Convenciones del proyecto

Obligatorias para todo agente o persona que escriba código o documentación aquí.

## 1. Idioma
| Qué | Idioma |
|---|---|
| Texto de interfaz, tooltips, mensajes de error al usuario | **Español** (neutro/colombiano, tuteo) |
| Documentación (`docs/`, ADRs, README) | **Español** |
| Código: nombres de variables, funciones, tipos, tablas, columnas, enums, rutas internas | **Inglés** |
| Mensajes de commit | **Español**, imperativo (ver §6) |
| Comentarios en código | Español o inglés; **solo** el *por qué*, no el qué. Referencian reglas: `// BR-DEP-06` |

`docs/GLOSSARY.md` es la **única** fuente de nombres. Si necesitas un concepto nuevo, **primero** añádelo al glosario.

## 2. Nombres
- Archivos y carpetas: `kebab-case` (`leader-deposit.ts`); componentes React: `PascalCase.tsx`.
- Tipos/interfaces: `PascalCase`; sin prefijo `I`. Funciones y variables: `camelCase`. Constantes: `SCREAMING_SNAKE_CASE`.
- Base de datos: `snake_case`, tablas en **singular**, FK `<entidad>_id`, enums en minúscula (`in_stock`).
- Rutas URL (Next): en español, `kebab-case` (`/clientes`, `/vender`, `/hacer-inventario`); los identificadores internos en inglés.
- Booleanos: `is_`/`has_`/`can_` (`is_active`, `has_receipt`).
- Dinero: sufijo o tipo explícito `COP` y enteros (`agreedPrice: COP`).
- Fechas: `*_at` = instante (`timestamptz`), `*_date` = día calendario (`date`).

## 3. TypeScript
- `strict: true`, sin `any` (usar `unknown` + Zod). Sin `// @ts-ignore` (usar `@ts-expect-error` con motivo).
- Tipos de dominio **no** dependen de Supabase. Los tipos generados de Supabase viven solo en `adapters/supabase`.
- Preferir funciones puras y datos inmutables en `domain/`. Sin clases salvo que aporten claridad.
- `Result<T, E>` para fallos de negocio esperados.
- Exportar solo lo necesario; un índice `index.ts` por feature con su API pública.

## 4. UI
- Mobile-first: se diseña y prueba primero a 360–390 px; escritorio ≥ 1024 px.
- Objetivos táctiles ≥ 44×44 px; acciones principales en la zona del pulgar.
- Todo texto desde `src/copy/es.ts`. Todo dinero con `formatCOP`; toda fecha con helpers de `domain/time` (zona Bogota).
- Tooltips para conceptos de `DESIGN-BRIEF.md` §7; accesibles por teclado y táctiles.
- Estados obligatorios en cada vista: carga, vacío, error, éxito.
- No depender solo del color para transmitir estado.

## 5. Calidad
- Antes de fusionar: `pnpm lint && pnpm typecheck && pnpm test` en verde.
- Cada regla `BR-*` nueva o modificada: actualizar `BUSINESS-RULES.md`, el ADR correspondiente, `DECISION-LOG.md` y añadir pruebas.
- Sin código muerto ni "TODO" sin issue asociado. Sin `console.log` en producción.
- Dependencias nuevas: justificar en el PR; preferir las ya elegidas en `ARCHITECTURE.md`.
- Nada de "parche sobre parche": si una regla no encaja en el diseño, se corrige el diseño (y se escribe un ADR) en vez de añadir una excepción.

## 6. Git
- Rama principal: `main` (protegida: PR + CI verde). Ramas: `feat/<tema>`, `fix/<tema>`, `docs/<tema>`, `chore/<tema>`.
- Commits pequeños, en español, imperativo: `feat(abonos): registrar prórroga con historial`. Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`.
- Un cambio de comportamiento de negocio incluye docs + pruebas en el mismo PR.
- **Nunca** commitear secretos (`.env*` salvo `.env.example`), claves, volcados de BD ni fotos reales de clientes.
- Migraciones SQL: archivos inmutables una vez fusionados; cambios nuevos = migración nueva.

## 7. Documentación
- Toda decisión arquitectónica nueva → ADR en `docs/adr/` (plantilla en `adr/README.md`).
- Los documentos de `docs/` deben mantenerse **consistentes entre sí**; si cambias uno, revisa los enlazados (`README.md` tiene el mapa).
- Los nombres marcados 🔶 en el glosario siguen abiertos a discusión con el dueño.

## 8. Cómo debe trabajar un agente en este repo
1. Lee `AGENTS.md` y `docs/README.md` antes de actuar.
2. **No inventes reglas de negocio.** Si algo no está en `BUSINESS-RULES.md` o `DECISION-LOG.md`, mira `OPEN-QUESTIONS.md`; si sigue sin estar, **pregunta al dueño**.
3. No implementes lo que está en backlog, fase 2 o fase 3 salvo que se pida.
4. Mantén las capas (`ARCHITECTURE.md` §2). La UI no habla con Supabase.
5. Escribe pruebas junto con el código (`TESTING.md`).
6. Acciones externas (crear recursos de pago, borrar, publicar) → confirma con el dueño.
