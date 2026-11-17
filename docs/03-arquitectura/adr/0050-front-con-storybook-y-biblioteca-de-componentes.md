# ADR-0050: Front con Storybook y la biblioteca de componentes del diseño

**Estado:** Aceptado (2026-11-17, ronda 31) · **Reemplaza en parte:** ADR-0029 (stack de UI «Tailwind + shadcn/ui») y la fila «Estilos / UI» de `ARCHITECTURE.md` §1

## Contexto
El back de Clientes, Inventario y Dinero está terminado. El lienzo de diseño (`https://claude.ai/artifact/RgxEeQ7BZExzaJVcih3AZV`) tiene una página **Biblioteca de componentes** (v1.1, 17/11/2026) con fundamentos, 8 átomos, 10 moléculas, 7 organismos y 2 plantillas. Cada componente es un archivo propio con propiedades, variantes y estados, en escritorio y móvil, claro y oscuro, y las pantallas lo importan en lugar de copiar su código.

El dueño quiere una arquitectura impecable y un **Storybook** donde se vea cada componente con todas sus variantes, para reutilizarlo en distintas páginas. Lo programará William: él muestra el Storybook, el dueño corrige el diseño y así se itera. El dueño aclara que **es la primera iteración y va a cambiar**.

## Decisión
1. **Storybook** (framework `@storybook/nextjs-vite`) en el mismo repositorio. Cada componente de `src/ui/` y cada pantalla de presentación tiene su `*.stories.tsx`. Las stories también son pruebas: interacción y accesibilidad corren con Vitest.
2. **Barra superior del Storybook con tres controles globales**, que cambian todas las stories:
   - **Tema:** Claro · Oscuro · Lado a lado.
   - **Plataforma:** Escritorio · Móvil · Lado a lado (marcos de 1280 y 390 px).
   - **Letra:** escala de 0,85 a 1,3 (`--font-scale`).
   Además, cada componente tiene una story **«Matriz»** con las cuatro combinaciones (claro/oscuro × escritorio/móvil) a la vez.
3. **Tema, plataforma y escala no son props.** En el diseño cada pieza los recibe; en código se resuelven una sola vez:
   - **Tema:** atributo `data-theme` en un ancestro. En la app sigue al sistema (`prefers-color-scheme`).
   - **Plataforma:** atributo `data-platform` en un ancestro, que en la app se fija con el punto de corte. Los tokens cambian por CSS. Los componentes que cambian de **forma** (tabla↔lista, modal↔hoja…) leen la plataforma con `usePlatform()`.
   - **Escala:** variable `--font-scale`.
   Así el Storybook puede pintar móvil y escritorio lado a lado en la misma página.
4. **Estilos:** CSS Modules + `src/ui/tokens/tokens.css` (ADR-0034) + **Radix Primitives** solo para el comportamiento accesible (diálogo, menú, pestañas, casilla, radio, interruptor). **No** se usan Tailwind ni shadcn/ui.
5. **Íconos: Lucide** (`lucide-react`), con trazo 1,8 (2 cuando el ícono mide 16 px o menos). Usa la misma tabla «nombre Colportor → ícono Lucide» de la ficha del Ícono en el diseño. Ningún componente importa `lucide-react` directamente: todos usan `<Icon name="…">`.
6. **Nombres:** el código va en inglés (`Button`, `StatusPill`) y el Storybook en español con la jerarquía del diseño (`Átomos/Botón`). Esto se aparta de la convención de la biblioteca del diseño («nombres de código en español») porque las reglas del proyecto mandan código en inglés. La tabla de equivalencias está en `00-contexto/GLOSSARY.md` («Componentes de la interfaz»). Las props y sus valores también van en inglés (`variant="primary"`).
7. **La biblioteca del lienzo es la fuente del diseño.** Si una pantalla del lienzo contradice a la biblioteca, manda la biblioteca. Si una pantalla necesita algo que ningún componente hace, primero se agrega a la biblioteca en el diseño (regla de su Portada) y después se programa.
8. **La «Barra de vista» (`ViewBar`, ADR-0029) sigue existiendo como composición:** Pestañas + Buscador + botones de Filtro y Orden + chips de filtros activos. Vive en la Plantilla de lista y la usan todos los módulos.
9. **Iteración 1.** Las historias del front describen la primera versión. Las correcciones se manejan así:
   - Una corrección visual llega como *issue* «Corrección de diseño».
   - Un cambio de una prop, una regla o un estado actualiza la HU en una sección «Cambios por iteración».
   - Un cambio de color o tamaño se hace en `tokens.css` y en `tok()` / `size()` del lienzo.

## Alternativas descartadas
- **Tailwind + shadcn/ui** (propuesta de ADR-0029). El diseño ya es un sistema propio y completo, así que el aspecto de shadcn se tiraría. ADR-0034 obliga a mapear cada utilidad de Tailwind a un token y a prohibir valores arbitrarios: Tailwind aportaría poco y añadiría una capa. Con CSS Modules, la regla «solo tokens» se verifica con una sola regla de stylelint.
- **Tema y plataforma como props de cada componente**, como en el lienzo. Obligaría a pasarlos por todo el árbol y a repetirlos en cientos de usos.
- **Plataforma solo por *media query* del viewport.** No permitiría ver móvil y escritorio lado a lado en la misma página del Storybook.
- **Nombres de código en español** (convención del lienzo). Contradice `AGENTS.md` y mezclaría idiomas con el back.
- **Chromatic** u otro servicio de revisión visual de pago. Para la iteración 1 basta con el Storybook publicado y los *issues*; se puede reconsiderar si las correcciones crecen.

## Consecuencias
- Nuevas dependencias de desarrollo: `storybook`, `@storybook/nextjs-vite`, `@storybook/addon-a11y`, `@storybook/addon-vitest` (o el equivalente vigente al instalar, siempre con versión exacta) y `stylelint`. Dependencias de ejecución: `lucide-react` y los paquetes de Radix que se usen. Antes de instalar, HU-UI-01 comprueba que las versiones sean compatibles con Next 16.4, React 19.3 y Vitest 5.
- `src/ui/` se organiza en `tokens/`, `icons/`, `atoms/`, `molecules/`, `organisms/`, `templates/` y `platform/`. Una regla de ESLint impide que un nivel importe uno superior.
- Pruebas de arquitectura nuevas: todo componente de `src/ui/` y toda pantalla de presentación tiene su story, y no hay colores ni tamaños literales fuera de `tokens.css`.
- El Storybook se publica en Vercel desde la rama de trabajo, en un proyecto aparte que crea el dueño. Las correcciones se hacen por *issues* de GitHub con una plantilla.
- La fila «Estilos / UI» de `ARCHITECTURE.md`, la regla de `CONVENTIONS.md` §4 sobre `ViewBar` y OQ-22 se actualizan en el mismo cambio.

## Referencias
ADR-0029, ADR-0034, ADR-0037 · BR-GEN-13 · `07-historias-usuario/00-REGLAS-COMUNES-FRONT.md` · `07-historias-usuario/05-ui/` · `07-historias-usuario/06-pantallas/` · `00-contexto/DECISION-LOG.md` ronda 31
