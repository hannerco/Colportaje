# HU-CLI-01 · Cliente: modelo y cuenta derivada

> **Épica:** Clientes · **Depende de:** HU-BASE-02 · **Reglas:** BR-CUS-01..04/06/13/16, BR-PAY-08/13/14, BR-GEN-03, ADR-0005, ADR-0006, ADR-0033 · **Diseño:** tarjeta de saldo de la ficha ("Saldo pendiente", "Abonado", "Deuda total", barra), estado en la lista

## Historia
**Como** colportor **quiero** que la app calcule sola la deuda, lo abonado, el saldo, el saldo a favor y el estado de cada cliente **para** no hacer cuentas a mano ni equivocarme.

## Contexto
- No hay entidad "Venta": el **cliente es el agregado** (BR-CUS-03). Todo lo que se ve de su cuenta se **deriva** de sus ejemplares vendidos y sus abonos; nada se guarda (BR-GEN-03).
- El canje de saldo a favor por minibooks llega con su módulo (ADR-0041): `creditApplied` existe en la fórmula pero hoy vale 0 (la función recibe la lista, vacía).
- Signo del saldo a favor: `balance = debt − paidTotal + creditApplied` (ADR-0033).

## Alcance
- **Incluye:** tabla `customer` con checks y RLS; función pura que calcula la cuenta de un cliente; definición de "vencido".
- **No incluye:** crear y editar clientes (HU-CLI-02), listas (HU-CLI-04), abonos (épica Abonos).

## Contrato para el resto del código
- `computeCustomerAccount({ customer, soldCopies, payments, creditEntries = [] }, today)` → `CustomerAccount`:

| Campo | Definición |
|---|---|
| `debt` | Σ precio acordado de sus ejemplares vendidos |
| `paidTotal` | Σ valor real de sus abonos cobrados o entregados (incluye cuota inicial y extra) |
| `creditApplied` | Σ montos de canje por saldo a favor (hoy 0) |
| `balance` | `debt − paidTotal + creditApplied` |
| `credit` | `max(0, −balance)` (saldo a favor) |
| `remaining` | `max(0, balance)` |
| `scheduledTotal` | Σ valor acordado de sus abonos por cobrar (no cancelados ni borrados) |
| `unscheduled` | `max(0, remaining − scheduledTotal)` |
| `excess` | `scheduledTotal − remaining` cuando es > 0; si no, 0 |
| `isProspect` | no tiene ejemplares vendidos |
| `standing` | `null` si es prospecto; `settled` si `balance ≤ 0`; `overdue` si algún abono por cobrar está vencido; si no, `current` |
| `paidPct` | `paidTotal ÷ debt` en entero 0–100 (redondeo hacia abajo, tope 100); 0 si `debt = 0` |
| `firstSaleAt` / `lastSaleAt` | mín. y máx. fecha de venta |
| `customerSince` | `firstSaleAt` (como fecha de Bogotá) o, si es prospecto, la fecha de creación |
| `lastPaymentAt` | máx. fecha real de sus abonos cobrados o entregados; `null` si no hay |
| `nextDueDate` | mín. fecha acordada de sus abonos por cobrar, incluidos vencidos; `null` si no hay |
| `hasOverdue` | algún abono por cobrar vencido |
| `notices` | `{ noBook: tiene abonos (por cobrar, cobrados o entregados) y es prospecto; excess: excess > 0 }` (BR-PAY-14, BR-PAY-13) |

- `isOverdue(payment, today)` = por cobrar y `dueDate < today` (BR-PAY-08). `overdueDays(payment, today)`.

## Reglas (el sistema DEBE…)
- **R1.** Ningún valor de la tabla DEBE guardarse en la base como campo editable (BR-GEN-03).
- **R2.** Los abonos cancelados y los borrados NO DEBEN contar en ningún valor.
- **R3.** "Saldado" DEBE ganar a "Vencido": con saldo ≤ 0 el estado es `settled` aunque quede un abono vencido (BR-CUS-13).
- **R4.** El cálculo DEBE ser puro y determinista; `today` se inyecta.
- **R5.** La tabla `customer` DEBE validar: nombre no vacío; latitud −90..90, longitud −180..180, ambas o ninguna; precisión ≥ 0.

## Criterios de aceptación
- **CA-1.** **Dado** un libro de 180.000 y una cuota inicial cobrada de 40.000, **entonces** `debt` 180.000, `paidTotal` 40.000, `balance` 140.000, `paidPct` 22, `standing` `current`.
- **CA-2.** **Dado** ese cliente con 4 abonos programados de 35.000, **entonces** `scheduledTotal` 140.000, `unscheduled` 0, `excess` 0.
- **CA-3.** **Dado** un libro de 50.000 devuelto y 30.000 cobrados (AF-02), **entonces** `debt` 0, `balance` −30.000, `credit` 30.000, `isProspect` true, `standing` null.
- **CA-4.** **Dado** saldo 20.000 y programados 40.000, **entonces** `excess` 20.000 y `notices.excess` true.
- **CA-5.** **Dado** saldo 0 y un abono programado vencido, **entonces** `standing` `settled`.
- **CA-6.** **Dado** saldo 60.000 y un abono por cobrar con fecha de ayer, **entonces** `standing` `overdue`, `hasOverdue` true, `nextDueDate` = ayer.
- **CA-7.** **Dado** un cliente sin libros con un abono programado, **entonces** `notices.noBook` true.
- **CA-8.** **Dado** un prospecto creado el 24/09 que compra su primer libro el 03/10, **entonces** `customerSince` = 03/10.
- **CA-9.** **Dado** abonos cobrados el 01/10 (cuota inicial) y el 22/10, **entonces** `lastPaymentAt` = 22/10.

## Casos borde y errores
- Cliente archivado sin libros: es prospecto, sin estado.
- Propiedad: reordenar los abonos no cambia ningún valor (prueba con `fast-check`).

## Datos
Tabla `customer` de DATABASE.md (incluye `avatar_emoji`, `maps_url`, coordenadas, `archived_at`).

## Cómo se verifica
- **Dominio:** CA-1 a CA-9 y propiedades (`balance = debt − paidTotal + creditApplied`; `credit` y `remaining` nunca negativos).
- **Integración:** checks de `customer` y RLS A/B.

## Terminado cuando
Se cumple §10 de las reglas comunes.
