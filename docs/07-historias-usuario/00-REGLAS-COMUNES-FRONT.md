# Reglas comunes a todas las historias del front

> **Iteración 1 (2026-11-17).** Estas reglas y las HU de `05-ui/` y `06-pantallas/` describen la **primera versión** del front. El diseño va a cambiar: ver §2.

Toda HU de `05-ui/` y `06-pantallas/` incluye estas reglas aunque no las repita. Si una HU dice algo distinto, manda la HU solo en lo que diga explícitamente. Si contradice los docs normativos o el diseño, **se detiene el trabajo y se pregunta al dueño**. Las reglas del back (`00-REGLAS-COMUNES.md`) siguen valiendo para todo lo que toque datos. La decisión de fondo está en ADR-0050.

## 1. Fuentes de verdad
1. **Diseño:** el lienzo `https://claude.ai/artifact/RgxEeQ7BZExzaJVcih3AZV`, página **«Biblioteca de componentes»** (v1.1, 17/11/2026). La **ficha** de cada componente (`Lib-*`) dice qué hace, cuándo usarlo y cuándo no, sus propiedades, variantes, estados, accesibilidad y dónde se usa. El archivo fuente (`Boton.dc.html`…) da las medidas exactas.
2. **Biblioteca antes que pantalla.** Si una pantalla del lienzo (páginas Claro/Oscuro · Móvil/Escritorio) contradice a la biblioteca, manda la biblioteca y se anota en la HU de la pantalla. Si una pantalla necesita algo que ningún componente de la biblioteca hace:
   - **Si la pantalla del lienzo lo dibuja** (p. ej. el calendario de «Cambiar fecha de abono»), se programa tal como está dibujado, como **pieza del módulo** en `features/<área>/components/`, con su story en `Pantallas/<Módulo>/Piezas`. Se anota en el README («Lo que la biblioteca aún no tiene») para que el diseño lo suba a la biblioteca; cuando lo suba, la pieza se mueve a `ui/`.
   - **Si no está dibujado en ninguna parte** (lo que figura en `04-diseno/pendientes/FALTA-*.md` y sigue sin pantalla), **no se inventa**: queda fuera de la HU y se le pregunta al dueño.
3. **Comportamiento y textos de negocio:** `01-negocio/BUSINESS-RULES.md`, el glosario y las HU del back. Las pantallas usan los **hooks** que esas HU ya entregaron (sus nombres son el contrato).
4. **Nombres:** código en inglés; Storybook y textos en español. Equivalencias en `00-contexto/GLOSSARY.md` → «Componentes de la interfaz».

## 2. Iteración 1: cómo cambia
- **Corrección visual** (no se parece al diseño, o el dueño quiere un ajuste pequeño): el dueño abre un *issue* «Corrección de diseño» desde el Storybook y William lo corrige. La HU no cambia.
- **Cambio de diseño** (nueva variante, otra prop, otro estado, otra regla): primero se actualiza la ficha en el lienzo. Luego se agrega a la HU una sección **«Cambios por iteración»** con la fecha, qué cambió y el *issue*, y se programa.
- **Color o tamaño:** se cambia **un token** en `src/ui/tokens/tokens.css` y el mismo valor en `tok()` / `size()` del lienzo. Nunca se arregla en un componente suelto.
- Cada componente muestra en su página de documentación del Storybook la versión del diseño con la que se hizo (p. ej. «Iteración 1 · diseño v1.1»).

## 3. Estructura y capas
| Dónde | Qué va | Puede importar |
|---|---|---|
| `src/ui/tokens/` | `tokens.css` (único lugar con valores visuales) y `breakpoints.ts` | — |
| `src/ui/icons/` | `Icon` y el mapa nombre → Lucide | tokens |
| `src/ui/platform/` | `PlatformProvider`, `usePlatform()`, `ThemeScope` | tokens |
| `src/ui/atoms/` | Átomos | icons, platform, `domain/money`, `domain/time` |
| `src/ui/molecules/` | Moléculas | átomos y lo anterior |
| `src/ui/organisms/` | Organismos genéricos | moléculas, átomos y lo anterior |
| `src/ui/templates/` | Plantillas (esqueletos de pantalla) | organismos y lo anterior |
| `src/features/<área>/components/` | Piezas de un módulo (p. ej. `MoneySummary`, `CustomerRow`) | `ui/*`, dominio, hooks de su área |
| `src/features/<área>/screens/` | **Pantalla de presentación**: recibe el modelo de vista y callbacks por props; no llama hooks de datos | `ui/*`, `components/`, dominio, `copy` |
| `src/app/(app)/<ruta>/page.tsx` | **Contenedor**: llama los hooks del back y pasa datos a la pantalla | features, ui |

- Una regla de ESLint impide que un nivel de `ui/` importe uno superior (un átomo no importa una molécula). `ui/` sigue sin importar `features/` ni `adapters/` (ya existe en `eslint.layers.mjs`).
- Cada componente vive en su carpeta: `Button/Button.tsx`, `Button.module.css`, `Button.stories.tsx`, `index.ts` (y `Button.test.tsx` si tiene lógica).
- Los componentes de `ui/` **no tienen lógica de negocio**: no saben qué es un cliente ni un abono. Reciben datos ya calculados por props.

## 4. Tema, plataforma y letra
- **Tema:** `data-theme="light" | "dark"` en un ancestro. En la app se toma del sistema (`prefers-color-scheme`); elegirlo en Ajustes espera al diseño de Ajustes.
- **Plataforma:** `data-platform="mobile" | "desktop"` en un ancestro. En la app se fija en `<html>` antes de pintar, según el punto de corte de `breakpoints.ts` (**móvil por debajo de 768 px**, I-36), y se actualiza al cambiar el ancho.
- **Componentes que cambian de forma** (Navegación, Diálogo, Menú, Fila de lista, Ventana de detalle, Resumen de dinero): leen `usePlatform()` y renderizan la forma de cada plataforma. Los demás cambian solo por tokens (CSS).
- **Letra:** todos los tamaños son roles × `--font-scale` (ADR-0034). Ningún componente fija tamaño de letra.
- En Storybook, los marcos de cada combinación ponen `data-theme`, `data-platform`, `--font-scale` y el `PlatformProvider` (HU-UI-01).

## 5. Estilos
- **Solo tokens.** Prohibidos `px`, `rem` o `#hex` de tipografía o color en componentes, así como `rgb()` y sombras escritas a mano. Las medidas de control (alto de botón, radios, espacios) también salen de tokens. Lo verifican stylelint y la prueba de arquitectura de `TESTING.md`.
- CSS Modules por componente. Sin estilos en línea salvo variables CSS calculadas (p. ej. `style={{ '--gauge-delivered': pct }}`).
- Variantes por intención (`primary`, `danger`, `overdue`), nunca por color (`blue`, `red`).

## 6. Íconos
Solo con `<Icon name="…">` de `src/ui/icons`, con los 46 nombres del diseño. Ningún archivo fuera de `src/ui/icons/` importa `lucide-react` (regla de ESLint). Un ícono nuevo se busca primero en lucide.dev y se agrega al mapa con su nombre en español, después de agregarlo a la ficha del Ícono en el lienzo.

## 7. Textos, dinero y fechas
- **Ningún componente lleva texto en español escrito dentro.** El texto del contenido (nombre del cliente, título de una isla, mensaje de un aviso) llega por props. Los textos fijos del propio componente salen de `src/copy/es.ts` (`ui/` puede importar `copy`). Por ejemplo: el nombre de cada estado de la Pastilla, «Cerrar», «Quitar filtro Vencido», «Volver a Clientes», «Deshacer». Las pantallas también toman sus textos de `copy/es.ts`.
- Los errores del back (`AppError.code`) se traducen a texto en `copy/es.ts`, en una sola tabla (HU-PAN-BASE-01).
- Dinero: los componentes reciben **enteros COP** y formatean con `formatCOP` (`domain/money`). Fechas: reciben el tipo de `domain/time` y formatean `dd/mm/aaaa` con sus helpers. Nunca reciben texto ya formateado para un monto o una fecha.
- Las stories sí pueden tener texto en español de ejemplo (los del diseño). La prueba «sin español escrito en componentes» excluye `*.stories.tsx` y `src/copy/`.
- Ningún texto menciona que el líder pueda asumir una pérdida (BR-COPY-11).

## 8. Accesibilidad (mínimo en todo componente)
- Lo que dice la sección «Accesibilidad» de su ficha (roles, `aria-*`, teclado, foco).
- Elementos reales (`<button>`, `<a href>`, `<input>` + `<label>`). Nunca `onClick` en un `div`.
- Área táctil mínima de 44 × 44 en móvil. Anillo de foco visible (token `ring`). Contraste ≥ 4,5:1 en ambos temas.
- El color nunca es la única señal (va con texto o ícono).
- El complemento de accesibilidad del Storybook no reporta violaciones en ninguna story.

## 9. Stories obligatorias de cada componente
- **Título** con la jerarquía del diseño: `Fundamentos/…`, `Átomos/Botón`, `Moléculas/Fila de lista`, `Organismos/Ventana de detalle`, `Plantillas/Lista`, `Pantallas/Clientes/Lista`.
- **Página de documentación** (autodocs) con:
  - la descripción, «Cuándo usarlo» y «Cuándo no usarlo» de la ficha;
  - la tabla de props (sale del tipo TypeScript, con comentarios en español);
  - «Se usa en»;
  - «Iteración 1 · diseño v1.1»;
  - el enlace **«Reportar corrección»** (abre el *issue* con el título `[<Componente>]`).
- **«Explorar»:** una story con todos los controles editables.
- **Una story por cada ejemplo** de «Variantes y estados» de la ficha, con el mismo nombre que en el diseño (p. ej. «Principal», «Solo ícono», «Cargando»).
- **«Matriz»:** todas las variantes en claro y oscuro × escritorio y móvil a la vez.
- Ninguna story depende de la red ni de Supabase. Los datos de ejemplo de las pantallas salen de fábricas tipadas (`aCustomerListView()`…).

## 10. Pruebas
- Las interacciones de la ficha (teclado, foco, Esc, deshabilitado…) se prueban con funciones `play` en sus stories y corren en `pnpm test`.
- La lógica que no es visual (p. ej. calcular los tramos del Medidor) se prueba aparte con Vitest.
- Pruebas de arquitectura (HU-UI-01 y HU-UI-02):
  - cada componente de `src/ui/` y cada pantalla de `features/*/screens/` tiene su `.stories.tsx`;
  - no hay valores visuales literales;
  - no se importa `lucide-react` fuera de `ui/icons`;
  - se respetan los niveles de `ui/`.
- Las pantallas conectadas se prueban de punta a punta con Playwright (móvil y escritorio) en los flujos de `TESTING.md` §Prioridad 3 que ya tengan pantalla.

## 11. Pantallas
- **Separación presentación / contenedor (§3).** La pantalla de presentación cubre todos sus estados por props: cargando, vacío, sin resultados, sin conexión, error y con datos. Así cada estado tiene su story.
- Los estados de lista usan `EmptyState` y el de sin conexión la `Banner` «Sin conexión» (BR-GEN-08). Una acción sin conexión no se intenta: el back devuelve `OFFLINE` y la pantalla lo explica.
- Tras una acción con «Deshacer», el `Toast` dura `undo.toastSeconds` de `business-config` (hoy 6 s; I-34).
- Las rutas son las del glosario (`/clientes`, `/clientes/nuevo`, `/inventario`, `/inventario/agregar`, `/dinero`…). El modo «página» de la Ventana de detalle tiene URL propia.
- Lo que el lienzo marca como pospuesto (Visitas, Minibooks, Hoy…) **no se muestra**: no se dejan botones muertos.

## 12. Fuera de alcance de todas las HU del front (iteración 1)
Pantallas sin diseño (Hoy, Calendario, Minibooks, Hacer inventario, Admin, Iniciar sesión, Ajustes); escritura sin conexión (fase 2); vista de líder (fase 3); revisión visual automatizada por capturas; animaciones que no estén en la ficha.

## 13. Definición de terminado (vale para toda HU del front)
- [ ] Cada criterio de aceptación tiene una story o una prueba que lo nombra (`CA-3: …`) y pasa.
- [ ] Están todas las stories de §9 y se ven bien con Tema (claro/oscuro), Plataforma (escritorio/móvil) y Letra (0,85 y 1,3).
- [ ] Cero violaciones de accesibilidad en el Storybook; navegable con teclado.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm build-storybook` en verde; sin `any`, `@ts-ignore` ni `console.log`.
- [ ] Sin valores visuales literales, sin `lucide-react` fuera de `ui/icons` y sin texto en español escrito en componentes (todo sale de props o de `copy/es.ts`).
- [ ] El Storybook publicado se actualizó y se avisó al dueño con el enlace a la página del componente (ver README, «Cómo iteramos»).
