# HU-CLI-07 · Fotos de información del cliente

> **Épica:** Clientes · **Depende de:** HU-CLI-02, HU-BASE-05 · **Reglas:** BR-CUS-01, BR-PHO-01/03, BR-CUS-16 · **Diseño:** "Fotos de la casa" (Crear) y "Fotos" (Ficha) — nombre por unificar (C-11)

## Historia
**Como** colportor **quiero** guardar fotos de la casa del cliente u otras referencias **para** reconocer el lugar cuando vuelva a cobrar.

## Contexto
- Son fotos de tipo `customer_info`, opcionales; se pueden **borrar siempre** (BR-PHO-03).
- La compresión y el almacenamiento genérico vienen de HU-BASE-05.

## Alcance
- **Incluye:** agregar, listar y borrar fotos de información.
- **No incluye:** fotos de factura (HU-CLI-08), foto de perfil (backlog).

## Contrato para el front
### Lecturas
- `useCustomerInfoPhotos(customerId)` → `[{ photoId, thumbUrl, createdAt }]` (más reciente primero); `getPhotoUrl(photoId)` → URL firmada de la imagen completa.
### Acciones
- `addCustomerInfoPhoto({ photoId, customerId, file })` → `Result<{ photoId }>` · errores: `IMAGE_UNREADABLE`, `CUSTOMER_ARCHIVED`, `NETWORK_ERROR`, `OFFLINE`.
- `deleteCustomerInfoPhoto(photoId)` → `Result<void>`.

## Reglas (el sistema DEBE…)
- **R1.** Agregar DEBE comprimir, subir y solo entonces crear la fila `photo` (`kind = customer_info`) (HU-BASE-05).
- **R2.** Borrar DEBE ser lógico y permitido siempre.
- **R3.** Agregar y borrar DEBEN actualizar `updated_at` del cliente.

## Criterios de aceptación
- **CA-1.** **Dado** un cliente sin fotos, **cuando** se agrega una, **entonces** aparece en la lista con su miniatura.
- **CA-2.** **Dado** esa foto, **cuando** se borra, **entonces** ya no aparece y la fila tiene `deleted_at`.
- **CA-3.** **Dado** que la subida falla, **cuando** termina, **entonces** no hay foto nueva y el error es reintentable con el mismo `photoId`.

## Casos borde y errores
- Sin conexión: `OFFLINE`.

## Datos
Migración aditiva: `photo.customer_id` (FK a `customer`) y el check "`customer_info` exige `customer_id`" (HU-BASE-05 R5).

## Cómo se verifica
- **Integración:** CA-1 a CA-3.

## Terminado cuando
Se cumple §10 de las reglas comunes.
