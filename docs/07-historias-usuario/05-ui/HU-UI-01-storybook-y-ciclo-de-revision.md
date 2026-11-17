# HU-UI-01 · Storybook, estructura de `src/ui` y ciclo de revisión

> **Iteración 1** · **Nivel:** cimientos · **Depende de:** HU-BASE-01 · **Diseño:** página «Biblioteca de componentes» del lienzo (Portada: jerarquía, convenciones y «Cómo cambiar un componente») · **Reglas:** ADR-0050, ADR-0034, BR-GEN-13

## Historia
**Como** dueño **quiero** abrir un enlace y ver cada componente con todas sus variantes, en claro y oscuro, en móvil y escritorio, y reportar desde ahí lo que hay que corregir, **para** revisar el front sin instalar nada e iterar el diseño con William.

## Contexto
- Es el primer trabajo del front: deja listo el andamiaje donde se montarán los 29 componentes y las pantallas. Todavía no hay ningún componente.
- El dueño no es técnico con Storybook: la página de inicio y la barra superior deben explicarse solas, en español.
- El Storybook solo muestra datos de ejemplo (nunca datos reales ni claves).

## Alcance
- **Incluye:**
  1. Instalar Storybook (`@storybook/nextjs-vite`) con los complementos de accesibilidad, documentación y pruebas con Vitest, en **versiones exactas**. Antes de instalar, se comprueba que sean compatibles con Next 16.4, React 19.3 y Vitest 5; si una no lo es, se elige la última compatible y se anota en el PR. Se agregan los scripts `pnpm storybook` y `pnpm build-storybook`, y las stories corren dentro de `pnpm test`.
  2. **Barra superior** con tres controles globales (en español):
     - **Tema:** Claro · Oscuro · Lado a lado.
     - **Plataforma:** Escritorio · Móvil · Lado a lado.
     - **Letra:** 0,85 · 1 · 1,15 · 1,3.
     Por defecto: Claro, Lado a lado (plataforma) y 1.
  3. **Decorador de marcos.** Para cada combinación elegida se pinta un marco con:
     - nombre visible («Escritorio · Claro»);
     - ancho de **1280 px** para escritorio y **390 px** para móvil;
     - fondo de página del tema;
     - `data-theme`, `data-platform`, `--font-scale` y un `PlatformProvider` con esa plataforma.
     Las plantillas y pantallas usan el marco a su tamaño real (1440 × 900 y 390 × 844).
  4. `src/ui/platform/`:
     - `PlatformProvider` y `usePlatform()`, que devuelve `'mobile' | 'desktop'`: primero el valor del proveedor y, si no hay, el punto de corte de `breakpoints.ts`.
     - `ThemeScope` (marco con los atributos).
     Se crean con una story `Fundamentos/Plataforma` que muestra lo que `usePlatform()` ve en cada marco.
  5. **Página «Inicio»** (MDX, en español):
     - qué es el Storybook;
     - cómo usar la barra superior;
     - cómo está organizado (Fundamentos → Átomos → Moléculas → Organismos → Plantillas → Pantallas, igual que el lienzo);
     - qué significa «Iteración 1»;
     - cómo reportar una corrección.
  6. **Plantilla de documentación** de cada componente con:
     - la descripción;
     - «Cuándo usarlo» y «Cuándo no usarlo»;
     - las props;
     - «Se usa en»;
     - la versión del diseño;
     - el botón **«Reportar corrección»**.
     Se alimenta de `parameters.design = { ficha: 'Lib-Boton', version: 'v1.1', iteration: 1 }` y de los comentarios de las props.
  7. **Plantilla de *issue*** `.github/ISSUE_TEMPLATE/correccion-de-diseno.yml` («Corrección de diseño»), con estos campos:
     - componente o pantalla;
     - enlace de la story;
     - tipo: *No se parece al diseño* / *Quiero cambiar el diseño*;
     - tema y plataforma donde se ve;
     - qué está mal;
     - cómo debería verse;
     - captura opcional.
     Etiquetas `diseño` e `iteración-1`. «Reportar corrección» abre esta plantilla con el título `[<Componente>] ` ya escrito.
  8. **Reglas de ESLint:**
     - niveles de `ui/`: `atoms` no importa `molecules`, `organisms` ni `templates`; `molecules` no importa `organisms` ni `templates`; `organisms` no importa `templates`;
     - `lucide-react` solo dentro de `src/ui/icons/`;
     - `@radix-ui/*` solo dentro de `src/ui/`.
  9. **Prueba de arquitectura** `tests/architecture/stories.test.ts`: todo componente de `src/ui/{atoms,molecules,organisms,templates}/*/` y toda pantalla de `src/features/*/screens/` tiene su `.stories.tsx`.
  10. **Publicación.** Archivo de configuración para un proyecto de Vercel aparte que construye `pnpm build-storybook` y sirve `storybook-static/`. Se publica la rama de trabajo como *preview* protegido por la autenticación de Vercel, en la URL estable de la rama. Lo crea el dueño (punto de entrega).
- **No incluye:** tokens ni componentes (HU-UI-02 en adelante); revisión visual automatizada por capturas (Chromatic u otro); el punto de corte y los atributos en `<html>` de la app (HU-PAN-BASE-01).

## Reglas (el sistema DEBE…)
- **R1.** CUANDO se elige un valor en Tema, Plataforma o Letra, TODAS las stories abiertas DEBEN repintarse con ese valor sin recargar.
- **R2.** CUANDO Plataforma = Lado a lado, el Storybook DEBE mostrar el marco de escritorio y el de móvil uno junto al otro. Con Tema = Lado a lado también, DEBE mostrar los cuatro marcos.
- **R3.** El decorador DEBE ser la única forma de dar tema y plataforma a una story: ninguna story los fija a mano, salvo «Matriz», que usa el mismo decorador con las cuatro combinaciones.
- **R4.** El Storybook publicado DEBE construirse solo con cada *push* a la rama de trabajo; nadie lo sube a mano.

## Criterios de aceptación
- **CA-1.** **Dado** el Storybook abierto en `Fundamentos/Plataforma`, **cuando** elijo Tema = Oscuro, **entonces** el fondo del marco cambia al de página oscura y la story muestra `data-theme="dark"`.
- **CA-2.** **Dado** Plataforma = Lado a lado, **cuando** abro cualquier story, **entonces** veo dos marcos titulados «Escritorio» (1280 px) y «Móvil» (390 px), y `usePlatform()` devuelve `desktop` y `mobile` en cada uno.
- **CA-3.** **Dado** Letra = 1,3, **cuando** miro un texto de ejemplo con el rol `--text-body`, **entonces** su tamaño calculado es 1,3 veces el de Letra = 1.
- **CA-4.** **Dado** un archivo `src/ui/atoms/Foo/Foo.tsx` sin `Foo.stories.tsx`, **cuando** corro `pnpm test`, **entonces** la prueba de arquitectura falla y nombra `Foo`.
- **CA-5.** **Dado** un átomo que importa una molécula, o un archivo de `features/` que importa `lucide-react`, **cuando** corro `pnpm lint`, **entonces** falla con un mensaje en español que cita ADR-0050.
- **CA-6.** **Dado** un componente con `parameters.design.ficha = 'Lib-Boton'`, **cuando** pulso «Reportar corrección» en su documentación, **entonces** se abre en GitHub un *issue* nuevo con la plantilla «Corrección de diseño» y el título «[Botón] ».
- **CA-7.** **Dado** un *push* a la rama de trabajo, **cuando** termina el despliegue, **entonces** la URL estable del Storybook muestra el cambio y pide iniciar sesión en Vercel a quien no es del equipo.
- **CA-8.** **Dado** una story con un botón sin nombre accesible, **cuando** corro `pnpm test`, **entonces** la prueba de accesibilidad de esa story falla.

## Punto de entrega
Al terminar, William avisa: **«UI-01 lista, falta el proyecto de Storybook en Vercel»**. El dueño:
1. Crea en Vercel (cuenta nueva, SG-02) un proyecto importando el repositorio `Colportaje` con el nombre `colportor-storybook`.
2. En *Build & Output Settings* elige *Framework: Other*, *Build Command* `pnpm build-storybook` y *Output Directory* `storybook-static`.
3. Deja *Deployment Protection* en *Standard Protection*.
4. Le pasa a William la URL de la rama de trabajo (`colportor-storybook-git-<rama>-<cuenta>.vercel.app`).

Nadie pega claves en el chat.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y además el dueño abrió el enlace publicado, cambió Tema, Plataforma y Letra, y abrió un *issue* de prueba con «Reportar corrección».
