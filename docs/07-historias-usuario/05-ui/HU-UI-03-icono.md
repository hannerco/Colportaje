# HU-UI-03 · Ícono

> **Iteración 1** · **Nivel:** átomo · **Código:** `Icon` en `src/ui/icons/` · **Storybook:** `Átomos/Ícono` · **Depende de:** HU-UI-02 · **Diseño:** ficha `Lib-Icono`, fuente `Icono.dc.html` · **Reglas:** ADR-0050 (Lucide)

## Historia
**Como** colportor **quiero** que la misma idea tenga siempre el mismo ícono (Dinero siempre es un billete) **para** reconocer las acciones sin leer.

## Qué es (de la ficha)
Ícono de **Lucide** (`lucide-react`, licencia ISC; el diseño usa la versión 1.74). Colportor usa un subconjunto de 46 íconos con nombre propio, siempre con trazo 1,8 sobre 24 × 24. Cambiar el ícono Lucide asignado a un nombre lo cambia en toda la web.
- **Usarlo:** para reforzar una etiqueta en menús, botones y filas de dato; como única señal en acciones universales (cerrar, volver, más acciones); para el estado de una pastilla.
- **No usarlo:** como decoración sin significado; sin texto ni etiqueta accesible cuando la acción no es obvia; con relleno o con otro grosor.

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `name` | `nombre` | `IconName` (46 valores, abajo) | — (obligatoria) | |
| `size` | `tamano` | `number` | automático = `--size-icon` (18 escritorio, 20 móvil) | Lado en px |
| `tone` | `tono` | `'current' \| 'text' \| 'secondary' \| 'tertiary' \| 'accent' \| 'ok' \| 'bad'` | `'secondary'` | `current` hereda el color del texto |
| `label` | `etiqueta` | `string` | — | Con etiqueta se anuncia (`role="img"`); sin ella es decorativo (`aria-hidden`) |

## Mapa de nombres (código ↔ diseño ↔ Lucide)
| `name` | Diseño | Lucide | Uso |
|---|---|---|---|
| `today` | hoy | `sun` | Hoy |
| `customers` | clientes | `users` | Clientes |
| `inventory` | inventario | `library` | Inventario |
| `minibooks` | minibooks | `book` | Minibooks |
| `calendar` | calendario | `calendar` | Calendario y fechas |
| `money` | dinero | `banknote` | Dinero y efectivo |
| `stocktake` | hacer-inventario | `clipboard-check` | Hacer inventario |
| `settings` | ajustes | `settings` | Ajustes |
| `admin` | admin | `shield` | Admin |
| `more` | mas | `ellipsis` | Más y más acciones |
| `new-customer` | nuevo-cliente | `user-plus` | Nuevo cliente |
| `add` | agregar | `plus` | Agregar |
| `search` | buscar | `search` | Buscar |
| `filter` | filtro | `list-filter` | Filtrar |
| `sort` | orden | `arrow-up-down` | Ordenar |
| `edit` | editar | `pencil` | Editar |
| `delete` | eliminar | `trash-2` | Eliminar |
| `undo` | deshacer | `undo-2` | Deshacer |
| `call` | llamar | `phone` | Llamar y teléfono |
| `whatsapp` | whatsapp | `message-circle` | WhatsApp |
| `open-page` | abrir-pagina | `maximize-2` | Abrir como página |
| `close` | cerrar | `x` | Cerrar |
| `back` | volver | `chevron-left` | Volver |
| `next` | siguiente | `chevron-right` | Siguiente |
| `expand` | abajo | `chevron-down` | Desplegar |
| `check` | check | `check` | Confirmar |
| `up-down` | arriba-abajo | `chevrons-up-down` | Cambiar de cuenta |
| `window-side` | panel-lateral | `panel-right` | Ventana lateral |
| `window-center` | panel-centro | `app-window` | Ventana centrada |
| `window-page` | pagina | `square` | Ventana como página |
| `scheduled` | por-cobrar | `clock` | Por cobrar, Pagando |
| `collected` | cobrado | `circle-check` | Cobrado, Saldado, Vendido |
| `delivered` | entregado | `check-check` | Entregado |
| `locked` | candado | `lock` | Abibono entregado |
| `alert` | alerta | `triangle-alert` | Vencido, Con novedad |
| `canceled` | cancelado | `circle-slash` | Cancelado |
| `draft` | borrador | `pencil-line` | Borrador |
| `in-stock` | en-fisico | `backpack` | En físico |
| `offline` | sin-conexion | `wifi-off` | Sin conexión |
| `info` | ayuda | `info` | Ayuda e información |
| `books` | libros | `book-open` | Libros y títulos |
| `person` | persona | `user` | Cliente sin foto |
| `transfer` | transferencia | `smartphone` | Transferencia |
| `receipt` | recibo | `receipt` | Recibo |
| `note` | nota | `notebook-pen` | Nota |
| `location` | ubicacion | `map-pin` | Dirección |

## Comportamiento
- **R1.** El ícono DEBE dibujarse con `strokeWidth` 1,8, o 2 cuando `size` ≤ 16, sin relleno y con puntas redondas.
- **R2.** El mapa DEBE estar en un solo archivo (`src/ui/icons/icon-map.ts`). `IconName` es la unión de sus claves, así que un nombre que no existe no compila.
- **R3.** Ningún archivo fuera de `src/ui/icons/` DEBE importar `lucide-react` (regla de HU-UI-01).

## Stories
«Explorar» · Escritorio: «Tamaño automático», «Acento», «Éxito», «Peligro», «16 px», «24 px» · Móvil: «Barra inferior · activo» (22, acento), «Barra inferior · inactivo» (22) · **«Juego completo»** (los 46 en cuadrícula con nombre de código, nombre del diseño, nombre Lucide y uso, agrupados en Navegación, Acciones, Estados y Objetos) · «Matriz».

## Accesibilidad
Decorativo por defecto (`aria-hidden`), porque el texto vecino ya lo nombra. Si va solo, el botón que lo contiene lleva `aria-label`. El color nunca es la única señal.

## No incluye
Íconos propios dibujados a mano ni íconos con relleno. Si Lucide no tiene uno, se discute antes en el diseño.

## Criterios de aceptación
- **CA-1.** **Dado** `<Icon name="money" />`, **entonces** se dibuja el `banknote` de Lucide a 18 px en escritorio y 20 px en móvil, con trazo 1,8.
- **CA-2.** **Dado** `<Icon name="search" size={16} />`, **entonces** el trazo es 2.
- **CA-3.** **Dado** `<Icon name="alert" tone="bad" />` con Tema = Lado a lado, **entonces** el color es `--color-bad` (`#B42318` claro, `#F2877C` oscuro).
- **CA-4.** **Dado** `<Icon name="close" label="Cerrar" />`, **entonces** tiene `role="img"` y nombre accesible «Cerrar»; sin `label` tiene `aria-hidden="true"`.
- **CA-5.** **Dado** la story «Juego completo», **entonces** muestra exactamente 46 íconos y cada uno coincide con su nombre Lucide de la tabla.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
