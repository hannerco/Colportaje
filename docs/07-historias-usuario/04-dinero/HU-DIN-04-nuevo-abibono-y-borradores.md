# HU-DIN-04 · Nuevo Abibono precargado y borradores

> **Épica:** Dinero · **Depende de:** HU-DIN-01 · **Reglas:** BR-DEP-02/03/04/08/10/13, BR-PAY-11, BR-GEN-02, AF-43, AF-45, AF-106, AF-115 · **Diseño:** "Dinero · Nuevo Abibono · precargado, sin recibo", "con diferencia, nota obligatoria" (botones "Guardar borrador" y "Confirmar")

## Historia
**Como** colportor **quiero** que al tocar "Entregar al líder" se arme el Abibono con todo lo que tengo cobrado, poder ajustarlo y guardarlo como borrador **para** no tener que buscar abono por abono.

## Contexto
- "Entregar al líder" abre **Nuevo Abibono precargado**: todos los abonos cobrados que **no** están en otro Abibono quedan marcados; efectivo y transferencia se calculan solos; nombre sugerido «Abibono (n)» y fecha automáticos y editables (BR-DEP-02/03/13); un borrador no consume número.
- **No se crea nada hasta guardar** (AF-106). "Guardar borrador" lo guarda como borrador; "Confirmar" es HU-DIN-05.
- El usuario puede **editar** efectivo y transferencia (lo realmente entregado); el diseño muestra "Calculado $X · Restaurar" para volver al cálculo.
- Un borrador se puede editar o **borrar**; borrarlo es la **única** eliminación física (BR-DEP-10, BR-GEN-02): los abonos quedan libres y sus fotos de recibo se eliminan.
- La sección Minibooks del diseño queda **oculta** hasta el módulo Minibooks (FD-10).

## Alcance
- **Incluye:** la propuesta precargada; recálculo al marcar y desmarcar; guardar y actualizar un borrador; agregar y borrar fotos de recibo de un borrador; leer un Abibono; borrar un borrador.
- **No incluye:** confirmar (HU-DIN-05), reabrir (HU-DIN-07), dinero de minibooks.

## Contrato para el front
### Lecturas
- `useNewDepositProposal()` → `{ depositId (nuevo), title: null, displayTitle ("Abibono (n)", n = siguiente número libre), depositDate, available: [{ paymentId, customerName, paidAt, method, paidAmount }], selectedIds (todos), cash, transfer, expected }` (sin guardar nada; `available` ordenados por fecha real descendente).
- `useDeposit(depositId)` → `{ id, title, displayTitle, depositNumber, depositDate, status, cash, transfer, note, payments: [...], receipts: [{ photoId, thumbUrl }], summary: { total, expected, difference }, calculated: { cash, transfer }, can: { edit, confirm, reopen, delete } }`.
- Dominio `recalcProposal(selected)` → `{ cash, transfer, expected }`.
### Acciones
- `saveDepositDraft({ depositId, title (string | null; null o vacío = nombre automático), depositDate, paymentIds, cash, transfer, note, stagedReceipts })` → `Result<{ depositId }>` · errores: `PAYMENT_NOT_AVAILABLE` (`details.paymentIds`), `DEPOSIT_NOT_DRAFT`, `VALIDATION`, `OFFLINE`. Idempotente por `depositId`.
- `addDepositReceipt({ depositId, photoId, file })` → `Result<{ staged: StagedReceipt | null }>` (comprime y sube, HU-BASE-05). Si el Abibono **ya existe** (borrador o confirmado), crea la fila de la foto de inmediato y `staged = null`. Si **aún no existe** (propuesta sin guardar), **solo sube** el archivo y devuelve `StagedReceipt = { photoId, path, thumbPath, bytes }`, que se envía al guardar o al confirmar; así no se crea ningún borrador antes de tiempo (BR-DEP-13).
- `deleteDepositReceipt(photoId)` → `Result<void>` · errores: `RECEIPT_LOCKED` (Abibono confirmado).
- `deleteDepositDraft(depositId)` → `Result<void>` · errores: `DEPOSIT_NOT_DRAFT`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** La propuesta DEBE incluir solo abonos `collected` sin Abibono (BR-DEP-08, AF-106) y NO DEBE escribir en la base.
- **R2.** Guardar un borrador DEBE vincular los abonos marcados (que deben seguir `collected` y libres o ya ser de este borrador) y desvincular los desmarcados, en una transacción.
- **R3.** Efectivo y transferencia DEBEN guardarse tal como los escribió el usuario (enteros ≥ 0); `calculated` siempre se recalcula a partir de los abonos.
- **R4.** El título y la fecha DEBEN poder editarse mientras sea borrador.
- **R5.** Borrar un borrador DEBE eliminar físicamente el Abibono y sus fotos de recibo (filas y archivos) y dejar libres sus abonos.
- **R6.** Las fotos de recibo de un borrador se pueden borrar (lógico); las de uno confirmado, no (BR-PHO-03).
- **R7.** Subir un recibo a una propuesta sin guardar NO DEBE crear filas en la base; si el usuario cierra sin guardar, el archivo subido queda sin usar (ver `INTERPRETACIONES.md`).

## Criterios de aceptación
- **CA-1.** **Dado** cobrados libres de 40.000 (E), 60.000 (T), 85.000 (E), 105.000 (E) y 45.000 (T), y uno de 50.000 en otro borrador, **cuando** se pide la propuesta el 05/11, **entonces** trae los 5 libres marcados, efectivo 230.000, transferencia 105.000, esperado 335.000, nombre «Abibono (1)» (el otro borrador no consume número), y no existe ningún Abibono nuevo en la base.
- **CA-2.** **Dado** esa propuesta, **cuando** se desmarca el de 60.000 (T), **entonces** transferencia 45.000 y esperado 275.000 sin recargar (RQ-DEP-08).
- **CA-3.** **Dado** que se guarda como borrador, **entonces** existe un Abibono `draft` y los 4 abonos marcados quedan vinculados y siguen "por entregar".
- **CA-4.** **Dado** un borrador con efectivo escrito a mano 231.000 (calculado 236.000), **cuando** se lee, **entonces** `cash = 231.000` y `calculated.cash = 236.000`.
- **CA-5.** **Dado** un borrador, **cuando** se borra, **entonces** desaparece, sus abonos vuelven a estar disponibles para otra propuesta y sus fotos no existen (AF-43).
- **CA-6.** **Dado** que otro dispositivo vinculó un abono a otro Abibono, **cuando** se guarda este borrador con él, **entonces** `PAYMENT_NOT_AVAILABLE` y nada cambia.

## Casos borde y errores
- Sin cobros libres: la propuesta viene vacía; igual se puede guardar un borrador sin abonos (donación, BR-DEP-07).

## Datos
Funciones SQL `save_deposit_draft(p_deposit jsonb)` y `delete_deposit_draft(p_deposit_id)` (esta borra también los archivos de Storage de sus recibos, vía servicio de almacenamiento).

## Cómo se verifica
- **Dominio:** `recalcProposal`.
- **Integración:** CA-1 a CA-6.

## Terminado cuando
Se cumple §10 de las reglas comunes.
