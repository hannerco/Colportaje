# Documentación — App de Colportaje

Punto de entrada de la documentación. **Léelo completo antes de tocar el proyecto.**

## Orden de lectura recomendado
1. [`CONTEXT.md`](CONTEXT.md) — qué es, para quién, conceptos del negocio y restricciones.
2. [`SPEC-ORIGINAL.md`](SPEC-ORIGINAL.md) — el texto original del dueño (intención primaria) + tabla de reemplazos.
3. [`DECISION-LOG.md`](DECISION-LOG.md) — todas las preguntas y respuestas de la entrevista de diseño (el *por qué*).
4. [`BUSINESS-RULES.md`](BUSINESS-RULES.md) — reglas numeradas (`BR-*`): **fuente normativa** del comportamiento.
5. [`GLOSSARY.md`](GLOSSARY.md) — nombres (ES ↔ código).
6. [`DOMAIN-MODEL.md`](DOMAIN-MODEL.md) + [`DATABASE.md`](DATABASE.md) — entidades, derivaciones, máquinas de estado, SQL borrador y RLS.
7. [`FLOWS.md`](FLOWS.md) — flujos paso a paso y casos borde.
8. [`REQUIREMENTS.md`](REQUIREMENTS.md) — requisitos `RQ-*` con criterios de aceptación.
9. [`ARCHITECTURE.md`](ARCHITECTURE.md), [`CONVENTIONS.md`](CONVENTIONS.md), [`TESTING.md`](TESTING.md), [`SECURITY.md`](SECURITY.md), [`DEPLOYMENT.md`](DEPLOYMENT.md).
10. [`adr/`](adr/README.md) — decisiones de arquitectura.
11. [`DESIGN-BRIEF.md`](DESIGN-BRIEF.md) — brief para Claude Design.
12. [`ROADMAP.md`](ROADMAP.md) — fases y backlog · [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md) — supuestos y dudas.

## Jerarquía de la verdad (si dos documentos se contradicen)
1. Una decisión posterior en `DECISION-LOG.md` / un ADR **aceptado**.
2. `BUSINESS-RULES.md` (comportamiento) y `DOMAIN-MODEL.md` (datos).
3. `FLOWS.md`, `REQUIREMENTS.md`, `DESIGN-BRIEF.md`.
4. `SPEC-ORIGINAL.md` (intención histórica; muchas partes fueron reemplazadas).
5. `OPEN-QUESTIONS.md` solo rellena huecos: usa el supuesto indicado hasta que el dueño confirme.

Si encuentras una contradicción, **arréglala** en el mismo cambio y anótala en `DECISION-LOG.md`.

## Estado del proyecto
- Documentación: completa (fase 0). **Aún no hay código.**
- Siguiente paso: diseño en **Claude Design** (2–3 variantes) → elección del dueño → scaffolding por capas con pruebas del dominio primero. Ver `ROADMAP.md`.
- Dueño del producto: colportor-desarrollador, primer usuario y admin. Idioma de trabajo: español.

## Mantenimiento de la documentación
- Un cambio de regla de negocio actualiza: `BUSINESS-RULES.md` → ADR → `DECISION-LOG.md` → pruebas (`TESTING.md`/código).
- Un concepto nuevo se añade primero a `GLOSSARY.md`.
- Mantén la numeración `BR-*`, `RQ-*`, `OQ-*` y `ADR-*` estable; no renumeres.
