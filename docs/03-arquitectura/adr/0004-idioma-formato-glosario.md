# ADR-0004: Idioma, formato y glosario
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Los nombres de tablas y propiedades estaban "por discutir". La UI es para colportores hispanohablantes en Colombia. Los conceptos complejos necesitan explicación en pantalla.

## Decisión
- **UI y documentación en español**; **código en inglés** (tablas, columnas, variables, tipos, rutas internas).
- `00-contexto/GLOSSARY.md` es la **única fuente de nombres**; los marcados 🔶 siguen abiertos.
- **Tooltips** en español para conceptos complejos (lista en DESIGN-BRIEF §7).
- Dinero en **COP enteros** (`$1.250.000`), zona **America/Bogota**, **solo español**.
- Todos los textos de UI desde `src/copy/es.ts`.

## Alternativas descartadas
- *Código en español*: mezcla con APIs en inglés; dificulta colaboración futura.
- *i18n multilingüe desde el inicio*: sin necesidad hoy.
- *Decimales en dinero*: el COP no los usa; los enteros evitan errores de redondeo.

## Consecuencias
Un único lugar para renombrar; cualquier término nuevo se añade primero al glosario.

## Referencias
03-arquitectura/CONVENTIONS.md §1–2 · 00-contexto/GLOSSARY.md · DECISION-LOG Q4, Q50
