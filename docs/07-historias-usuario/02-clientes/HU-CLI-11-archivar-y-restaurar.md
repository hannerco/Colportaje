# HU-CLI-11 · Archivar y restaurar un cliente

> **Épica:** Clientes · **Depende de:** HU-CLI-01, HU-ABO-01 · **Reglas:** BR-CUS-09, BR-PAY-13 (archivar), ADR-0022, AF-47, AF-71 · **Diseño:** sin pantalla (`FALTA-CLIENTES.md` FC-14; "Más acciones: … archivar", pestaña Archivados)

## Historia
**Como** colportor **quiero** archivar a un cliente con quien ya no hay nada pendiente y poder restaurarlo **para** que no estorbe en mis listas sin perder su información.

## Contexto
- Archivar **reemplaza a eliminar** y solo se permite si el cliente **no tiene ejemplares vendidos** (primero se devuelven) (BR-CUS-09).
- Al archivar, sus abonos **programados se cancelan** con motivo `customer_archived` (con confirmación previa en el front). Sus abonos **cobrados** siguen en Dinero con la etiqueta "(cliente archivado)" para entregarlos (AF-47).
- **Al restaurar, los cancelados siguen cancelados** (ronda 26).

## Alcance
- **Incluye:** vista previa de lo que pasará, archivar, restaurar.
- **No incluye:** descartar un cliente nuevo (HU-CLI-03).

## Contrato para el front
### Lecturas
- `getArchivePreview(customerId)` → `{ canArchive, soldCount, scheduledToCancel: [{ paymentId, dueDate, agreedAmount }] }`.
### Acciones
- `archiveCustomer(customerId)` → `Result<void>` · errores: `CUSTOMER_HAS_BOOKS`, `OFFLINE`.
- `restoreCustomer(customerId)` → `Result<void>` · errores: `CUSTOMER_NOT_ARCHIVED`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** CUANDO el cliente tiene ejemplares vendidos, DEBE rechazar con `CUSTOMER_HAS_BOOKS`.
- **R2.** Archivar DEBE, en una transacción, cancelar todos sus abonos programados (`canceled`, `canceled_at`, motivo `customer_archived`, evento `canceled`), fijar `archived_at` y actualizar `updated_at`.
- **R3.** Archivar NO DEBE tocar los abonos cobrados o entregados.
- **R4.** Restaurar DEBE quitar `archived_at` y NO DEBE revivir los cancelados.
- **R5.** Un cliente archivado NO DEBE aparecer en las pestañas Todos, Deudores y Saldados ni en la búsqueda normal (sí en Archivados y en "Buscar en Archivados").

## Criterios de aceptación
- **CA-1.** **Dado** un cliente con un libro vendido, **cuando** se archiva, **entonces** `CUSTOMER_HAS_BOOKS`.
- **CA-2.** **Dado** un prospecto con 2 programados y un abono cobrado de 30.000 sin entregar, **cuando** se archiva, **entonces** los 2 programados quedan cancelados con motivo `customer_archived`, el cobrado sigue "por entregar" en Dinero marcado como de cliente archivado, y el cliente sale de Todos.
- **CA-3.** **Dado** ese cliente archivado, **cuando** se restaura, **entonces** vuelve a las listas y sus 2 abonos siguen cancelados.
- **CA-4.** **Dado** un cliente no archivado, **cuando** se restaura, **entonces** `CUSTOMER_NOT_ARCHIVED`.

## Casos borde y errores
- Archivar un cliente con saldo a favor se permite (no tiene libros vendidos).

## Datos
Funciones SQL `archive_customer` y `restore_customer`.

## Cómo se verifica
- **Integración:** CA-1 a CA-4.

## Terminado cuando
Se cumple §10 de las reglas comunes.
