# HU-UI-02 · Tokens y fundamentos

> **Iteración 1** · **Nivel:** fundamentos · **Código:** `src/ui/tokens/tokens.css`, `src/ui/tokens/breakpoints.ts` · **Storybook:** `Fundamentos/Color`, `Fundamentos/Tipografía`, `Fundamentos/Espacio y forma`, `Fundamentos/Elevación` · **Depende de:** HU-UI-01 · **Diseño:** ficha `Lib-Fundamentos` y funciones `tok()` / `size()` de cualquier componente fuente (son idénticas en todos) · **Reglas:** ADR-0034, ADR-0050, BR-GEN-13, `04-diseno/DESIGN-BRIEF.md` §5b

## Historia
**Como** dueño **quiero** que todos los colores, tamaños de letra, espacios, radios y sombras salgan de un solo archivo **para** cambiar el aspecto de toda la web tocando un valor, y poder subir o bajar la letra con una sola variable (RV-05).

## Contexto
En el diseño, cada componente copia `tok()` (colores claro/oscuro) y `size()` (tamaños por plataforma). En código existen **una sola vez**, como variables CSS que cambian según `data-theme` y `data-platform` (ADR-0050).

## Alcance
- **Incluye:**
  1. `tokens.css` con todos los tokens de las tablas de abajo:
     - claro por defecto;
     - oscuro bajo `[data-theme="dark"]` y bajo `@media (prefers-color-scheme: dark)` cuando no hay `data-theme`;
     - escritorio por defecto;
     - móvil bajo `[data-platform="mobile"]` y bajo `@media (max-width: 767px)` cuando no hay `data-platform`.
  2. `breakpoints.ts` con `MOBILE_MAX_WIDTH = 767` (I-36), que usan `usePlatform()` y la app.
  3. Estilos base: fuente del sistema, `-webkit-font-smoothing: antialiased`, interlineado 1,4, `box-sizing: border-box`, números tabulares disponibles en `--font-numeric: tabular-nums`.
  4. Stories de **Fundamentos**, una página por grupo, como la ficha `Lib-Fundamentos`:
     - **Color:** muestras con nombre del token, uso y valor, agrupadas en Superficies, Líneas, Texto, Acento, Semánticos, Datos y Capas.
     - **Tipografía:** cada rol con su ejemplo y su tamaño en rem y px.
     - **Espacio y forma:** espaciado, radios y alturas de control.
     - **Elevación:** las cuatro sombras.
  5. **stylelint:** prohíbe colores (`#…`, `rgb()`, `hsl()`, nombres de color), `font-size` y sombras literales en cualquier `.css` de `src/` salvo `tokens.css`.
  6. **Prueba de arquitectura** (`TESTING.md` §«Pruebas de arquitectura (UI)»):
     - no hay valores visuales literales en `.tsx` ni `.css` fuera de `tokens.css`;
     - cambiar `--font-scale` cambia el tamaño calculado de los roles.
- **No incluye:** componentes. Las fuentes web tampoco: se usa la fuente del sistema.

## Tokens de color (los nombres de la izquierda son los del diseño)
| Diseño (`tok()`) | Token CSS | Claro | Oscuro |
|---|---|---|---|
| `page` | `--color-page` | `#F5F4F1` | `#181817` |
| `mbg` | `--color-page-mobile` | `#F4F2EE` | `#111110` |
| `card` | `--color-card` | `#FFFFFF` | `#1E1E1D` |
| `panel` | `--color-panel` | `#FFFFFF` | `#1E1E1D` |
| `sheet` | `--color-sheet` | `#FFFFFF` | `#1F1F1E` |
| `inBg` | `--color-input-bg` | `#FFFFFF` | `#232322` |
| `ctlBg` | `--color-control-bg` | `#FFFFFF` | `#232322` |
| `tone` | `--color-tone` | `#F6F5F2` | `#262625` |
| `track` | `--color-track` | `#F1EFEB` | `#2B2A28` |
| `tabTrack` | `--color-tab-track` | `#F4F3F0` | `#262625` |
| `selRow` | `--color-row-selected` | `#F4F3F0` | `#262625` |
| `activeBg` | `--color-active-bg` | `#FFFFFF` | `#363634` |
| `head` | `--color-table-head` | `#F4F3F0` | `#232322` |
| `line` | `--color-line` | `#E6E3DE` | `#363532` |
| `rowLine` | `--color-row-line` | `#EFEDE9` | `#2B2A28` |
| `cardBorder` | `--color-card-border` | `rgba(31,30,29,0.08)` | `rgba(255,255,255,0.07)` |
| `text` | `--color-text` | `#1F1E1D` | `#EDEBE8` |
| `text2` | `--color-text-2` | `#5F5C57` | `#ABA79F` |
| `text3` | `--color-text-3` | `#716D66` | `#96928B` |
| `accent` | `--color-accent` | `#092E53` | `#1D4C7C` |
| `accentText` | `--color-accent-text` | `#092E53` | `#A9C8EA` |
| `onAccent` | `--color-on-accent` | `#FFFFFF` | `#FFFFFF` |
| `accBg` | `--color-accent-bg` | `rgba(9,46,83,0.05)` | `rgba(169,200,234,0.08)` |
| `accBd` | `--color-accent-border` | `rgba(9,46,83,0.30)` | `rgba(169,200,234,0.40)` |
| `accBg2` | `--color-accent-bg-2` | `rgba(9,46,83,0.08)` | `rgba(169,200,234,0.12)` |
| `green` | `--color-ok` | `#1D6B40` | `#7BCF9B` |
| `okBg` | `--color-ok-bg` | `rgba(29,107,64,0.05)` | `rgba(123,207,155,0.06)` |
| `okBd` | `--color-ok-border` | `rgba(29,107,64,0.32)` | `rgba(123,207,155,0.38)` |
| `red` | `--color-bad` | `#B42318` | `#F2877C` |
| `danger` | `--color-danger` | `#B42318` | `#C2392C` |
| `onDanger` | `--color-on-danger` | `#FFFFFF` | `#FFFFFF` |
| `badBg` | `--color-bad-bg` | `rgba(180,35,24,0.04)` | `rgba(242,135,124,0.07)` |
| `badBd` | `--color-bad-border` | `rgba(180,35,24,0.28)` | `rgba(242,135,124,0.40)` |
| `neuBd` | `--color-neutral-border` | `rgba(31,30,29,0.16)` | `rgba(255,255,255,0.16)` |
| `inBd` | `--color-input-border` | `rgba(31,30,29,0.16)` | `rgba(255,255,255,0.12)` |
| `ring` | `--color-ring` | `rgba(9,46,83,0.12)` | `rgba(169,200,234,0.25)` |
| `ctlBorder` | `--color-control-border` | `rgba(31,30,29,0.10)` | `rgba(255,255,255,0.08)` |
| `ctlShadow` | `--shadow-control` | `0 1px 2px rgba(31,30,29,0.05)` | `none` |
| `shadow` | `--shadow-card` | `0 1px 2px rgba(31,30,29,0.04)` | `none` |
| `modalShadow` | `--shadow-modal` | `0 20px 60px rgba(31,30,29,0.20)` | `0 24px 64px rgba(0,0,0,0.6)` |
| `barShadow` | `--shadow-bar` | `0 8px 24px rgba(31,30,29,0.10)` | `0 8px 24px rgba(0,0,0,0.45)` |
| `scrim` | `--color-scrim` | `rgba(31,30,29,0.30)` | `rgba(0,0,0,0.55)` |
| `toast` | `--color-toast` | `#1F1E1D` | `#EDEBE8` |
| `onToast` | `--color-on-toast` | `#FFFFFF` | `#1F1E1D` |
| `toastLink` | `--color-toast-link` | `#A9C8EA` | `#092E53` |
| `toastOk` | `--color-toast-ok` | `#7BCF9B` | `#1D6B40` |
| `toastBad` | `--color-toast-bad` | `#F2877C` | `#B42318` |
| `avatarBg` | `--color-avatar-bg` | `#EDEBE7` | `#2C2C2A` |
| `avatarFg` | `--color-avatar-fg` | `#55524D` | `#C2BEB7` |
| `underline` | `--color-underline` | `rgba(31,30,29,0.25)` | `rgba(237,235,232,0.3)` |
| `skel` | `--color-skeleton` | `#EEECE8` | `#2B2A28` |
| `bar` | `--color-bar` | `rgba(255,255,255,0.92)` | `rgba(30,30,29,0.92)` |
| `barActive` | `--color-bar-active` | `#EDEBE6` | `#363634` |
| `prBar` | `--color-data-delivered` | `#092E53` | `#A9C8EA` |
| `okBar` | `--color-data-collected` | `#1D6B40` | `#7BCF9B` |
| `pendBar` | `--color-data-pending` | `#C4C0B8` | `#5A5751` |

## Tipografía (roles × `--font-scale`)
| Diseño (`size()`) | Token | Escritorio | Móvil | Peso |
|---|---|---|---|---|
| `fig` | `--text-figure` | 2.5rem (40) | 2.25rem (36) | 700 |
| `title` | `--text-title` | 2rem (32) | 1.75rem (28) | 700 |
| `h` | `--text-heading` | 1.375rem (22) | 1.25rem (20) | 600 |
| `body` | `--text-body` | 1rem (16) | 1.0625rem (17) | 400 |
| `sec` | `--text-secondary` | 0.875rem (14) | 0.9375rem (15) | 400 |
| `cap` | `--text-caption` | 0.8125rem (13) | 0.8125rem (13) | 400 |
| (barra lateral) | `--text-sidebar` | 0.9375rem (15) | — | 400 / 600 activo |

Cada token vale `calc(<rem> * var(--font-scale, 1))`. Los pesos van en `--weight-figure`, `--weight-title`, `--weight-heading`, `--weight-regular` (400), `--weight-medium` (500) y `--weight-strong` (600). Interlineado `--leading: 1.4`.

## Espacio, forma y alturas
| Grupo | Tokens |
|---|---|
| Espaciado (múltiplos de 4) | `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 20 · `--space-6` 24 · `--space-8` 32 · `--space-12` 48 |
| Radios | `--radius-xs` 6 (etiqueta, portada) · `--radius-sm` 10 (ítem de menú, campo escritorio) · `--radius-md` 12 (campo móvil, fila) · `--radius-lg` 14 (tarjeta métrica, menú) · `--radius-xl` 18 (isla, buscador móvil) · `--radius-2xl` 20 (panel, diálogo) · `--radius-sheet` 28 (hoja inferior) · `--radius-pill` 999 |

| Alto de control | Token | Escritorio | Móvil |
|---|---|---|---|
| Botón principal | `--size-primary` | 40 | 52 |
| Radio del botón principal | `--radius-primary` | 999 | 16 |
| Botón y control | `--size-control` | 40 | 44 |
| Compacto / chip | `--size-control-sm` | 32 | 36 |
| Campo | `--size-field` | 40 | 48 |
| Radio del campo | `--radius-field` | 10 | 12 |
| Buscador | `--size-search` | 40 | 52 |
| Fila de lista | `--size-list-row` | 64 | 72 |
| Fila de dato | `--size-data-row` | 44 | 48 |
| Ícono | `--size-icon` | 18 | 20 |
| Separación entre controles | `--gap-control` | 10 | 12 |
| Área táctil mínima | `--size-touch` | 44 | 44 |

Las alturas son medidas de control, no de letra: van en px y **no** se multiplican por `--font-scale`, como en el diseño.

## Reglas (el sistema DEBE…)
- **R1.** Ningún componente DEBE escribir un color, tamaño de letra, sombra, radio o espacio literal: solo `var(--…)` de esta HU.
- **R2.** CUANDO cambia `--font-scale` en un ancestro, todos los roles de texto de sus descendientes DEBEN cambiar en la misma proporción.
- **R3.** CUANDO un ancestro tiene `data-theme="dark"`, sus descendientes DEBEN usar los valores oscuros aunque el sistema esté en claro, y al revés.
- **R4.** CUANDO un ancestro tiene `data-platform="mobile"`, sus descendientes DEBEN usar los valores móviles aunque la ventana sea ancha (así funcionan los marcos lado a lado del Storybook).

## Criterios de aceptación
- **CA-1.** **Dado** `Fundamentos/Color` con Tema = Lado a lado, **entonces** `--color-accent` se ve `#092E53` en claro y `#1D4C7C` en oscuro, y cada muestra dice su nombre de diseño y su token.
- **CA-2.** **Dado** `Fundamentos/Tipografía` con Plataforma = Lado a lado, **entonces** `--text-body` mide 16 px en escritorio y 17 px en móvil; con Letra = 1,3 mide 20,8 y 22,1 px.
- **CA-3.** **Dado** un `.module.css` con `color: #fff`, **cuando** corro `pnpm lint`, **entonces** stylelint falla y nombra el archivo.
- **CA-4.** **Dado** un `.tsx` con `style={{ fontSize: 14 }}`, **cuando** corro `pnpm test`, **entonces** la prueba de arquitectura falla.
- **CA-5.** **Dado** un elemento con `data-platform="mobile"` dentro de una ventana de 1280 px, **entonces** su `--size-primary` vale 52 px.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y los valores coinciden uno a uno con `tok()` y `size()` del diseño v1.1.
