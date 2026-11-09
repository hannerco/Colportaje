# HU-DIN-03 · Lista de abonos de clientes

> **Épica:** Dinero · **Depende de:** HU-DIN-01 · **Reglas:** BR-DEP-14, BR-PAY-02/08, BR-CUS-09, BR-GEN-14, ADR-0046, AF-47 · **Diseño:** "Dinero · Abonos de clientes · Todos / Por entregar / Entregados", "Por cobrar", "solo Vencidos" (escritorio claro y exploración elegida)

## Historia
**Como** colportor **quiero** ver todos los abonos de mis clientes por estado, filtrarlos por método, buscarlos y ordenarlos **para** saber qué cobrar, qué entregar y qué ya entregué.

## Contexto
- Vistas: **Todos · Por cobrar · Por entregar · Entregados · Cancelados**, cada una con su conteo. **Todos no incluye cancelados**; Cancelados es una quinta pestaña nueva, aún sin diseño (ronda 26, C-17, FD-01).
- Filtro **Método** (Efectivo / Transferencia): oculto en Por cobrar y Cancelados (no tienen método). Ni el filtro ni la búsqueda cambian los totales del resumen.
- La cuota inicial y el abono extra muestran como valor y fecha acordados sus valores **reales** (ronda 26).
- Por cobrar ordena por defecto de la fecha más antigua a la más nueva y tiene el chip **Vencidos**.
- Los abonos de clientes archivados aparecen marcados "(cliente archivado)" (AF-47).

## Alcance
- **Incluye:** el modelo de vista de la lista.
- **No incluye:** cobrar (HU-ABO-06, la fila solo indica `canCollect`), el resumen (HU-DIN-02).

## Contrato para el front
### Lecturas
- `usePaymentsList({ view, method, overdueOnly, search, sort })` →
  `{ counts: { all, toCollect, toDeliver, delivered, canceled }, rows: [{ paymentId, customer: { id, name, avatarEmoji, archived }, kind, status, agreedAmount, agreedDate, paidAt, paidAmount, method, isOverdue, overdueDays, inDraftDeposit, canCollect }] }`
  - `view`: `'all' | 'to_collect' | 'to_deliver' | 'delivered' | 'canceled'`.
  - `sort.key`: `'agreed_date' | 'paid_date' | 'agreed_amount' | 'paid_amount' | 'customer'`. Por defecto `agreed_date` descendente; en `to_collect`, ascendente.
- Dominio `buildPaymentsListView(payments, customers, params, today)`.

## Reglas (el sistema DEBE…)
- **R1.** `all` = por cobrar + cobrados + entregados; `to_collect` = por cobrar; `to_deliver` = cobrados (aunque estén en un borrador); `delivered` = entregados; `canceled` = cancelados. Nunca abonos borrados ni de clientes descartados.
- **R2.** Los conteos NO DEBEN depender del método, la búsqueda ni el chip Vencidos.
- **R3.** `method` DEBE ignorarse en `to_collect` y `canceled`; `overdueOnly` solo aplica en `to_collect`.
- **R4.** `agreedAmount` y `agreedDate` DEBEN venir de `displayAgreed` (HU-ABO-01).
- **R5.** Vacíos al final en todo orden (p. ej. la fecha real de un abono por cobrar); desempate por nombre del cliente y luego id.
- **R6.** `canCollect` DEBE ser verdadero solo en abonos por cobrar.
- **R7.** La búsqueda DEBE encontrar por nombre del cliente (sin tildes ni mayúsculas).

## Criterios de aceptación
- **CA-1.** **Dado** 23 por cobrar, 6 cobrados, 34 entregados y 1 cancelado, **entonces** los conteos son Todos 63, Por cobrar 23, Por entregar 6, Entregados 34, Cancelados 1.
- **CA-2.** **Dado** Por cobrar con abonos del 24/10, 30/10 y 02/11 (vencidos, hoy 05/11) y del 07/11, **entonces** salen en ese orden y los tres primeros con `isOverdue` y "hace 12, 6 y 3 días"; con `overdueOnly`, solo los tres.
- **CA-3.** **Dado** una cuota inicial de 80.000 pagada el 03/10, **entonces** su fila tiene acordado 80.000 el 03/10 y real 80.000 el 03/10.
- **CA-4.** **Dado** Todos con método Efectivo, **entonces** salen solo cobrados y entregados en efectivo (los por cobrar no tienen método) y los conteos no cambian.
- **CA-5.** **Dado** un abono cobrado de un cliente archivado, **entonces** aparece en Por entregar con `customer.archived = true`.
- **CA-6.** **Dado** el orden "fecha real" ascendente en Todos, **entonces** los por cobrar (sin fecha real) quedan al final.

## Casos borde y errores
- Lista vacía: conteos en 0 ("Aún no tienes abonos", front).

## Datos
Sin cambios de esquema.

## Cómo se verifica
- **Dominio:** `buildPaymentsListView` con CA-1 a CA-6.

## Terminado cuando
Se cumple §10 de las reglas comunes.
