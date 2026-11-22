# HU-UI-23 · Navegación

> **Iteración 1** · **Nivel:** organismo · **Código:** `AppNav` (`Sidebar`, `BottomBar`, `MoreSheet`) en `src/ui/organisms/AppNav/` · **Storybook:** `Organismos/Navegación` · **Depende de:** HU-UI-04, HU-UI-08 · **Diseño:** ficha `Lib-Navegacion`, fuente `Navegacion.dc.html`; página «Sistema» §05 · **Reglas:** BR-GEN-10, BR-GEN-11, ADR-0018, ADR-0029, FT-01, FT-02, I-37

## Historia
**Como** colportor **quiero** moverme entre módulos con una barra lateral en el computador y una barra inferior en el celular **para** llegar a cualquier parte en uno o dos toques.

## Qué es (de la ficha)
Cómo se mueve el colportor entre módulos.
- **Escritorio:** barra lateral con la cuenta, Buscar, Hoy, Nuevo cliente y los grupos plegables Trabajo y Dinero; Ajustes y Admin al pie.
- **Móvil:** barra inferior flotante con Hoy, Clientes, Inventario y Más, y el botón flotante de crear. «Más» abre una hoja con grupos de máximo 4.
- **Usarlo:** en todas las pantallas raíz.
- **No usarlo:** en pantallas de crear ni en detalles a pantalla completa en móvil (ahí se usa Volver).

## Props
| Prop | En el diseño | Tipo | Notas |
|---|---|---|---|
| `active` | `activa` | `NavId` (`today`, `customers`, `inventory`, `minibooks`, `calendar`, `money`, `stocktake`, `settings`, `admin`) | En móvil, lo que no está en la barra marca «Más» |
| `items` | — | `NavId[]` | Qué módulos se muestran. El Storybook pasa todos (como el diseño); la app solo los que tienen pantalla (I-37) |
| `fab` | `fab` | `{ icon: IconName; label: string; onClick } \| undefined` | Botón flotante en móvil; su ícono cambia según el módulo (Clientes: Nuevo cliente; Inventario: Agregar a inventario) |
| `account` | — | `{ name: string }` | Cuenta en la cabecera de la barra lateral (Avatar marca + nombre) |
| `onNewCustomer` | — | `() => void` | Acceso «Nuevo cliente» de la barra lateral |
| `search` | — | `{ onOpen } \| undefined` | «Buscar ⌘K»: el Storybook lo muestra, la app no (FT-01) |
| `hrefs` | — | `Record<NavId, string>` | Rutas del glosario |

## Comportamiento (cambia de forma: usa `usePlatform()`)
- **R1.** Barra lateral (escritorio):
  - fondo `page-mobile`;
  - accesos superiores: Buscar, Hoy y Nuevo cliente (con cuadro `accent` y texto `accent-text`);
  - grupos plegables «Trabajo» (Clientes, Inventario, Minibooks, Calendario) y «Dinero» (Dinero, Hacer inventario);
  - Ajustes y Admin al pie;
  - ítem activo: tarjeta `card` con `shadow-control`, texto e ícono `accent-text` y peso 600;
  - texto de 15 px × escala (rol de la barra lateral, `04-diseno/DESIGN-BRIEF.md` §5b; se crea el token `--text-sidebar` en HU-UI-02).
- **R2.** Barra inferior (móvil): píldora flotante con fondo `bar` y difuminado detrás, sombra `shadow-bar`, cuatro destinos con ícono **y nombre** (ronda 19). El activo tiene fondo `bar-active`, color `accent-text` y trazo 2. Cada destino mide al menos 44 × 44.
- **R3.** El botón flotante (`Button variant="fab"`) va encima de la barra a la derecha; sin `fab` no se pinta.
- **R4.** «Más» abre una hoja inferior con los grupos Trabajo, Dinero y Cuenta (Ajustes, Admin), con un máximo de 4 por grupo (BR-GEN-11).
- **R5.** Admin solo aparece si el perfil es admin (lo decide quien la usa, pasando `items`).
- **R6.** El botón «Cambiar de cuenta» (`up-down`) **no** se muestra: no hay varias cuentas (FT-02).

## Stories
«Explorar» · Escritorio: «Clientes activo», «Dinero activo» · Móvil: «Clientes activo», «Inventario activo» (fab Agregar a inventario), «Más activo · sin botón flotante» (Dinero) · «Hoja Más abierta» · «Solo módulos con pantalla» (Clientes, Inventario, Dinero) · «Matriz».

## Accesibilidad
- `<nav aria-label="Principal">`; el ítem activo con `aria-current="page"`.
- Cada ítem de la barra inferior mide al menos 44 × 44.
- El botón flotante tiene nombre («Nuevo cliente»).

## No incluye
Búsqueda global (FT-01); cambio de cuenta (FT-02); el contenido de Hoy, Minibooks, Calendario, Hacer inventario, Ajustes y Admin.

## Criterios de aceptación
- **CA-1.** **Dado** escritorio con `active="money"`, **entonces** «Dinero» se ve como tarjeta activa con `aria-current="page"` dentro del grupo «Dinero».
- **CA-2.** **Dado** móvil con `active="money"`, **entonces** la barra marca «Más» como activo.
- **CA-3.** **Dado** móvil, **cuando** pulso «Más», **entonces** sube la hoja con los grupos y ningún grupo tiene más de 4 opciones.
- **CA-4.** **Dado** `items = ['customers','inventory','money']`, **entonces** no aparecen Hoy, Minibooks, Calendario ni Hacer inventario, y la barra inferior muestra Clientes, Inventario y Más (con Dinero dentro).
- **CA-5.** **Dado** `fab` indefinido, **entonces** no hay botón flotante.

## Cambios por iteración
- **2026-11-22 (corrección del dueño, error de código):** la barra lateral crecía hasta el alto de la página y se encogía cuando el contenido era ancho. **R6:** la barra lateral tiene siempre el alto de la pantalla (fija al desplazar la página; si sus ítems no caben, se desplaza ella sola) y su ancho fijo de 248, sin importar el contenido. Prueba: story `Pantallas/Armazón › Contenido largo y ancho`.

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
