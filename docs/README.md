# Documentación — Colportor

Punto de entrada de la documentación. **Léelo completo antes de tocar el proyecto.**

## Orden de lectura recomendado
1. [`CONTEXT.md`](CONTEXT.md) — qué es, para quién, conceptos del negocio y restricciones.
2. [`SPEC-ORIGINAL.md`](SPEC-ORIGINAL.md) — el texto original del dueño (intención primaria) + tabla de reemplazos.
3. [`DECISION-LOG.md`](DECISION-LOG.md) — todas las preguntas y respuestas de la entrevista de diseño (el *por qué*).
4. [`BUSINESS-RULES.md`](BUSINESS-RULES.md) — reglas numeradas (`BR-*`): **fuente normativa** del comportamiento.
5. [`GLOSSARY.md`](GLOSSARY.md) — nombres (ES ↔ código).
6. [`DOMAIN-MODEL.md`](DOMAIN-MODEL.md) + [`DATABASE.md`](DATABASE.md) — entidades, derivaciones, máquinas de estado, SQL borrador y RLS.
7. [`FLOWS.md`](FLOWS.md) — flujos principales paso a paso · [`FLOWS-ALTERNATIVOS.md`](FLOWS-ALTERNATIVOS.md) — **todos los casos especiales** (devoluciones, abonos que no cuadran, errores, conexión…), con IDs `AF-*`.
8. [`REQUIREMENTS.md`](REQUIREMENTS.md) — requisitos `RQ-*` con criterios de aceptación.
9. [`ARCHITECTURE.md`](ARCHITECTURE.md), [`CONVENTIONS.md`](CONVENTIONS.md), [`TESTING.md`](TESTING.md), [`SECURITY.md`](SECURITY.md), [`DEPLOYMENT.md`](DEPLOYMENT.md) y [`GUIA-DESPLIEGUE-PASO-A-PASO.md`](GUIA-DESPLIEGUE-PASO-A-PASO.md) (para el dueño, explicada) · [`AVISO-DATOS-PLANTILLA.md`](AVISO-DATOS-PLANTILLA.md).
10. [`adr/`](adr/README.md) — decisiones de arquitectura.
11. [`DESIGN-BRIEF.md`](DESIGN-BRIEF.md) — brief para Claude Design.
12. [`ROADMAP.md`](ROADMAP.md) — plan de 14 días, fases y backlog · [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md) — **no hay preguntas abiertas**; seguimientos (SG), cosas por revisar (RV) y decisiones de diseño (DT).

## Jerarquía de la verdad (si dos documentos se contradicen)
1. Una decisión posterior en `DECISION-LOG.md` / un ADR **aceptado**.
2. `BUSINESS-RULES.md` (comportamiento) y `DOMAIN-MODEL.md` (datos).
3. `FLOWS.md`, `REQUIREMENTS.md`, `DESIGN-BRIEF.md`.
4. `SPEC-ORIGINAL.md` (intención histórica; muchas partes fueron reemplazadas).
5. `OPEN-QUESTIONS.md` registra seguimientos, cosas por revisar y decisiones de diseño; si aparece una duda nueva, se añade como `OQ-*` con un supuesto por defecto y se pregunta al dueño.

Si encuentras una contradicción, **arréglala** en el mismo cambio y anótala en `DECISION-LOG.md`.

## Estado del proyecto
- Documentación: **completa y sin preguntas abiertas** (fase 0, revisada el 2026-10-28). **Aún no hay código.**
- **Plazo: 14 días** para la fase 1 completa (`ROADMAP.md`). Siguiente paso: diseño en **Claude Design** (2–3 variantes, días 1–3) → elección del dueño → scaffolding por capas con pruebas del dominio primero.
- Pendientes con el dueño: crear el repo `colportor` (SG-03), cuentas nuevas de Supabase y Vercel (SG-02, guía paso a paso), diseño (SG-04).
- Dueño del producto: colportor-desarrollador, primer usuario y admin. Idioma de trabajo: español.

## Mantenimiento de la documentación
- Un cambio de regla de negocio actualiza: `BUSINESS-RULES.md` → ADR → `DECISION-LOG.md` → pruebas (`TESTING.md`/código).
- Un concepto nuevo se añade primero a `GLOSSARY.md`.
- Mantén la numeración `BR-*`, `RQ-*`, `OQ-*` y `ADR-*` estable; no renumeres.
