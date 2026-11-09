# HU-CLI-08 · Facturas

> **Épica:** Clientes · **Depende de:** HU-CLI-02, HU-BASE-05 · **Reglas:** BR-CUS-17, BR-PHO-03, ADR-0042, AF-117 · **Diseño:** sección "Factura" de Crear y "Factura" en la ficha. El diseño deja escribir N.º y fecha sin foto (C-10); manda la regla

## Historia
**Como** colportor **quiero** guardar la foto de la factura que le hice al cliente, con su número y fecha si quiero **para** tener la prueba de la venta a mano.

## Contexto
- **Lo principal es la foto: no hay factura sin foto** (ronda 26). N.º y fecha son un agregado opcional que solo se puede escribir cuando ya existe la factura.
- Una factura puede tener **varias fotos** (frente y reverso) y un cliente puede tener **varias facturas** (si compra dos veces). Se dejó como entidad para un futuro "Ver facturas" (ADR-0042).
- Una foto equivocada se **borra** y se sube la correcta; al borrar la última foto, la factura se borra con ella.

## Alcance
- **Incluye:** crear una factura con su primera foto; agregar fotos; editar N.º y fecha; borrar fotos; listar facturas.
- **No incluye:** "Ver facturas" de todos los clientes (backlog).

## Contrato para el front
### Lecturas
- `useCustomerInvoices(customerId)` → `[{ invoiceId, number | null, date | null, photos: [{ photoId, thumbUrl }] }]` ordenadas por fecha descendente (sin fecha al final) y luego por creación.
### Acciones
- `createInvoiceWithPhoto({ invoiceId, photoId, customerId, file })` → `Result<{ invoiceId }>`: comprime y sube; luego crea factura (fecha = hoy en Bogotá) y foto en una transacción · errores: `IMAGE_UNREADABLE`, `CUSTOMER_ARCHIVED`, `NETWORK_ERROR`, `OFFLINE`.
- `addInvoicePhoto({ invoiceId, photoId, file })` → `Result<void>`.
- `updateInvoice(invoiceId, { number?, date? })` → `Result<void>` · errores: `VALIDATION` (fecha inválida), `NOT_FOUND`.
- `deleteInvoicePhoto(photoId)` → `Result<{ invoiceDeleted: boolean }>`.

## Reglas (el sistema DEBE…)
- **R1.** Una factura DEBE nacer en la misma transacción que su primera foto; NO DEBE existir una factura activa sin fotos activas (BR-CUS-17).
- **R2.** La fecha DEBE llenarse sola con el día (Bogotá) en que se sube la primera foto y DEBE poder editarse o vaciarse.
- **R3.** N.º y fecha NO DEBEN validarse contra otras facturas (pueden repetirse).
- **R4.** Borrar una foto de factura DEBE permitirse siempre (lógico); CUANDO es la última, la factura DEBE borrarse en la misma transacción (BR-PHO-03).
- **R5.** Toda acción DEBE actualizar `updated_at` del cliente.

## Criterios de aceptación
- **CA-1.** **Dado** un cliente sin facturas y hoy 03/11/2026, **cuando** sube la foto de una factura, **entonces** existe una factura con fecha 03/11/2026, sin número y con 1 foto.
- **CA-2.** **Dado** esa factura, **cuando** se escribe el N.º "0123", **entonces** queda guardado.
- **CA-3.** **Dado** esa factura, **cuando** se agrega una segunda foto, **entonces** la factura tiene 2 fotos.
- **CA-4.** **Dado** una factura con 1 foto, **cuando** se borra la foto, **entonces** `invoiceDeleted = true` y la factura ya no aparece.
- **CA-5.** **Dado** dos facturas con el mismo N.º "0123", **cuando** se guardan, **entonces** no hay error.
- **CA-6.** **Dado** un intento de insertar una factura sin foto directamente por la API, **entonces** falla (la creación solo existe junto con la foto).

## Casos borde y errores
- Si la subida de la primera foto falla, no se crea la factura.

## Datos
Tabla `customer_invoice` (DATABASE.md) con RLS; migración aditiva `photo.invoice_id` y el check "`customer_invoice` exige `customer_id` e `invoice_id`" (HU-BASE-05 R5). Funciones SQL `create_invoice_with_photo` y `delete_invoice_photo`. La inserción directa en `customer_invoice` se bloquea para el cliente (solo por la función).

## Cómo se verifica
- **Integración:** CA-1 a CA-6.

## Terminado cuando
Se cumple §10 de las reglas comunes.
