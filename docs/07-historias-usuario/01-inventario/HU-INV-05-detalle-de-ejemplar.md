# HU-INV-05 · Detalle de un ejemplar, historial y fecha de recibido

> **Épica:** Inventario · **Depende de:** HU-INV-01, HU-CLI-01 · **Reglas:** BR-COPY-04, BR-COPY-11/16/17, BR-AUD-01, F-08 · **Diseño:** "Inventario · Ejemplar · vendido", "en físico", "acciones", "devuelto al líder (deshacer)" (escritorio claro); "Recibido el" editable en móvil

## Historia
**Como** colportor **quiero** abrir un ejemplar y ver su estado, cliente, precios, fechas e historial, y corregir su fecha de recibido **para** entender qué pasó con esa unidad y arreglar un registro tardío.

## Contexto
- La fecha de recibido se cambia **pocas veces** (por eso es discreta en el diseño): sirve cuando el día que llegaron los libros no hubo señal (BR-COPY-04).
- El detalle también dice qué acciones están permitidas; así el front solo muestra lo que se puede hacer.

## Alcance
- **Incluye:** lectura del detalle con historial legible e indicadores de acciones; cambiar la fecha de recibido.
- **No incluye:** las acciones mismas (precio acordado HU-INV-06, novedad HU-INV-07, eliminar HU-INV-08, devolver al líder HU-INV-09, devolver de un cliente HU-CLI-10).

## Contrato para el front
### Lecturas
- `useCopyDetail(copyId)` →
  `{ copyId, titleName, imageUrl, category, number, status, customer: { id, name, avatarEmoji } | null, agreedPrice | null, publicPriceSnapshot | null, priceDelta | null, soldAt | null, receivedAt, openIssue: { note, createdAt } | null, history: [HistoryItem], can: { editAgreedPrice, restorePublicPrice, editReceivedAt, flag, delete, returnFromCustomer } }`
  - `HistoryItem = { eventId, type, at, note | null, data, undo: 'none' | 'returned_to_leader' | 'resolution' }`. Solo el evento **más reciente** que se puede deshacer lleva `undo ≠ 'none'`: un "Devuelto al líder" vigente, o una resolución "Apareció" (si el ejemplar sigue en físico) o "Perdido" (si sigue perdido).
### Acciones
- `updateReceivedDate(copyId, date)` → `Result<void>` · errores: `DATE_IN_FUTURE`, `DATE_AFTER_SALE`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** La fecha de recibido NO DEBE ser posterior a hoy ni posterior al día de la venta (BR-COPY-04).
- **R2.** Cambiar la fecha DEBE registrar `received_date_changed` con la fecha anterior y la nueva.
- **R3.** Los indicadores `can` DEBEN salir de la misma tabla de transiciones del dominio (HU-INV-01): `editAgreedPrice` y `returnFromCustomer` solo si está vendido y no es minibook; `flag` solo en físico; `delete` en físico o con novedad; `editReceivedAt` siempre que no esté borrado.
- **R4.** Si el ejemplar está vendido, cambiar su fecha de recibido NO DEBE cambiar nada del cliente.

## Criterios de aceptación
- **CA-1.** **Dado** "Psiconutrición #6" vendido el 02/11 a 93.000 (público 98.000), **cuando** se abre, **entonces** muestra cliente María Camila Henao, acordado 93.000, diferencia −5.000, vendido 02/11/2026, recibido 20/10/2026, y el historial en orden: "Precio acordado 93.000" (02/11), "Vendido a María Camila Henao" (02/11), "Recibido" (20/10).
- **CA-2.** **Dado** un ejemplar vendido el 02/11, **cuando** se cambia su recibido al 03/11, **entonces** `DATE_AFTER_SALE`; **cuando** se cambia al 28/10, **entonces** se guarda y aparece en el historial.
- **CA-3.** **Dado** "El camino a Cristo #2" devuelto al líder el 03/11 con nota "Fin de campaña", **cuando** se abre, **entonces** ese evento lleva `undo = 'returned_to_leader'`.
- **CA-4.** **Dado** un ejemplar en físico, **cuando** se abre, **entonces** `can.flag = true`, `can.delete = true`, `can.editAgreedPrice = false`.

## Casos borde y errores
- Un ejemplar borrado devuelve `NOT_FOUND` (salvo durante su "Deshacer", HU-INV-08, que no usa esta lectura).

## Datos
Sin cambios de esquema; usa `copy_event`.

## Cómo se verifica
- **Dominio:** armado del historial e indicadores `undo` y `can`.
- **Integración:** CA-2 contra la base (el trigger también valida las fechas).

## Terminado cuando
Se cumple §10 de las reglas comunes.
