# ADR-0033: Design system con tokens (tamaño de letra ajustable por una variable)
Estado: Aceptado · Fecha: 2026-10-29

## Contexto
El dueño quiere un design system muy bien hecho y poder cambiar el tamaño de la letra "muy fácilmente". Viendo los diseños siente que en móvil la letra (texto principal de 17 px) es grande, pero no lo sabrá hasta verlo en un dispositivo real; quizá lo cambie o quizá no. Los tamaños de la escala (iOS 17/15/13, Material 16) son un punto de partida, no un dato definitivo.

## Decisión
- **Todo valor visual vive en tokens** (variables CSS en un único archivo, `src/ui/tokens/tokens.css`): tipografía, color, radios, espaciado, sombras y breakpoints. **Ningún componente usa valores literales** (`px`, `rem`, `#hex`) de tipografía o color; solo roles semánticos.
- **Tipografía por roles:** `--text-figure`, `--text-title`, `--text-body`, `--text-secondary`, `--text-caption` (+ `--leading-*`), definidos en `rem` y multiplicados por **una variable global `--font-scale`** (por defecto `1`). **Cambiar el tamaño de toda la app = cambiar `--font-scale`** (o un rol concreto). Los valores de móvil y escritorio son tokens distintos dentro de media queries; ver la escala inicial en `04-diseno/DESIGN-BRIEF.md` §5b.
- **El acento también es un token** (`--accent`, `--accent-contrast`): cambiar entre casi negro (`#1F1E1D`) y marino (`#092e53`) es cambiar una variable.
- **Tailwind** (si se usa) mapea sus utilidades a los tokens (`text-body` → `var(--text-body)`); **prohibidas** las clases con valores literales (`text-[17px]`, `text-lg` sin mapear, `bg-[#092e53]`).
- **Se respeta el tamaño de texto del sistema** (unidades `rem`).
- **Hacerlo cumplir:** una **prueba de arquitectura** (y regla de lint) falla si encuentra en `src/` tamaños de fuente o colores literales fuera de `tokens.css`.
- **Futuro (backlog):** preferencia de usuario "Tamaño del texto" en Ajustes (Pequeño / Normal / Grande) que solo cambia `--font-scale`; no se implementa en la v1, pero el diseño ya lo permite.
- Los valores iniciales son **provisionales hasta probarlos en un dispositivo real** (RV-05).

## Alternativas descartadas
- *Tamaños escritos en cada componente*: cambiar la letra implicaría tocar decenas de archivos y siempre quedaría alguno olvidado.
- *Un solo tamaño base sin roles*: no permite ajustar por separado, por ejemplo, la cifra de "Por entregar".
- *Preferencia de usuario desde ya*: es más alcance; el token global ya deja la puerta abierta.

## Consecuencias
- Claude Design debe entregar los tamaños y el acento **como variables**; el brief y el prompt lo piden.
- El primer trabajo de UI es crear `tokens.css` y el mapeo de Tailwind; después, los componentes.
- Se añade una prueba de arquitectura (`TESTING.md`).

## Referencias
BR-GEN-13 · 04-diseno/DESIGN-BRIEF.md §5b · 03-arquitectura/CONVENTIONS.md §4 · 03-arquitectura/ARCHITECTURE.md §4b · ADR-0029, ADR-0032 · OPEN-QUESTIONS RV-05
