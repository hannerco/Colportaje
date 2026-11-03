# Documentación — Colportor

Punto de entrada de la documentación. **Léelo completo antes de tocar el proyecto.**

> **Convención de rutas:** en todos los documentos, las rutas de archivos se escriben **relativas a `docs/`** (por ejemplo `01-negocio/BUSINESS-RULES.md`). Los archivos del repositorio fuera de `docs/` (`AGENTS.md`, `.env.example`…) se citan desde la raíz.

## Estructura de carpetas

```
docs/
├─ README.md                      ← este índice
├─ 00-contexto/                   QUÉ es y POR QUÉ (historia y vocabulario)
│  ├─ CONTEXT.md                  producto, usuarios, conceptos del negocio, restricciones
│  ├─ SPEC-ORIGINAL.md            texto original del dueño (sin editar) + tabla de reemplazos
│  ├─ DECISION-LOG.md             todas las preguntas y respuestas de la entrevista de diseño
│  ├─ GLOSSARY.md                 nombres: español ↔ código (fuente única de nombres)
│  └─ PROMPT-CONTEXTO-SESION-DISENO.md   prompt para abrir una conversación nueva de diseño/docs con todo el contexto y los pendientes
├─ 01-negocio/                    CÓMO se comporta (reglas y flujos)
│  ├─ BUSINESS-RULES.md           reglas numeradas BR-*  ← fuente normativa
│  ├─ FLOWS.md                    flujos principales F-*
│  ├─ FLOWS-ALTERNATIVOS.md       casos especiales y errores AF-* (devoluciones, abonos que no cuadran…)
│  └─ REQUIREMENTS.md             requisitos RQ-* con criterios de aceptación
├─ 02-datos/                      DATOS
│  ├─ DOMAIN-MODEL.md             entidades, derivaciones, máquinas de estado
│  └─ DATABASE.md                 esquema SQL borrador, RLS, funciones, storage
├─ 03-arquitectura/               CÓMO se construye
│  ├─ ARCHITECTURE.md             stack, capas, estructura de carpetas del código
│  ├─ CONVENTIONS.md              idioma, nombres, TypeScript, UI, git, cómo trabaja un agente
│  ├─ TESTING.md                  estrategia y casos de prueba
│  ├─ SECURITY.md                 amenazas, secretos, políticas
│  └─ adr/                        decisiones de arquitectura (ADR-0001 … ADR-0037) + README con índice
├─ 04-diseno/
│  ├─ DESIGN-BRIEF.md             brief v2 para Claude Design (estilo Notion, lista negra anti-IA, densidad, wireframes)
│  ├─ PROMPT-CLAUDE-DESIGN.md     prompt v3 listo para pegar (empieza por Clientes)
│  └─ referencias/                imágenes de referencia del dueño (inspiración, no copiar)
├─ 05-operacion/                  PUESTA EN MARCHA
│  ├─ DEPLOYMENT.md               plataformas, entornos, migraciones, backups, confiabilidad
│  ├─ GUIA-DESPLIEGUE-PASO-A-PASO.md   guía explicada para el dueño (Supabase, Vercel, GitHub)
│  └─ AVISO-DATOS-PLANTILLA.md    plantilla del aviso de tratamiento de datos (Ley 1581)
└─ 06-planificacion/              CUÁNDO y QUÉ queda
   ├─ ROADMAP.md                  plan de 14 días, fases 1–3, backlog
   └─ OPEN-QUESTIONS.md           sin preguntas abiertas; seguimientos SG-*, revisiones RV-*, decisiones de diseño
```

## Orden de lectura recomendado
1. [`00-contexto/CONTEXT.md`](00-contexto/CONTEXT.md) — qué es, para quién, conceptos del negocio y restricciones.
2. [`00-contexto/SPEC-ORIGINAL.md`](00-contexto/SPEC-ORIGINAL.md) — el texto original del dueño (intención primaria) + tabla de reemplazos.
3. [`00-contexto/DECISION-LOG.md`](00-contexto/DECISION-LOG.md) — todas las preguntas y respuestas de la entrevista de diseño (el *por qué*).
4. [`01-negocio/BUSINESS-RULES.md`](01-negocio/BUSINESS-RULES.md) — reglas numeradas (`BR-*`): **fuente normativa** del comportamiento.
5. [`00-contexto/GLOSSARY.md`](00-contexto/GLOSSARY.md) — nombres (ES ↔ código).
6. [`02-datos/DOMAIN-MODEL.md`](02-datos/DOMAIN-MODEL.md) + [`02-datos/DATABASE.md`](02-datos/DATABASE.md) — entidades, derivaciones, máquinas de estado, SQL borrador y RLS.
7. [`01-negocio/FLOWS.md`](01-negocio/FLOWS.md) — flujos principales paso a paso · [`01-negocio/FLOWS-ALTERNATIVOS.md`](01-negocio/FLOWS-ALTERNATIVOS.md) — **todos los casos especiales** (devoluciones, abonos que no cuadran, errores, conexión…), con IDs `AF-*`.
8. [`01-negocio/REQUIREMENTS.md`](01-negocio/REQUIREMENTS.md) — requisitos `RQ-*` con criterios de aceptación.
9. [`03-arquitectura/ARCHITECTURE.md`](03-arquitectura/ARCHITECTURE.md), [`03-arquitectura/CONVENTIONS.md`](03-arquitectura/CONVENTIONS.md), [`03-arquitectura/TESTING.md`](03-arquitectura/TESTING.md), [`03-arquitectura/SECURITY.md`](03-arquitectura/SECURITY.md).
10. [`03-arquitectura/adr/`](03-arquitectura/adr/README.md) — decisiones de arquitectura.
11. [`04-diseno/DESIGN-BRIEF.md`](04-diseno/DESIGN-BRIEF.md) — brief v2 para Claude Design · [`04-diseno/PROMPT-CLAUDE-DESIGN.md`](04-diseno/PROMPT-CLAUDE-DESIGN.md) — prompt listo para pegar.
12. [`05-operacion/DEPLOYMENT.md`](05-operacion/DEPLOYMENT.md) y [`05-operacion/GUIA-DESPLIEGUE-PASO-A-PASO.md`](05-operacion/GUIA-DESPLIEGUE-PASO-A-PASO.md) (para el dueño, explicada) · [`05-operacion/AVISO-DATOS-PLANTILLA.md`](05-operacion/AVISO-DATOS-PLANTILLA.md).
13. [`06-planificacion/ROADMAP.md`](06-planificacion/ROADMAP.md) — plan de 14 días, fases y backlog · [`06-planificacion/OPEN-QUESTIONS.md`](06-planificacion/OPEN-QUESTIONS.md) — **no hay preguntas abiertas**; seguimientos (SG), cosas por revisar (RV) y decisiones de diseño (DT).

## Si buscas algo concreto
| Quiero… | Ve a |
|---|---|
| Saber qué hace la app en una situación | `01-negocio/BUSINESS-RULES.md`, luego `01-negocio/FLOWS-ALTERNATIVOS.md` |
| Saber por qué se decidió algo | `00-contexto/DECISION-LOG.md` y el ADR correspondiente |
| Saber cómo se llama algo (UI y código) | `00-contexto/GLOSSARY.md` |
| Crear tablas o migraciones | `02-datos/DATABASE.md` |
| Diseñar pantallas | `04-diseno/DESIGN-BRIEF.md` y `04-diseno/PROMPT-CLAUDE-DESIGN.md` |
| Escribir código o pruebas | `03-arquitectura/ARCHITECTURE.md`, `03-arquitectura/CONVENTIONS.md`, `03-arquitectura/TESTING.md` |
| Crear cuentas y desplegar | `05-operacion/GUIA-DESPLIEGUE-PASO-A-PASO.md` |
| Ver qué toca hacer y cuándo | `06-planificacion/ROADMAP.md` |

## Jerarquía de la verdad (si dos documentos se contradicen)
1. Una decisión posterior en `00-contexto/DECISION-LOG.md` / un ADR **aceptado**.
2. `01-negocio/BUSINESS-RULES.md` (comportamiento) y `02-datos/DOMAIN-MODEL.md` (datos).
3. `01-negocio/FLOWS.md`, `01-negocio/REQUIREMENTS.md`, `04-diseno/DESIGN-BRIEF.md`.
4. `00-contexto/SPEC-ORIGINAL.md` (intención histórica; muchas partes fueron reemplazadas).
5. `06-planificacion/OPEN-QUESTIONS.md` registra seguimientos, cosas por revisar y decisiones de diseño; si aparece una duda nueva, se añade como `OQ-*` con un supuesto por defecto y se pregunta al dueño.

Si encuentras una contradicción, **arréglala** en el mismo cambio y anótala en `00-contexto/DECISION-LOG.md`.

## Estado del proyecto
- Documentación: **completa y sin preguntas abiertas** (fase 0, revisada el 2026-10-28). **Código: solo la capa de dominio** (`src/domain`, TypeScript puro con pruebas Vitest; 2026-10-29). Falta todo lo demás (repositories, adapters, features, UI).
- **Plazo: 14 días** para la fase 1 completa (`06-planificacion/ROADMAP.md`). Siguiente paso: diseño en **Claude Design** (2–3 variantes, días 1–3) → elección del dueño → scaffolding por capas con pruebas del dominio primero.
- Pendientes con el dueño: crear el repo `colportor` (SG-03), cuentas nuevas de Supabase y Vercel (SG-02, guía paso a paso; **pospuesto: primero el diseño**), diseño (SG-04).
- Dueño del producto: colportor-desarrollador, primer usuario y admin. Idioma de trabajo: español.

## Mantenimiento de la documentación
- Un cambio de regla de negocio actualiza: `01-negocio/BUSINESS-RULES.md` → ADR → `00-contexto/DECISION-LOG.md` → pruebas (`03-arquitectura/TESTING.md`/código).
- Un concepto nuevo se añade primero a `00-contexto/GLOSSARY.md`.
- Mantén la numeración `BR-*`, `RQ-*`, `OQ-*` y `ADR-*` estable; no renumeres.
- Los documentos nuevos van en la carpeta temática que les corresponda y se añaden a este índice.
