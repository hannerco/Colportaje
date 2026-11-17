# HU-UI-05 · Pastilla de estado

> **Iteración 1** · **Nivel:** átomo · **Código:** `StatusPill` en `src/ui/atoms/StatusPill/` · **Storybook:** `Átomos/Pastilla de estado` · **Depende de:** HU-UI-03 · **Diseño:** ficha `Lib-Pastilla`, fuente `Pastilla.dc.html` · **Reglas:** BR-CUS-13, GLOSSARY «Estados», ADR-0040, ADR-0046

## Historia
**Como** colportor **quiero** ver el estado de un abono, un Abibono, un cliente o un ejemplar con la misma pastilla en todos los módulos **para** entenderlo aunque no distinga el color.

## Qué es (de la ficha)
Muestra en qué estado está un registro. Siempre combina ícono, color y palabra.
- **Usarlo:**
  - en la última columna de tablas y en el encabezado de un detalle;
  - en forma «texto» en filas móviles;
  - «bloqueado» (candado) cuando el registro ya no se puede editar.
- **No usarlo:**
  - como botón o filtro (Chip);
  - para números o fechas (Etiqueta);
  - con estados inventados.

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `status` | `estado` | `PillStatus` (tabla abajo) | — (obligatoria) | Define palabra, ícono y color |
| `shape` | `forma` | `'pill' \| 'text'` | `'pill'` | `text` quita borde y fondo (filas móviles) |
| `locked` | `bloqueado` | `boolean` | `false` | Cambia el ícono por `locked` (Abibono entregado) |
| `label` | `texto` | `string` | palabra del estado (de `copy/es.ts`) | Reemplaza la palabra, p. ej. «Debe» en la lista móvil de clientes |

## Estados
| `status` | Diseño | Palabra | Tono | Ícono | Código de dominio |
|---|---|---|---|---|---|
| `scheduled` | por-cobrar | Por cobrar | neutro | `scheduled` | `payment.scheduled` |
| `overdue` | vencido | Vencido | malo | `alert` | abono vencido / cliente `overdue` |
| `collected` | cobrado | Cobrado | bueno | `collected` | `payment.collected` |
| `delivered` | entregado | Entregado | acento | `delivered` | `payment.delivered` / Abibono confirmado |
| `canceled` | cancelado | Cancelado | neutro | `canceled` | `payment.canceled` |
| `draft` | borrador | Borrador | borrador (borde punteado) | `draft` | `leader_deposit.draft` |
| `current` | pagando | Pagando | neutro | `scheduled` | cliente `current` |
| `settled` | saldado | Saldado | bueno | `collected` | cliente `settled` |
| `in_stock` | en-fisico | En físico | neutro | `in-stock` | `copy.in_stock` |
| `sold` | vendido | Vendido | bueno | `collected` | `copy.sold` |
| `flagged` | con-novedad | Con novedad | malo | `alert` | `copy.flagged` |

Tonos (forma píldora):

| Tono | Borde | Fondo | Texto | Ícono |
|---|---|---|---|---|
| Neutro | `neutral-border` | transparente | `text-2` | `text-3` |
| Malo | `bad-border` | `bad-bg` | `bad` | `bad` |
| Bueno | `ok-border` | `ok-bg` | `ok` | `ok` |
| Acento | `accent-border` | `accent-bg` | `accent-text` | `accent-text` |
| Borrador | `neutral-border` punteado | transparente | `text-2` | `text-3` |

## Comportamiento
- **R1.** Píldora: alto 28 en escritorio y 30 en móvil, relleno 0 10 0 8, separación 6, ícono de 15 con trazo 2, texto `--text-secondary` en peso 500.
- **R2.** Forma `text`: sin borde ni fondo, texto `--text-caption` en `text-3`, ícono de 14 en `text-3` (neutro y borrador) o en el color del tono (malo, bueno, acento).
- **R3.** Las palabras salen de `copy/es.ts` (`copy.status.<status>`) y son **exactamente** las del glosario.
- **R4.** `PillStatus` es un tipo cerrado. Agregar un estado exige agregarlo antes en la ficha del diseño.

## Stories
«Explorar» · Escritorio: «Por cobrar», «Vencido», «Cobrado», «Entregado», «Entregado · bloqueado», «Borrador», «Cancelado», «Pagando», «Saldado», «En físico», «Vendido», «Con novedad» · Móvil: «Vencido», «Cobrado», «Entregado», «Forma texto · cliente» (vencido, «Debe»), «Forma texto · abono» (por cobrar), «Forma texto · ejemplar» (vendido) · «Matriz».

## Accesibilidad
El texto siempre está presente: el color es apoyo. Contraste ≥ 4,5:1 sobre su fondo suave. No es interactiva: no recibe foco. El ícono es decorativo.

## No incluye
Frases largas («Vencido hace 3 días» va en una Franja).

## Criterios de aceptación
- **CA-1.** **Dado** `status="overdue"`, **entonces** dice «Vencido» con el ícono `alert` en `--color-bad`, borde `bad-border` y fondo `bad-bg`.
- **CA-2.** **Dado** `status="delivered" locked`, **entonces** dice «Entregado» con ícono de candado.
- **CA-3.** **Dado** `status="draft"`, **entonces** el borde es punteado.
- **CA-4.** **Dado** `status="overdue" shape="text" label="Debe"`, **entonces** se ve «Debe» sin borde ni fondo, en tamaño leyenda, con el ícono rojo.
- **CA-5.** **Dado** la story «Matriz», **entonces** los 11 estados se ven en claro y oscuro, escritorio y móvil, sin violaciones de contraste.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
