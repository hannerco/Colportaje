# HU-CLI-12 · Ficha del cliente (consulta completa)

> **Épica:** Clientes · **Depende de:** HU-CLI-02..11, HU-ABO-02..07 · **Reglas:** BR-CUS-04/06/10/12/13/15/17, BR-PAY-06/08/13/14, BR-GEN-08 · **Diseño:** "Ficha · centrada / lateral / página completa" (escritorio claro); Crear cliente usa la misma lectura

## Historia
**Como** colportor **quiero** abrir la ficha de un cliente y ver de un vistazo sus datos, libros, abonos, saldo, facturas, fotos y avisos **para** atenderlo o cobrarle sin buscar en varios lugares.

## Contexto
- Es **una sola lectura** que reúne todo lo de las demás HU de la épica, lista para pintar. La misma sirve para crear (ficha viva) y para un cliente guardado.
- El diseño no muestra el saldo sin programar, las fechas de venta ni el saldo a favor (FC-07, FC-08), y solo pone "Cobrar" en el abono vencido (C-08): la lectura trae todo y marca `canCollect` en **todo** abono por cobrar.
- La preferencia Centrada / Lateral / Página completa se guarda en el dispositivo (FT-04); no es parte de esta HU.

## Alcance
- **Incluye:** la lectura completa de la ficha con indicadores de acciones.
- **No incluye:** las acciones (cada una en su HU), visitas (módulo Calendario: la lectura no trae visitas por ahora).

## Contrato para el front
### Lecturas
- `useCustomerDetail(customerId)` →

```text
{
  id, name, avatarEmoji, archived, createdAt,
  contact: { phone, telLink, whatsappLink },             // null si no hay teléfono
  account: CustomerAccount,                               // HU-CLI-01 (saldo, deuda, abonado %, saldo a favor, sin programar, estado…)
  customerSince, firstSaleAt, lastSaleAt,
  books: [{ copyId, titleName, number, agreedPrice, publicPriceSnapshot, priceDelta }],   // por fecha de venta
  payments: [PaymentRow],                                 // no cancelados, por fecha (real si cobrado, acordada si por cobrar), ascendente
  canceledPayments: [PaymentRow],                         // sección plegable "Cancelados"
  notices: { noBook, excess: { amount } | null },         // franjas BR-PAY-14 y BR-PAY-13
  address, info, mapsUrl,
  location: { latitude, longitude, accuracyMeters, isApproximate } | null,
  mapsLink,                                               // HU-CLI-06
  infoPhotos: [{ photoId, thumbUrl }],
  invoices: [ … ]                                         // HU-CLI-08
}
PaymentRow = { paymentId, kind, status, agreedAmount, dueDate, originalDueDate (si difiere), paidAmount, paidAt, method,
               isOverdue, overdueDays, rescheduleCount, deposit: { id, status } | null,
               can: { collect, edit, delete, reschedule, correctDate, cancel } }
```

## Reglas (el sistema DEBE…)
- **R1.** `telLink` DEBE ser `tel:<dígitos>`; `whatsappLink` DEBE ser `https://wa.me/57<10 dígitos>` cuando el teléfono tiene 10 dígitos, o `https://wa.me/<dígitos>` si ya trae el indicativo; ambos `null` sin teléfono (BR-CUS-12, AF-73).
- **R2.** `can.collect` DEBE ser verdadero en **todo** abono por cobrar (vencido o no) de un cliente no archivado (BR-PAY-05).
- **R3.** `can.edit` y `can.delete` DEBEN ser falsos en abonos entregados de un Abibono confirmado (BR-PAY-10) y en cancelados; `can.reschedule` solo en por cobrar; `can.correctDate` lo decide el front según la creación (aquí es igual a `reschedule`).
- **R4.** `originalDueDate` DEBE venir solo si una prórroga cambió la fecha (el front la muestra tachada).
- **R5.** Los avisos DEBEN derivarse de la cuenta (HU-CLI-01); "Dejar como está" no guarda nada: la franja persiste mientras haya sobrante.

## Criterios de aceptación
- **CA-1.** **Dado** María Camila Henao (3 libros por 460.000, cuota inicial de 80.000 por transferencia el 03/10, abonos de 60.000 el 17/10 vencido, 31/10 y 14/11, un cancelado), **cuando** se abre la ficha el 05/11, **entonces** saldo 380.000, abonado 80.000, deuda 460.000, 4 abonos activos en orden de fecha con el del 17/10 `isOverdue`, `canCollect` en los tres por cobrar y 1 en `canceledPayments`.
- **CA-2.** **Dado** el teléfono "301 557 9032", **entonces** `telLink = "tel:3015579032"` y `whatsappLink = "https://wa.me/573015579032"`.
- **CA-3.** **Dado** un abono prorrogado del 17/10 al 31/10, **entonces** `dueDate = 31/10`, `originalDueDate = 17/10` y `rescheduleCount = 1`.
- **CA-4.** **Dado** un abono en un Abibono confirmado, **entonces** `can.edit = false`, `can.delete = false` y `deposit.status = 'confirmed'`.
- **CA-5.** **Dado** un cliente sin libros y con una cuota cobrada, **entonces** `notices.noBook = true`.
- **CA-6.** **Dado** sin conexión, **cuando** se abre una ficha ya consultada, **entonces** se lee de la caché.

## Casos borde y errores
- Cliente descartado o inexistente: `NOT_FOUND`.

## Datos
Sin cambios de esquema.

## Cómo se verifica
- **Dominio:** armado de la ficha a partir de cliente, ejemplares, abonos, facturas y fotos (CA-1 a CA-5).

## Terminado cuando
Se cumple §10 de las reglas comunes.
